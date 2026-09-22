'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('shared/company');

/**
 * Obtiene el company_id del contexto actual.
 */
export const getServerCompanyId = async (): Promise<string> => {
  return getActiveCompanyId();
};

const companyRowSelect = {
  id: true,
  company_name: true,
  description: true,
  website: true,
  contact_email: true,
  contact_phone: true,
  address: true,
  city: true,
  country: true,
  industry: true,
  company_logo: true,
  is_active: true,
  company_cuit: true,
  province_id: true,
  owner_id: true,
  by_defect: true,
} as const;

type CompanyRowRaw = {
  city: bigint;
  province_id: bigint | null;
};

/**
 * `cities.id` y `provinces.id` son `bigint` en Postgres; los consumidores (selector de
 * empresa, formularios) los manejan como `number`, así que se convierten acá.
 */
function toCompanyRow<T extends CompanyRowRaw>({ city, province_id, ...rest }: T) {
  return { ...rest, city: Number(city), province_id: province_id == null ? null : Number(province_id) };
}

/** Empresa activa (array de 0/1 elementos, shape legacy de `select('*')`). */
export const fetchCurrentCompany = async () => {
  try {
    const company_id = await getServerCompanyId();
    const rows = await prisma.company.findMany({ where: { id: company_id }, select: companyRowSelect });
    return rows.map(toCompanyRow);
  } catch (error) {
    logger.error('Error fetching company', { data: { error } });
    return null;
  }
};

/** Empresas propias (`owner_id`) y compartidas (`share_company_users`) de un profile. */
export const fetchUserCompanies = async (userId: string) => {
  if (!userId) {
    return { sharedCompanies: [], allCompanies: [] };
  }

  try {
    const [shared, owned] = await Promise.all([
      prisma.share_company_users.findMany({
        where: { profile_id: userId },
        select: { company: { select: companyRowSelect } },
      }),
      prisma.company.findMany({ where: { owner_id: userId }, select: companyRowSelect }),
    ]);

    return {
      sharedCompanies: shared.flatMap((sc) => (sc.company ? [toCompanyRow(sc.company)] : [])),
      allCompanies: owned.map(toCompanyRow),
    };
  } catch (error) {
    logger.error('Error fetching user companies', { data: { error, userId } });
    return { sharedCompanies: [], allCompanies: [] };
  }
};
