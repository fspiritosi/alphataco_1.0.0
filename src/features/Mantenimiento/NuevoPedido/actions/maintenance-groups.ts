'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Mantenimiento/NuevoPedido/maintenance-groups');

/**
 * Grupos de reparación activos con los tipos de reparación que agrupan.
 *
 * Los usa la carga manual del pedido: el supervisor no tiene por qué conocer
 * todas las tareas que implica un service, le alcanza con elegir el grupo y que
 * el sistema expanda sus tareas.
 *
 * Se traen los tipos con su nombre para poder mostrar una vista previa del grupo
 * sin depender de que el listado completo de reparaciones haya cargado.
 */
export async function fetchMaintenanceGroupsWithRepairs() {
  try {
    const groups = await prisma.maintenance_request_groups.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        description: true,
        maintenance_group_type_of_repairs: {
          select: {
            type_id: true,
            types_of_repairs: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return groups;
  } catch (error) {
    logger.error('Error al obtener los grupos de reparación', { data: { error } });
    throw error;
  }
}

export type MaintenanceGroupsWithRepairs = Awaited<ReturnType<typeof fetchMaintenanceGroupsWithRepairs>>;
export type MaintenanceGroupWithRepairs = MaintenanceGroupsWithRepairs[number];
