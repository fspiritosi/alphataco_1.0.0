'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('Mantenimiento/TiposReparaciones/grupos');

/** Datos del grupo de reparaciones que manda el formulario. */
export interface MaintenanceGroupInput {
  name: string;
  description?: string | null;
  is_active?: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error inesperado';
}

/**
 * Tipos de reparación de la empresa activa que pueden entrar en un grupo.
 *
 * Perímetro: `maintenance_request_groups` no tiene `company_id` (es un catálogo global),
 * pero los tipos que se le cuelgan sí, así que toda alta de relación se acota a la empresa.
 */
async function assertRepairTypesInActiveCompany(typeIds: string[], companyId: string): Promise<string[]> {
  if (typeIds.length === 0) return [];

  const types = await prisma.types_of_repairs.findMany({
    where: withCompany({ id: { in: typeIds } }, companyId),
    select: { id: true },
  });

  return types.map((type) => type.id);
}

/** Crea un grupo de reparaciones y sus relaciones con los tipos elegidos. */
export const createMaintenanceGroupAction = async (groupData: MaintenanceGroupInput, typeIds: string[]) => {
  try {
    const companyId = await getActiveCompanyId();
    const validTypeIds = await assertRepairTypesInActiveCompany(typeIds, companyId);

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenance_request_groups.create({
        data: {
          name: groupData.name,
          description: groupData.description ?? null,
          is_active: groupData.is_active ?? true,
        },
      });

      if (validTypeIds.length > 0) {
        await tx.maintenance_group_type_of_repairs.createMany({
          data: validTypeIds.map((type_id) => ({ group_id: created.id, type_id })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    return { group, error: null };
  } catch (error) {
    logger.error('Error al crear el grupo de reparaciones', { data: { error } });
    return { group: null, error: errorMessage(error) };
  }
};
export type createMaintenanceGroupActionType = Awaited<ReturnType<typeof createMaintenanceGroupAction>>;

/**
 * Actualiza un grupo y sus relaciones.
 *
 * Las altas y bajas de la pivote se calculan como diferencia explícita contra lo que hay
 * en la base (no se borra todo y se reinserta): es un formulario de UNA entidad, cargado
 * con su estado real, y sólo se tocan los ids que cambiaron.
 */
export const updateMaintenanceGroupAction = async (
  groupId: string,
  groupData: MaintenanceGroupInput,
  newTypeIds: string[]
) => {
  try {
    const companyId = await getActiveCompanyId();
    const validTypeIds = await assertRepairTypesInActiveCompany(newTypeIds, companyId);

    const updatedGroup = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenance_request_groups.update({
        where: { id: groupId },
        data: {
          name: groupData.name,
          description: groupData.description ?? null,
          is_active: groupData.is_active ?? true,
        },
      });

      const currentRelations = await tx.maintenance_group_type_of_repairs.findMany({
        where: { group_id: groupId },
        select: { type_id: true },
      });
      const currentTypeIds = currentRelations.map((relation) => relation.type_id);

      const toAdd = validTypeIds.filter((id) => !currentTypeIds.includes(id));
      const toRemove = currentTypeIds.filter((id) => !validTypeIds.includes(id));

      if (toAdd.length > 0) {
        await tx.maintenance_group_type_of_repairs.createMany({
          data: toAdd.map((type_id) => ({ group_id: groupId, type_id })),
          skipDuplicates: true,
        });
      }

      if (toRemove.length > 0) {
        await tx.maintenance_group_type_of_repairs.deleteMany({
          where: { group_id: groupId, type_id: { in: toRemove } },
        });
      }

      return updated;
    });

    return { updatedGroup, error: null };
  } catch (error) {
    logger.error('Error al actualizar el grupo de reparaciones', { data: { error, groupId } });
    return { updatedGroup: null, error: errorMessage(error) };
  }
};
export type updateMaintenanceGroupActionType = Awaited<ReturnType<typeof updateMaintenanceGroupAction>>;

/** Baja lógica del grupo (queda inactivo) y limpieza de sus relaciones. */
export const deleteMaintenanceGroupAction = async (groupId: string) => {
  try {
    const deletedGroup = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenance_request_groups.update({
        where: { id: groupId },
        data: { is_active: false },
      });

      await tx.maintenance_group_type_of_repairs.deleteMany({ where: { group_id: groupId } });

      return updated;
    });

    return { deletedGroup, error: null };
  } catch (error) {
    logger.error('Error al eliminar el grupo de reparaciones', { data: { error, groupId } });
    return { deletedGroup: null, error: errorMessage(error) };
  }
};
export type deleteMaintenanceGroupActionType = Awaited<ReturnType<typeof deleteMaintenanceGroupAction>>;

/**
 * Grupos activos con los ids de sus tipos de reparación.
 *
 * Sólo se listan los grupos que tienen al menos un tipo de la empresa activa, o que
 * todavía no tienen ninguno (recién creados): el catálogo de grupos es global, pero lo que
 * se ve de él depende de los tipos de la empresa.
 */
export const fetchMaintenanceGroupsAction = async () => {
  try {
    const companyId = await getActiveCompanyId();

    const data = await prisma.maintenance_request_groups.findMany({
      where: {
        is_active: true,
        OR: [
          { maintenance_group_type_of_repairs: { some: { types_of_repairs: { company_id: companyId } } } },
          { maintenance_group_type_of_repairs: { none: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        created_at: true,
        maintenance_group_type_of_repairs: {
          where: { types_of_repairs: { company_id: companyId } },
          select: { type_id: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return { groups: data, error: null };
  } catch (error) {
    logger.error('Error al obtener los grupos de reparaciones', { data: { error } });
    return { groups: [], error: errorMessage(error) };
  }
};
export type fetchMaintenanceGroupsActionType = Awaited<ReturnType<typeof fetchMaintenanceGroupsAction>>;

/** Tipos de reparación de la empresa activa, para armar los grupos. */
export const fetchTypesOfRepairAction = async () => {
  try {
    const companyId = await getActiveCompanyId();

    const data = await prisma.types_of_repairs.findMany({
      where: withCompany({}, companyId),
      select: { id: true, name: true },
      orderBy: { created_at: 'desc' },
    });

    return { types: data, error: null };
  } catch (error) {
    logger.error('Error al obtener los tipos de reparación', { data: { error } });
    return { types: [], error: errorMessage(error) };
  }
};
export type fetchTypesOfRepairActionType = Awaited<ReturnType<typeof fetchTypesOfRepairAction>>;

/** Grupo puntual con los ids de sus tipos de reparación de la empresa activa. */
export const fetchMaintenanceGroupByIdAction = async (groupId: string) => {
  try {
    const companyId = await getActiveCompanyId();

    const group = await prisma.maintenance_request_groups.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        created_at: true,
        maintenance_group_type_of_repairs: {
          where: { types_of_repairs: { company_id: companyId } },
          select: { type_id: true },
        },
      },
    });

    return { group, error: null };
  } catch (error) {
    logger.error('Error al obtener el grupo de reparaciones', { data: { error, groupId } });
    return { group: null, error: errorMessage(error) };
  }
};
export type fetchMaintenanceGroupByIdActionType = Awaited<ReturnType<typeof fetchMaintenanceGroupByIdAction>>;
