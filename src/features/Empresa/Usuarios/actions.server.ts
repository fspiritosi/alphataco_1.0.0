'use server';

import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { employeeIdsLinkedToUsers } from '@/shared/lib/employee-profile';
import { prisma } from '@/shared/lib/prisma';
import { assertCompanyAccess, getActiveCompanyId } from '@/shared/lib/tenant';
import { cacheLife, cacheTag } from 'next/cache';

/**
 * Lecturas de la tab Usuarios (`share_company_users` + owner de la empresa).
 * Las mutaciones (ban/unban, vincular legajo, nombre) viven en `mutations.server.ts`.
 *
 * Perímetro sin RLS: las funciones `'use cache'` no pueden leer la sesión, así que reciben
 * `companyId` ya validado; el export público llama `assertCompanyAccess(companyId)` antes.
 */
const logger = new Logger('Empresa/Usuarios');

// ── Campos válidos para ordenamiento ──────────────────────────────────────────
const VALID_SORT_FIELDS = new Set(['created_at', 'fullname', 'email', 'is_active']);

// ── Columnas de texto con filtro individual ────────────────────────────────────
const TEXT_COLUMNS = ['fullname', 'email'];

// ── DATE RANGE columns ────────────────────────────────────────────────────────
const DATE_COLUMNS = ['created_at'];

// ── Select Prisma para share_company_users ────────────────────────────────────
const SHARE_USER_SELECT = {
  id: true,
  created_at: true,
  profile_id: true,
  is_active: true,
  profile: {
    select: {
      id: true,
      email: true,
      fullname: true,
      avatar: true,
      employee_id: true,
      credential_id: true,
      employees: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          file: true,
          picture: true,
          is_active: true,
        },
      },
    },
  },
} as const;

// ── Tipo de user_roles enriquecido ────────────────────────────────────────────
type UserRoleWithRole = {
  id: string;
  role_id: bigint;
  roles: {
    id: bigint;
    name: string | null;
    color: string | null;
  } | null;
};

// ── Tipo de fila normalizado (owner + usuarios regulares) ─────────────────────
export type CompanyUserRow = {
  id: string;
  created_at: Date;
  profile_id: string | null;
  is_active: boolean;
  isOwner: boolean;
  profile: {
    id: string;
    email: string | null;
    fullname: string | null;
    avatar: string | null;
    employee_id: string | null;
    credential_id: string | null;
    employees: {
      id: string;
      firstname: string | null;
      lastname: string | null;
      file: string;
      picture: string | null;
      is_active: boolean | null;
    } | null;
    user_roles: UserRoleWithRole[];
  } | null;
};

export type CompanyUserListItem = CompanyUserRow;

