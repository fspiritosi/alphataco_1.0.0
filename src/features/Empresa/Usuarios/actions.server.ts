'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { COMPANY_USERS_INVALIDATION } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { cacheLife, cacheTag } from 'next/cache';

const logger = new Logger('Empresa/Usuarios');

// ── Campos válidos para ordenamiento ──────────────────────────────────────────
const VALID_SORT_FIELDS = new Set(['created_at', 'fullname', 'email']);

// ── Columnas de texto con filtro individual ────────────────────────────────────
const TEXT_COLUMNS = ['fullname', 'email'];

// ── DATE RANGE columns ────────────────────────────────────────────────────────
const DATE_COLUMNS = ['created_at'];

// ── Select Prisma para share_company_users ────────────────────────────────────
const SHARE_USER_SELECT = {
  id: true,
  created_at: true,
  profile_id: true,
  profile: {
    select: {
      id: true,
      email: true,
      fullname: true,
      avatar: true,
      employee_id: true,
      employees: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          file: true,
          picture: true,
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
  isOwner: boolean;
  profile: {
    id: string;
    email: string | null;
    fullname: string | null;
    avatar: string | null;
    employee_id: string | null;
    employees: {
      id: string;
      firstname: string | null;
      lastname: string | null;
      file: string;
      picture: string | null;
    } | null;
    user_roles: UserRoleWithRole[];
  } | null;
};

export type CompanyUserListItem = CompanyUserRow;

// ── Helper: carga user_roles para una lista de profile_ids ───────────────────
async function loadUserRoles(profileIds: string[]): Promise<Map<string, UserRoleWithRole[]>> {
  if (profileIds.length === 0) return new Map();

  const userRoles = await prisma.user_roles.findMany({
    where: {
      user_id: { in: profileIds },
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
      // Lista vacía → ningún resultado
      roleWhere = { id: '00000000-0000-0000-0000-000000000000' };
    }
  }

  return {
    company_id: companyId,
    ...searchCondition,
    ...fullnameFilter,
    ...emailFilter,
    ...dateFiltersWhere,
    ...roleWhere,
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
      where: { user_id: { in: profileIds } },
      select: { user_id: true },
    });
    const profilesWithRoles = new Set(usersWithRoles.map((ur) => ur.user_id));
    return profileIds.filter((id) => !profilesWithRoles.has(id));
  }

  if (!includeNull && realRoleIds.length > 0) {
    // Solo roles específicos
    const usersWithRole = await prisma.user_roles.findMany({
      where: { role_id: { in: realRoleIds } },
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
    where: { user_id: { in: profileIds } },
    select: { user_id: true },
  });
  const profilesWithRoles = new Set(usersWithAnyRole.map((ur) => ur.user_id));

  const usersWithSpecificRole = await prisma.user_roles.findMany({
    where: { role_id: { in: realRoleIds } },
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
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            file: true,
            picture: true,
          },
        },
      },
    });

    if (!ownerProfile) return null;

    // Cargar sus user_roles también
    const rolesMap = await loadUserRoles([company.owner_id]);
    const ownerRoles = rolesMap.get(company.owner_id) ?? [];

    return {
      id: `owner-${company.owner_id}`,
      created_at: new Date(0), // placeholder — el owner no tiene fecha de alta en share_company_users
      profile_id: company.owner_id,
      isOwner: true,
      profile: {
        id: ownerProfile.id,
        email: ownerProfile.email,
        fullname: ownerProfile.fullname,
        avatar: ownerProfile.avatar,
        employee_id: ownerProfile.employee_id,
        employees: ownerProfile.employees
          ? {
              id: ownerProfile.employees.id,
              firstname: ownerProfile.employees.firstname,
              lastname: ownerProfile.employees.lastname,
              file: ownerProfile.employees.file,
              picture: ownerProfile.employees.picture,
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
  isOwner = false
): Promise<CompanyUserRow[]> {
  const profileIds = rows.map((r) => r.profile_id).filter(Boolean) as string[];
  const rolesMap = await loadUserRoles(profileIds);

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    profile_id: row.profile_id,
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
export async function getCompanyUsersPaginated(companyId: string, searchParams: DataTableSearchParams) {
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
    const safeOrderBy = [...resolvedSorts, { profile: { fullname: 'asc' as const } }];

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

    const normalizedRows = await normalizeRows(rawRows);

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

// ── Export (sin paginación) ───────────────────────────────────────────────────
export async function getAllCompanyUsersForExport(companyId: string, searchParams: DataTableSearchParams) {
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

    const normalizedRows = await normalizeRows(rawRows);

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

// ── Facets ────────────────────────────────────────────────────────────────────
export type CompanyUserFacets = {
  roles: Map<string, number>;
};

export async function getCompanyUserFacets(
  companyId: string,
  searchParams?: DataTableSearchParams
): Promise<CompanyUserFacets> {
  'use cache';
  cacheTag(CACHE_TAGS.COMPANY_USERS);
  cacheLife({ expire: CACHE_TTL.FACETS, revalidate: CACHE_TTL.FACETS, stale: 30 });

  logger.debug('Obteniendo facetas de usuarios de empresa');

  try {
    const state = searchParams
      ? parseSearchParams(searchParams)
      : { filters: {} as Record<string, string[]>, search: '', sorting: [], page: 0, pageSize: 10 };

    // Obtener usuarios de la empresa con filtros activos excepto role
    const stateWithoutRole = {
      ...state,
      filters: Object.fromEntries(Object.entries(state.filters).filter(([key]) => key !== 'role')),
    };

    const profileIdsForRole = stateWithoutRole.filters.role?.length
      ? await resolveRoleFilter(stateWithoutRole.filters.role, companyId)
      : null;

    const crossWhere = buildWhereClause(companyId, stateWithoutRole, profileIdsForRole);

    const usersForRoles = await prisma.share_company_users.findMany({
      where: crossWhere,
      select: { profile_id: true },
    });

    const profileIds = usersForRoles.map((u) => u.profile_id).filter(Boolean) as string[];

    // Obtener user_roles de esos perfiles
    const userRolesRows = await prisma.user_roles.findMany({
      where: { user_id: { in: profileIds } },
      select: { user_id: true, role_id: true },
    });

    const roleCounts = new Map<string, number>();

    // Contar usuarios sin roles
    const usersWithRoles = new Set(userRolesRows.map((ur) => ur.user_id));
    const nullRoleCount = profileIds.filter((id) => !usersWithRoles.has(id)).length;
    if (nullRoleCount > 0) {
      roleCounts.set(NULL_FILTER_VALUE, nullRoleCount);
    }

    // Contar por role_id (un usuario con múltiples roles se cuenta en cada rol)
    for (const ur of userRolesRows) {
      const key = String(ur.role_id);
      roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
    }

    return { roles: roleCounts };
  } catch (error) {
    logger.error('Error obteniendo facetas de usuarios de empresa', { data: { error } });
    return { roles: new Map() };
  }
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

// ── Acción: eliminar usuario de empresa ───────────────────────────────────────
export async function deleteCompanyUser(shareCompanyUserId: string) {
  logger.debug('Eliminando usuario de empresa', { data: { shareCompanyUserId } });

  try {
    await prisma.share_company_users.delete({
      where: { id: shareCompanyUserId },
    });

    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Usuario eliminado exitosamente', { data: { shareCompanyUserId } });
  } catch (error) {
    logger.error('Error eliminando usuario de empresa', { data: { error, shareCompanyUserId } });
    throw error;
  }
}

// ── Buscar empleados para vincular ────────────────────────────────────────────
export async function searchEmployeesForLink(query: string) {
  const companyId = await getServerCompanyId();

  if (!companyId || !query || query.length < 2) return [];

  try {
    // Obtener employee_ids ya vinculados a algún profile
    const linkedProfiles = await prisma.profile.findMany({
      where: { employee_id: { not: null } },
      select: { employee_id: true },
    });
    const linkedEmployeeIds = linkedProfiles.map((p) => p.employee_id).filter(Boolean) as string[];

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

// ── Vincular/desvincular empleado a perfil ────────────────────────────────────
export async function linkEmployeeToProfile(profileId: string, employeeId: string | null) {
  logger.debug('Vinculando empleado a perfil', { data: { profileId, employeeId } });

  try {
    await prisma.profile.update({
      where: { id: profileId },
      data: { employee_id: employeeId },
    });

    await invalidateCacheTags(COMPANY_USERS_INVALIDATION);
    logger.info('Empleado vinculado exitosamente', { data: { profileId, employeeId } });
  } catch (error) {
    logger.error('Error vinculando empleado a perfil', { data: { error, profileId } });
    throw error;
  }
}
