'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getSessionUser } from '@/shared/lib/session';
import type { EmployeeDocumentInput, EquipmentDocumentInput } from '@/shared/store/lib/document-buckets';

/**
 * Datos que consume el store `useLoggedUserStore` (antes los pedía con PostgREST y realtime
 * desde el navegador). El store sólo guarda estado; todo lo que toca la base vive acá.
 */
const logger = new Logger('shared/session-store');

/** Usuario de sesión y sus filas de `profile` (por `credential_id`). */
export async function getSessionBootstrap() {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await prisma.profile.findMany({ where: { credential_id: user.id } });
  return { credentialUser: user, profile };
}

const companyForStoreInclude = {
  profile: true,
  cities: { select: { id: true, name: true } },
  provinces: { select: { id: true, name: true } },
  share_company_users: { include: { profile: true } },
} as const;

/** `share_company_users` no tiene `role`: el rol del invitado es `profile.role` (shape legacy). */
function withRole<T extends { profile: { role: string | null } | null }>(row: T) {
  return { ...row, role: row.profile?.role ?? '' };
}

type CompanyForStoreRow = Awaited<
  ReturnType<typeof prisma.company.findFirstOrThrow<{ include: typeof companyForStoreInclude }>>
>;

/** Shape legacy de PostgREST: `owner_id(*)`, `city(id,name)`, `province_id(id,name)`, `share_company_users(*, profile(*))`. */
function toStoreCompany({ profile, cities, provinces, share_company_users, city, province_id, ...rest }: CompanyForStoreRow) {
  return {
    ...rest,
    owner_id: profile,
    city: { id: Number(cities.id), name: cities.name },
    province_id: provinces ? { id: Number(provinces.id), name: provinces.name } : null,
    share_company_users: share_company_users.map(withRole),
  };
}

export type StoreCompany = ReturnType<typeof toStoreCompany>;

/**
 * Empresas propias (`owner_id = profileId`) y compartidas (`share_company_users.profile_id`)
 * de un profile, para la selección de empresa activa del store.
 */
export async function getStoreCompanies(profileId: string) {
  try {
    const [owned, shared] = await Promise.all([
      prisma.company.findMany({ where: { owner_id: profileId }, include: companyForStoreInclude }),
      prisma.share_company_users.findMany({
        where: { profile_id: profileId },
        include: { profile: true, company: { include: companyForStoreInclude } },
      }),
    ]);
    return {
      allCompanies: owned.map(toStoreCompany),
      sharedCompanies: shared.flatMap(({ company, ...row }) =>
        company ? [{ ...withRole(row), company_id: toStoreCompany(company) }] : []
      ),
    };
  } catch (error) {
    logger.error('Error al obtener empresas para el store', { data: { error, profileId } });
    return { allCompanies: [], sharedCompanies: [] };
  }
}

export type StoreSharedCompany = Awaited<ReturnType<typeof getStoreCompanies>>['sharedCompanies'][number];

const documentTypeSelect = {
  id: true,
  name: true,
  multiresource: true,
  mandatory: true,
  is_it_montlhy: true,
  applies: true,
  private: true,
  down_document: true,
} as const;

/** Documentos de empleados, equipos y empresa de una compañía, en el shape de `document-buckets`. */
export async function getStoreDocuments(companyId: string) {
  try {
    const [employees, vehicles, company] = await Promise.all([
      prisma.documents_employees.findMany({
        where: { employees: { company_id: companyId } },
        select: {
          id: true,
          created_at: true,
          validity: true,
          state: true,
          period: true,
          document_path: true,
          employees: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              document_number: true,
              is_active: true,
              termination_date: true,
              contractor_employee: { select: { customers: { select: { name: true } } } },
            },
          },
          document_types: { select: documentTypeSelect },
        },
      }),
      prisma.documents_equipment.findMany({
        where: { vehicles: { company_id: companyId } },
        select: {
          id: true,
          created_at: true,
          validity: true,
          state: true,
          period: true,
          document_path: true,
          vehicles: {
            select: {
              id: true,
              domain: true,
              intern_number: true,
              serie: true,
              is_active: true,
              termination_date: true,
              types_of_vehicles: { select: { name: true } },
            },
          },
          document_types: { select: documentTypeSelect },
        },
      }),
      prisma.documents_company.findMany({
        where: { applies: companyId },
        include: { document_types: true, profile: true },
      }),
    ]);

    // `validity` es timestamptz; los buckets comparan 'DD/MM/YYYY' como hacía el legacy.
    const toValidity = (value: Date | null) =>
      value ? `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}` : null;

    const employeeDocs: EmployeeDocumentInput[] = employees.map((doc) => ({
      ...doc,
      validity: toValidity(doc.validity),
      document_types: doc.document_types && { ...doc.document_types, applies: String(doc.document_types.applies) },
    }));
    const equipmentDocs: EquipmentDocumentInput[] = vehicles.map((doc) => ({
      ...doc,
      validity: toValidity(doc.validity),
      document_types: doc.document_types && { ...doc.document_types, applies: String(doc.document_types.applies) },
    }));
    const companyDocs = company.map(({ document_types, profile, ...doc }) => ({
      ...doc,
      id_document_types: document_types,
      user_id: profile,
    }));

    return { employees: employeeDocs, vehicles: equipmentDocs, company: companyDocs };
  } catch (error) {
    logger.error('Error al obtener documentos para el store', { data: { error, companyId } });
    return { employees: [], vehicles: [], company: [] };
  }
}