// ── Helper: carga los user_roles de esta empresa para una lista de profile_ids ──
// Los roles son por empresa (`user_roles.company_id`): la columna "Rol" de esta tabla
// muestra lo que el usuario es ACÁ, no lo que sea en otra empresa a la que pertenezca.
async function loadUserRoles(profileIds: string[], companyId: string): Promise<Map<string, UserRoleWithRole[]>> {
  if (profileIds.length === 0) return new Map();

  const userRoles = await prisma.user_roles.findMany({
    where: {
      user_id: { in: profileIds },
      company_id: companyId,
    },
    select: {
      id: true,
      user_id: true,
      role_id: true,
      roles: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  const map = new Map<string, UserRoleWithRole[]>();
  for (const ur of userRoles) {
    const existing = map.get(ur.user_id) ?? [];
    existing.push({
      id: ur.id,
      role_id: ur.role_id,
      roles: ur.roles ?? null,
    });
    map.set(ur.user_id, existing);
  }
  return map;
}

// ── Helper: construye filtro WHERE para share_company_users ───────────────────
function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  profileIdsWithRole?: string[] | null
) {
  // Filtros de fecha sobre share_company_users
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_COLUMNS);

  // Búsqueda global: nombre y email del profile
  const searchCondition = state.search
    ? {
        OR: [
          { profile: { fullname: { contains: state.search, mode: 'insensitive' as const } } },
          { profile: { email: { contains: state.search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  // Filtro de texto por columna
  const fullnameFilter = state.filters.fullname?.length
    ? { profile: { fullname: { contains: state.filters.fullname[0], mode: 'insensitive' as const } } }
    : {};
  const emailFilter = state.filters.email?.length
    ? { profile: { email: { contains: state.filters.email[0], mode: 'insensitive' as const } } }
    : {};

  // Filtro de rol (resuelto previamente como lista de profile_ids)
  let roleWhere: Record<string, unknown> = {};
  if (profileIdsWithRole !== undefined && profileIdsWithRole !== null) {
    if (profileIdsWithRole.length > 0) {
      roleWhere = { profile_id: { in: profileIdsWithRole } };
    } else {
      roleWhere = { id: '00000000-0000-0000-0000-000000000000' };
    }
  }

  // Filtro de is_active (booleano como faceted)
  let isActiveWhere: Record<string, unknown> = {};
  if (state.filters.is_active?.length) {
    const vals = state.filters.is_active;
    if (vals.length === 1) {
      isActiveWhere = { is_active: vals[0] === 'true' };
    }
    // Si tiene ambos valores no se filtra (equivale a sin filtro)
  }

  // Filtro de linked_employee (FK facetado)
  let linkedEmployeeWhere: Record<string, unknown> = {};
  if (state.filters.linked_employee?.length) {
    const vals = state.filters.linked_employee;
    const includesNull = vals.includes(NULL_FILTER_VALUE);
    const realIds = vals.filter((v) => v !== NULL_FILTER_VALUE);

    if (includesNull && realIds.length === 0) {
      linkedEmployeeWhere = { profile: { employee_id: null } };
    } else if (!includesNull && realIds.length > 0) {
      linkedEmployeeWhere = { profile: { employee_id: { in: realIds } } };
    } else {
      // Mixto: null + ids reales
      linkedEmployeeWhere = {
        OR: [{ profile: { employee_id: null } }, { profile: { employee_id: { in: realIds } } }],
      };
    }
  }

  return {
    company_id: companyId,
    ...searchCondition,
    ...fullnameFilter,
    ...emailFilter,
    ...dateFiltersWhere,
    ...roleWhere,
    ...isActiveWhere,
    ...linkedEmployeeWhere,
  };
}

// ── Helper: obtiene profileIds que tienen los roles solicitados ───────────────
async function resolveRoleFilter(roleValues: string[], companyId: string): Promise<string[] | null> {
  if (!roleValues?.length) return null;

  const includeNull = roleValues.includes(NULL_FILTER_VALUE);
  const realRoleIds = roleValues
    .filter((v) => v !== NULL_FILTER_VALUE)
    .map(Number)
    .filter((n) => !isNaN(n));

  if (includeNull && realRoleIds.length === 0) {
    // Solo "Sin rol": obtener profile_ids de usuarios de esta empresa que no tienen user_roles
    const allUsersInCompany = await prisma.share_company_users.findMany({
      where: { company_id: companyId },
      select: { profile_id: true },
    });
    const profileIds = allUsersInCompany.map((u) => u.profile_id).filter(Boolean) as string[];

    const usersWithRoles = await prisma.user_roles.findMany({
      where: { user_id: { in: profileIds }, company_id: companyId },
      select: { user_id: true },
    });
    const profilesWithRoles = new Set(usersWithRoles.map((ur) => ur.user_id));
    return profileIds.filter((id) => !profilesWithRoles.has(id));
  }

  if (!includeNull && realRoleIds.length > 0) {
    // Solo roles específicos
    const usersWithRole = await prisma.user_roles.findMany({
      where: { role_id: { in: realRoleIds }, company_id: companyId },
      select: { user_id: true },
    });
    return usersWithRole.map((ur) => ur.user_id);
  }

  // Mixto: roles específicos + sin rol
  const allUsersInCompany = await prisma.share_company_users.findMany({
    where: { company_id: companyId },
    select: { profile_id: true },
  });
  const profileIds = allUsersInCompany.map((u) => u.profile_id).filter(Boolean) as string[];

  const usersWithAnyRole = await prisma.user_roles.findMany({
    where: { user_id: { in: profileIds }, company_id: companyId },
    select: { user_id: true },
  });
  const profilesWithRoles = new Set(usersWithAnyRole.map((ur) => ur.user_id));

  const usersWithSpecificRole = await prisma.user_roles.findMany({
    where: { role_id: { in: realRoleIds }, company_id: companyId },
    select: { user_id: true },
  });
  const profilesWithSpecificRole = new Set(usersWithSpecificRole.map((ur) => ur.user_id));

  return profileIds.filter((id) => !profilesWithRoles.has(id) || profilesWithSpecificRole.has(id));
}

// ── Helper: obtiene el owner de la compañía ───────────────────────────────────
async function getCompanyOwner(companyId: string): Promise<CompanyUserRow | null> {
  try {
    // Obtener el owner_id de la compañía
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { owner_id: true },
    });

    if (!company?.owner_id) return null;

    // Cargar el profile del owner directamente
    const ownerProfile = await prisma.profile.findUnique({
      where: { id: company.owner_id },
      select: {
        id: true,
        email: true,
        fullname: true,
        avatar: true,
        employee_id: true,
        credential_id: true,
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            file: true,
            picture: true,
            is_active: true,
          },
        },
      },
    });

    if (!ownerProfile) return null;

    // Cargar sus user_roles también
    const rolesMap = await loadUserRoles([company.owner_id], companyId);
    const ownerRoles = rolesMap.get(company.owner_id) ?? [];

    return {
      id: `owner-${company.owner_id}`,
      created_at: new Date(0),
      profile_id: company.owner_id,
      is_active: true,
      isOwner: true,
      profile: {
        id: ownerProfile.id,
        email: ownerProfile.email,
        fullname: ownerProfile.fullname,
        avatar: ownerProfile.avatar,
        employee_id: ownerProfile.employee_id,
        credential_id: ownerProfile.credential_id,
        employees: ownerProfile.employees
          ? {
              ...ownerProfile.employees,
            }
          : null,
        user_roles: ownerRoles,
      },
    };
  } catch (error) {
    logger.error('Error obteniendo owner de la compañía', { data: { error, companyId } });
    return null;
  }
}

// ── Helper: normaliza filas de share_company_users con user_roles ─────────────
async function normalizeRows(
  rows: Awaited<ReturnType<typeof prisma.share_company_users.findMany<{ select: typeof SHARE_USER_SELECT }>>>,
  companyId: string,
  isOwner = false
): Promise<CompanyUserRow[]> {
  const profileIds = rows.map((r) => r.profile_id).filter(Boolean) as string[];
  const rolesMap = await loadUserRoles(profileIds, companyId);

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    profile_id: row.profile_id,
    is_active: row.is_active,
    isOwner,
    profile: row.profile
      ? {
          ...row.profile,
          user_roles: rolesMap.get(row.profile.id) ?? [],
        }
      : null,
  }));
}

