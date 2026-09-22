'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { documentTypeCompanyScope } from '@/features/Documentacion/TiposDocumentos/lib/document-type-scope';

const logger = new Logger('Documentacion/document-actions');

/** Tipos de documento activos visibles para la empresa activa (globales + propios), por nombre. */
export const fetchAllDocumentTypes = async () => {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.document_types.findMany({
      where: { is_active: true, AND: [documentTypeCompanyScope(companyId)] },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener tipos de documento', { data: { error } });
    return [];
  }
};

/** `company` con la provincia resuelta bajo `province_id`, como lo lee la página de detalle. */
const companySelect = {
  id: true,
  company_name: true,
  company_cuit: true,
  company_logo: true,
  address: true,
  country: true,
  contact_phone: true,
  contact_email: true,
  description: true,
  provinces: { select: { name: true } },
} as const;

type CompanyRow = { provinces: { name: string } | null } & Record<string, unknown>;

function toLegacyCompany({ provinces, ...company }: CompanyRow) {
  return { ...company, province_id: provinces };
}

/**
 * Documento de empleado por id, con el tipo y el empleado (ciudad, provincia, clientes y empresa)
 * resueltos. Devuelve un array de 0/1 elementos con las claves legacy (`applies`, `company_id`,
 * `city`, `province`) que consume `app/dashboard/document/[id]`. Acotado a la empresa activa.
 */
export const getDocumentEmployeesById = async (id: string) => {
  const companyId = await getActiveCompanyId();
  const doc = await prisma.documents_employees.findFirst({
    where: { id, employees: { company_id: companyId } },
    include: {
      document_types: true,
      employees: {
        include: {
          cities: { select: { name: true } },
          provinces: { select: { name: true } },
          contractor_employee: { include: { customers: true } },
          company: { select: companySelect },
        },
      },
    },
  });
  if (!doc) return [];
  const { employees, ...rest } = doc;
  const applies = employees
    ? (() => {
        const { cities, provinces, company, ...employee } = employees;
        return { ...employee, city: cities, province: provinces, company_id: company ? toLegacyCompany(company) : null };
      })()
    : null;
  return [{ ...rest, applies }];
};

/** Documento de equipo por id (marca, modelo, tipo y empresa resueltos). Mismo contrato que el de empleados. */
export const getDocumentEquipmentById = async (id: string) => {
  const companyId = await getActiveCompanyId();
  const doc = await prisma.documents_equipment.findFirst({
    where: { id, vehicles: { company_id: companyId } },
    include: {
      document_types: true,
      vehicles: {
        include: {
          brand_vehicles: { select: { name: true } },
          model_vehicles: { select: { name: true } },
          types_of_vehicles: { select: { name: true } },
          company: { select: companySelect },
        },
      },
    },
  });
  if (!doc) return [];
  const { vehicles, ...rest } = doc;
  const applies = vehicles
    ? (() => {
        const { brand_vehicles, model_vehicles, types_of_vehicles, company, ...vehicle } = vehicles;
        return {
          ...vehicle,
          brand: brand_vehicles,
          model: model_vehicles,
          type_of_vehicle: types_of_vehicles,
          company_id: company ? toLegacyCompany(company) : null,
        };
      })()
    : null;
  return [{ ...rest, applies }];
};

/** Documento de empresa por id (sólo los de la empresa activa), con la empresa resuelta bajo `company`. */
export const getDocumentCompanyById = async (id: string) => {
  const companyId = await getActiveCompanyId();
  const doc = await prisma.documents_company.findFirst({
    where: { id, applies: companyId },
    include: { document_types: true, company: { select: companySelect } },
  });
  if (!doc) return [];
  const { company, ...rest } = doc;
  return [{ ...rest, company: toLegacyCompany(company) }];
};