export type StoreCompanyDocument = Awaited<ReturnType<typeof getStoreDocuments>>['company'][number];

/** Empleados de la compañía con las relaciones que usa `employeesToShow`. */
export async function getStoreEmployees(companyId: string) {
  try {
    return await prisma.employees.findMany({
      where: withCompany({}, companyId),
      include: {
        cities: { select: { name: true } },
        provinces: { select: { name: true } },
        work_diagram: { select: { name: true } },
        hierarchy: { select: { name: true } },
        countries: { select: { name: true } },
        guild: { select: { id: true, name: true } },
        covenant: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        documents_employees: { include: { document_types: { select: { down_document: true } } } },
        contractor_employee: { select: { customers: { select: { id: true, name: true } } } },
      },
      orderBy: [{ lastname: 'asc' }, { firstname: 'asc' }],
    });
  } catch (error) {
    logger.error('Error al obtener empleados para el store', { data: { error, companyId } });
    return [];
  }
}

export type StoreEmployee = Awaited<ReturnType<typeof getStoreEmployees>>[number];

/** Equipos de la compañía con tipo, marca y modelo resueltos. */
export async function getStoreVehicles(companyId: string) {
  try {
    const rows = await prisma.vehicles.findMany({
      where: withCompany({}, companyId),
      include: {
        types_of_vehicles: { select: { name: true } },
        brand_vehicles: { select: { name: true } },
        model_vehicles: { select: { name: true } },
      },
    });
    return rows.map(({ type_of_vehicle, ...rest }) => ({ ...rest, type_of_vehicle: Number(type_of_vehicle) }));
  } catch (error) {
    logger.error('Error al obtener equipos para el store', { data: { error, companyId } });
    return [];
  }
}

export type StoreVehicle = Awaited<ReturnType<typeof getStoreVehicles>>[number];

/** Usuarios compartidos de la compañía (shape legacy: `profile_id` y `customer_id` expandidos). */
export async function getStoreSharedUsers(companyId: string) {
  try {
    const rows = await prisma.share_company_users.findMany({
      where: withCompany({}, companyId),
      include: {
        profile: true,
        customers: { select: { id: true, name: true, cuit: true, address: true, is_active: true } },
      },
    });
    // `role` no existe en `share_company_users`: el rol del invitado vive en `profile.role`.
    return rows.flatMap(({ profile, customers, ...row }) =>
      profile
        ? [
            {
              ...row,
              role: profile.role ?? '',
              profile_id: profile,
              customer_id: customers && { ...customers, cuit: Number(customers.cuit) },
            },
          ]
        : []
    );
  } catch (error) {
    logger.error('Error al obtener usuarios compartidos para el store', { data: { error, companyId } });
    return [];
  }
}

export type StoreSharedUser = Awaited<ReturnType<typeof getStoreSharedUsers>>[number];

/** Documentos de un empleado por número de documento (drawer de `SimpleDocument`). */
export async function getEmployeeDocumentsByDocumentNumber(documentNumber: string) {
  try {
    return await prisma.documents_employees.findMany({
      where: { employees: { document_number: documentNumber } },
      include: { employees: true, document_types: true },
    });
  } catch (error) {
    logger.error('Error al obtener documentos del empleado', { data: { error, documentNumber } });
    return null;
  }
}

/** Documentos de un equipo por id (drawer de `SimpleDocument`). */
export async function getVehicleDocumentsByVehicleId(vehicleId: string) {
  try {
    return await prisma.documents_equipment.findMany({
      where: { applies: vehicleId },
      include: {
        document_types: true,
        vehicles: {
          include: {
            type_vehicles_typeTotype: true,
            types_of_vehicles: true,
            model_vehicles: true,
            brand_vehicles: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error al obtener documentos del equipo', { data: { error, vehicleId } });
    return null;
  }
}