// ── Query paginada ────────────────────────────────────────────────────────────
async function getCompanyUsersPaginatedCached(companyId: string, searchParams: DataTableSearchParams) {
  'use cache';
  cacheTag(CACHE_TAGS.COMPANY_USERS);
  cacheLife({ expire: CACHE_TTL.PAGINATED_LIST, revalidate: CACHE_TTL.PAGINATED_LIST, stale: 30 });

  logger.debug('Obteniendo usuarios de empresa paginados');

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);

    // Resolver filtro de rol antes de construir el WHERE
    const profileIdsWithRole = state.filters.role?.length
      ? await resolveRoleFilter(state.filters.role, companyId)
      : null;

    const where = buildWhereClause(companyId, state, profileIdsWithRole);

    // Ordenamiento
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        if (s.id === 'fullname') {
          resolvedSorts.push({ profile: { fullname: dir } });
        } else if (s.id === 'email') {
          resolvedSorts.push({ profile: { email: dir } });
        } else {
          resolvedSorts.push({ [s.id]: dir });
        }
      }
    }
    const safeOrderBy = [...resolvedSorts, { is_active: 'desc' as const }, { profile: { fullname: 'asc' as const } }];

    const [rawRows, total, ownerRow] = await Promise.all([
      prisma.share_company_users.findMany({
        where,
        select: SHARE_USER_SELECT,
        skip,
        take,
        orderBy: safeOrderBy,
      }),
      prisma.share_company_users.count({ where }),
      getCompanyOwner(companyId),
    ]);

    const normalizedRows = await normalizeRows(rawRows, companyId);

    // Agregar owner si no está ya en la lista
    const regularProfileIds = new Set(normalizedRows.map((r) => r.profile_id));
    const ownerAlreadyInTable = ownerRow && regularProfileIds.has(ownerRow.profile_id);

    let allRows = normalizedRows;
    let adjustedTotal = total;

    if (ownerRow && !ownerAlreadyInTable) {
      if (skip === 0) {
        allRows = [ownerRow, ...normalizedRows];
      }
      adjustedTotal = total + 1;
    }

    return { data: allRows, total: adjustedTotal };
  } catch (error) {
    logger.error('Error obteniendo usuarios de empresa', { data: { error } });
    throw error;
  }
}

