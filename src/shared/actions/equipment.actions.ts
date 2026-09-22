'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getSessionUserId } from '@/shared/lib/session';
import { assertCompanyAccess, getActiveCompanyId, NoActiveCompanyError } from '@/shared/lib/tenant';
import { getActualRole } from '@/shared/actions/shared-users.server';

const logger = new Logger('shared/equipment');

const vehicleRelations = {
  brand_vehicles: true,
  model_vehicles: true,
  type_vehicles_typeTotype: true,
  types_of_vehicles: true,
  sub_type: true,
  contractor_equipment: { include: { customers: true } },
} as const;

type VehicleWithRelations = Awaited<
  ReturnType<typeof prisma.vehicles.findFirstOrThrow<{ include: typeof vehicleRelations }>>
>;

/**
 * Renombra las relaciones de Prisma al shape legacy de PostgREST
 * (`brand(*)`, `model(*)`, `type(*)`, `types_of_vehicles(*)`, `contractor_equipment(*, contractor_id(*))`).
 */
function toLegacyEquipment({
  brand_vehicles,
  model_vehicles,
  type_vehicles_typeTotype,
  types_of_vehicles,
  sub_type,
  contractor_equipment,
  ...rest
}: VehicleWithRelations) {
  return {
    ...rest,
    brand: brand_vehicles,
    model: model_vehicles,
    type: type_vehicles_typeTotype,
    types_of_vehicles,
    subType: sub_type,
    contractor_equipment: contractor_equipment.map(({ customers, ...ce }) => ({ ...ce, contractor_id: customers })),
  };
}

/**
 * Equipos de la empresa. `company_equipment_id` lo usan los flujos anónimos de mantenimiento
 * (derivan la empresa del recurso, desde Server Components); si no viene, se usa la empresa
 * activa de la sesión. Con sesión, un `company_equipment_id` ajeno se rechaza
 * (`assertCompanyAccess`). Un usuario con rol `Invitado` sólo ve los equipos de su cliente.
 */
export const fetchAllEquipment = async (company_equipment_id?: string) => {
  let company_id: string;
  const userId = await getSessionUserId();
  try {
    if (company_equipment_id && userId) await assertCompanyAccess(company_equipment_id);
    company_id = company_equipment_id ?? (await getActiveCompanyId());
  } catch (error) {
    if (error instanceof NoActiveCompanyError) return [];
    throw error;
  }

  try {
    const role = userId ? await getActualRole(company_id, userId) : 'Owner';

    if (role === 'Invitado') {
      const membership = await prisma.share_company_users.findFirst({
        where: { company_id, profile: { credential_id: userId } },
        select: {
          customers: {
            select: { contractor_equipment: { select: { vehicles: { include: vehicleRelations } } } },
          },
        },
      });
      return (membership?.customers?.contractor_equipment ?? []).flatMap((ce) =>
        ce.vehicles ? [toLegacyEquipment(ce.vehicles)] : []
      );
    }

    const rows = await prisma.vehicles.findMany({
      where: withCompany({}, company_id),
      include: vehicleRelations,
    });
    return rows.map(toLegacyEquipment);
  } catch (error) {
    logger.error('Error fetching equipment', { data: { error, company_id } });
    return [];
  }
};

export const fetchSimpleDataEquipment = async () => {
  let company_id: string;
  try {
    company_id = await getActiveCompanyId();
  } catch (error) {
    if (error instanceof NoActiveCompanyError) return [];
    throw error;
  }

  try {
    return await prisma.vehicles.findMany({
      where: withCompany({}, company_id),
      select: { domain: true, serie: true, intern_number: true, id: true },
    });
  } catch (error) {
    logger.error('Error fetching simple equipment', { data: { error, company_id } });
    return [];
  }
};