export async function getCompanyUsersPaginated(companyId: string, searchParams: DataTableSearchParams) {
  await assertCompanyAccess(companyId);
  return getCompanyUsersPaginatedCached(companyId, searchParams);
}

// ── Export (sin paginación) ───────────────────────────────────────────────────
async function getAllCompanyUsersForExportCached(companyId: string, searchParams: DataTableSearchParams) {
  'use cache';
  cacheTag(CACHE_TAGS.COMPANY_USERS);
  cacheLife({ expire: CACHE_TTL.EXPORT, revalidate: CACHE_TTL.EXPORT, stale: 30 });

  logger.debug('Exportando usuarios de empresa');

  try {
    const state = parseSearchParams(searchParams);

    const profileIdsWithRole = state.filters.role?.length
      ? await resolveRoleFilter(state.filters.role, companyId)
      : null;

    const where = buildWhereClause(companyId, state, profileIdsWithRole);

    const [rawRows, ownerRow] = await Promise.all([
      prisma.share_company_users.findMany({
        where,
        select: SHARE_USER_SELECT,
        orderBy: { profile: { fullname: 'asc' } },
      }),
      getCompanyOwner(companyId),
    ]);

    const normalizedRows = await normalizeRows(rawRows, companyId);

    const regularProfileIds = new Set(normalizedRows.map((r) => r.profile_id));
    const ownerAlreadyInTable = ownerRow && regularProfileIds.has(ownerRow.profile_id);

    if (ownerRow && !ownerAlreadyInTable) {
      return [ownerRow, ...normalizedRows];
    }

    return normalizedRows;
  } catch (error) {
    logger.error('Error exportando usuarios de empresa', { data: { error } });
    throw error;
  }
}

export async function getAllCompanyUsersForExport(companyId: string, searchParams: DataTableSearchParams) {
  await assertCompanyAccess(companyId);
  return getAllCompanyUsersForExportCached(companyId, searchParams);
}

// ── Obtener roles disponibles ─────────────────────────────────────────────────
export async function getAvailableRoles() {
  logger.debug('Obteniendo roles disponibles');

  try {
    const roles = await prisma.roles.findMany({
      where: {
        intern: false,
        name: { not: 'Invitado' },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: { name: 'asc' },
    });

    return roles;
  } catch (error) {
    logger.error('Error obteniendo roles disponibles', { data: { error } });
    return [];
  }
}

// ── Buscar empleados para vincular ────────────────────────────────────────────
export async function searchEmployeesForLink(query: string) {
  if (!query || query.length < 2) return [];
  const companyId = await getActiveCompanyId();

  try {
    // Legajos ya vinculados a un USUARIO. Los profiles de las sesiones anónimas del QR también
    // llevan `employee_id`, y contarlos sacaba del buscador a todo empleado que alguna vez
    // escaneó un QR.
    const linkedEmployeeIds = await employeeIdsLinkedToUsers();

    const employees = await prisma.employees.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        ...(linkedEmployeeIds.length > 0 ? { id: { notIn: linkedEmployeeIds } } : {}),
        OR: [
          { firstname: { contains: query, mode: 'insensitive' } },
          { lastname: { contains: query, mode: 'insensitive' } },
          { cuil: { contains: query, mode: 'insensitive' } },
          { file: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        cuil: true,
        file: true,
        picture: true,
      },
      orderBy: { lastname: 'asc' },
      take: 20,
    });

    return employees;
  } catch (error) {
    logger.error('Error buscando empleados para vincular', { data: { error } });
    return [];
  }
}

// ── Facet individual (lazy-load) ─────────────────────────────────────────────
export type CompanyUserFacetResult = {
  counts: Map<string, number>;
  resolvedOptions?: Array<{ value: string; label: string }>;
};

async function getCompanyUserSingleFacetCached(
  columnId: string,
  companyId: string,
  searchParams: DataTableSearchParams
): Promise<CompanyUserFacetResult | null> {
  'use cache';
  cacheTag(CACHE_TAGS.COMPANY_USERS);
  cacheLife({ expire: CACHE_TTL.FACETS, revalidate: CACHE_TTL.FACETS, stale: 30 });

  logger.debug('Obteniendo faceta individual', { data: { columnId } });

  try {
    const state = parseSearchParams(searchParams);

    // Cross-filter: excluir la columna propia del filtro
    const crossState = {
      ...state,
      filters: Object.fromEntries(Object.entries(state.filters).filter(([key]) => key !== columnId)),
    };

    // Resolver filtro de rol para cross-where (si no es la columna excluida)
    const profileIdsWithRole =
      columnId !== 'role' && crossState.filters.role?.length
        ? await resolveRoleFilter(crossState.filters.role, companyId)
        : null;

    const crossWhere = buildWhereClause(companyId, crossState, profileIdsWithRole);

    switch (columnId) {
      case 'is_active': {
        const grouped = await prisma.share_company_users.groupBy({
          by: ['is_active'],
          where: crossWhere,
          _count: true,
        });

        const counts = new Map<string, number>();
        for (const g of grouped) {
          counts.set(String(g.is_active), g._count);
        }

        return { counts };
      }

      case 'role': {
        // Obtener profileIds de usuarios que matchean cross-filter
        const users = await prisma.share_company_users.findMany({
          where: crossWhere,
          select: { profile_id: true },
        });
        const profileIds = users.map((u) => u.profile_id).filter(Boolean) as string[];

        // Contar user_roles
        const userRolesRows = await prisma.user_roles.findMany({
          where: { user_id: { in: profileIds }, company_id: companyId },
          select: { user_id: true, role_id: true },
        });

        const counts = new Map<string, number>();

        // Usuarios sin roles
        const usersWithRoles = new Set(userRolesRows.map((ur) => ur.user_id));
        const nullCount = profileIds.filter((id) => !usersWithRoles.has(id)).length;
        if (nullCount > 0) {
          counts.set(NULL_FILTER_VALUE, nullCount);
        }

        // Contar por role_id
        for (const ur of userRolesRows) {
          const key = String(ur.role_id);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        // Resolver labels de roles
        const roleIds = [...counts.keys()]
          .filter((k) => k !== NULL_FILTER_VALUE)
          .map(Number)
          .filter((n) => !isNaN(n));

        const roles =
          roleIds.length > 0
            ? await prisma.roles.findMany({
                where: { id: { in: roleIds } },
                select: { id: true, name: true },
              })
            : [];

        const resolvedOptions = roles.map((r) => ({
          value: String(r.id),
          label: r.name ?? 'Sin nombre',
        }));

        return { counts, resolvedOptions };
      }

      case 'linked_employee': {
        // Obtener usuarios con cross-filter y sus empleados vinculados
        const users = await prisma.share_company_users.findMany({
          where: crossWhere,
          select: {
            profile: {
              select: {
                employee_id: true,
                employees: {
                  select: { id: true, firstname: true, lastname: true, file: true },
                },
              },
            },
          },
        });

        const counts = new Map<string, number>();
        const employeeLabels = new Map<string, string>();

        for (const u of users) {
          const empId = u.profile?.employee_id;
          if (!empId) {
            counts.set(NULL_FILTER_VALUE, (counts.get(NULL_FILTER_VALUE) ?? 0) + 1);
          } else {
            counts.set(empId, (counts.get(empId) ?? 0) + 1);
            if (u.profile?.employees && !employeeLabels.has(empId)) {
              const emp = u.profile.employees;
              employeeLabels.set(empId, `[${emp.file}] ${emp.lastname} ${emp.firstname}`);
            }
          }
        }

        const resolvedOptions = [...employeeLabels.entries()].map(([value, label]) => ({
          value,
          label,
        }));

        return { counts, resolvedOptions };
      }

      default:
        logger.warn('Columna de faceta no soportada', { data: { columnId } });
        return null;
    }
  } catch (error) {
    logger.error('Error obteniendo faceta individual', { data: { error, columnId } });
    return null;
  }
}

export async function getCompanyUserSingleFacet(
  columnId: string,
  companyId: string,
  searchParams: DataTableSearchParams
): Promise<CompanyUserFacetResult | null> {
  await assertCompanyAccess(companyId);
  return getCompanyUserSingleFacetCached(columnId, companyId, searchParams);
}
