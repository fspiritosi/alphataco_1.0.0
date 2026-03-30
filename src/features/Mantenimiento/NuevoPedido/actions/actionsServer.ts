'use server';

import { Logger } from '@/lib/logger';
import { getServerAuthProfile, requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { CACHE_TAGS } from '@/shared/constants/cache';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { cacheLife, cacheTag } from 'next/cache';

const serverLogger = new Logger('Mantenimiento/NuevoPedido/actions');

/**
 * Tipo para crear un item de pedido de mantenimiento directo
 */
export type CreateMaintenanceOrderItemInput = {
  repair_type_id: string;
  description?: string;
  images?: string[];
};

/**
 * Tipo para crear un pedido de mantenimiento directo
 */
export type CreateMaintenanceOrderDirectInput = {
  equipment_id: string;
  kilometer?: string;
  engine_hours?: string;
  items: CreateMaintenanceOrderItemInput[];
};

/**
 * Crea un pedido de mantenimiento directamente sin pasar por solicitud.
 * El pedido se crea con status 'pending_scheduling' para que taller le asigne fecha.
 * Usa $transaction para garantizar atomicidad (elimina rollbacks manuales).
 */
export async function createMaintenanceOrderDirect(input: CreateMaintenanceOrderDirectInput) {
  serverLogger.info('Creando pedido de mantenimiento directo', {
    data: { equipment_id: input.equipment_id, itemsCount: input.items.length },
  });

  const { order, items } = await prisma.$transaction(async (tx) => {
    // 1. Crear el maintenance_order
    const order = await tx.maintenance_orders.create({
      data: {
        equipment_id: input.equipment_id,
        maintenance_request_id: null,
        status: 'pending_scheduling',
        kilometer_at_entry: input.kilometer ?? null,
        engine_hours_at_entry: input.engine_hours ?? null,
      },
    });

    // 2. Crear los maintenance_order_items
    await tx.maintenance_order_items.createMany({
      data: input.items.map((item) => ({
        maintenance_order_id: order.id,
        maintenance_request_item_id: null,
        repair_type_id: item.repair_type_id,
        description: item.description ?? null,
        images: item.images ?? [],
      })),
    });

    // Obtener los items creados para retornarlos
    const items = await tx.maintenance_order_items.findMany({
      where: { maintenance_order_id: order.id },
    });

    return { order, items };
  });

  // 3. Actualizar kilometraje y horómetro del vehículo (fuera de transacción — es warning, no crítico)
  if (input.kilometer || input.engine_hours) {
    try {
      const currentVehicle = await prisma.vehicles.findUnique({
        where: { id: input.equipment_id },
        select: { kilometer: true, engine_hours: true },
      });

      const updateData: Record<string, unknown> = {};

      // Kilometraje: solo si es >= al actual
      if (input.kilometer) {
        const currentKm = Number(currentVehicle?.kilometer) || 0;
        const newKm = Number(input.kilometer);
        if (newKm >= currentKm) {
          updateData.kilometer = input.kilometer;
        } else {
          serverLogger.warn('Kilometraje ignorado: menor al actual', {
            data: { newKm, currentKm, equipmentId: input.equipment_id },
          });
        }
      }

      // Horómetro: solo si es >= al actual
      if (input.engine_hours) {
        const currentHours = Number(currentVehicle?.engine_hours) || 0;
        const newHours = Number(input.engine_hours);
        if (newHours >= currentHours) {
          updateData.engine_hours = input.engine_hours;
        } else {
          serverLogger.warn('Horómetro ignorado: menor al actual', {
            data: { newHours, currentHours, equipmentId: input.equipment_id },
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.vehicles.update({
          where: { id: input.equipment_id },
          data: updateData,
        });
      }
    } catch (vehicleError) {
      serverLogger.warn('No se pudo actualizar datos del vehículo', {
        data: { error: vehicleError },
      });
    }
  }

  serverLogger.info('Pedido de mantenimiento creado exitosamente', {
    data: { orderId: order.id, itemsCreated: items.length },
  });

  await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceOrderDirect);

  return { order, items };
}

export type CreateMaintenanceOrderDirectResult = Awaited<ReturnType<typeof createMaintenanceOrderDirect>>;

/**
 * Verifica si ya existe un pedido de mantenimiento pendiente para un equipo
 * con el mismo tipo de reparación.
 * Cache de 30s — dato de validación puntual.
 */
export async function checkExistingMaintenanceOrder(equipmentId: string, repairTypeId: string): Promise<boolean> {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ expire: 30, revalidate: 30, stale: 10 });

  serverLogger.debug('Verificando pedidos existentes', { data: { equipmentId, repairTypeId } });

  try {
    const count = await prisma.maintenance_order_items.count({
      where: {
        repair_type_id: repairTypeId,
        maintenance_orders: {
          equipment_id: equipmentId,
          status: {
            in: ['pending_scheduling', 'scheduled', 'date_confirmed', 'in_workshop'],
          },
        },
      },
    });

    return count > 0;
  } catch (error) {
    serverLogger.error('Error verificando pedidos existentes', { data: { error } });
    return false;
  }
}

/**
 * Obtiene los templates de checklist disponibles para un equipo específico
 * basándose en su type y/o subType.
 * Cache de 10 minutos — datos casi estáticos.
 */
export async function getChecklistTemplatesForEquipment(equipmentId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.ALL);
  cacheLife({ expire: 600, revalidate: 600, stale: 60 });

  serverLogger.debug('Obteniendo templates de checklist para equipo', { data: { equipmentId } });

  // 1. Obtener type y subType del equipo
  const vehicle = await prisma.vehicles.findUnique({
    where: { id: equipmentId },
    select: { id: true, type: true, subType: true },
  });

  if (!vehicle) {
    serverLogger.error('Error al obtener equipo', { data: { equipmentId } });
    throw new Error('No se pudo obtener información del equipo');
  }

  // 2. Obtener templates activos con sus secciones, items y restricciones de tipo
  const templates = await prisma.checklist_templates.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      checklist_template_types: {
        select: { type_id: true },
      },
      checklist_template_sub_types: {
        select: { sub_type_id: true },
      },
      checklist_template_sections: {
        orderBy: { order_index: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          order_index: true,
          checklist_template_items: {
            orderBy: { order_index: 'asc' },
            select: {
              id: true,
              code: true,
              label: true,
              is_critical: true,
              order_index: true,
            },
          },
        },
      },
    },
  });

  // 3. Filtrar templates que aplican al type o subType del equipo
  const filteredTemplates = templates.filter((template) => {
    const types = template.checklist_template_types;
    const subTypes = template.checklist_template_sub_types;

    // Si el template no tiene restricciones de tipo, aplica a todos
    if (types.length === 0 && subTypes.length === 0) {
      return true;
    }

    // Verificar si coincide por type
    const matchesType = types.some((t) => t.type_id === vehicle.type);
    // Verificar si coincide por subType
    const matchesSubType = subTypes.some((st) => st.sub_type_id === vehicle.subType);

    return matchesType || matchesSubType;
  });

  serverLogger.debug('Templates filtrados', {
    data: {
      equipmentId,
      vehicleType: vehicle.type,
      vehicleSubType: vehicle.subType,
      totalTemplates: templates.length,
      filteredCount: filteredTemplates.length,
    },
  });

  return filteredTemplates;
}

export type ChecklistTemplatesForEquipment = Awaited<ReturnType<typeof getChecklistTemplatesForEquipment>>;
export type ChecklistTemplateForEquipment = ChecklistTemplatesForEquipment[number];

/**
 * Tipo para crear desvíos desde el formulario de Nuevo Pedido
 */
export type CreateDeviationFromNuevoPedido = {
  itemId: string;
  itemCode: string;
  itemLabel: string;
  sectionCode: string;
  isCritical: boolean;
  comment?: string;
};

/**
 * Crea un pedido de mantenimiento desde desvíos seleccionados en el formulario de Nuevo Pedido.
 *
 * Flujo (dentro de $transaction):
 * 1. Crea checklist_deviations (con Promise.all para obtener IDs)
 * 2. Crea maintenance_request con status 'approved' (source='manual')
 * 3. Crea maintenance_request_items vinculados a los desvíos
 * 4. Crea maintenance_order con status 'pending_scheduling'
 * 5. Crea maintenance_order_items vinculados a los request_items
 * 6. Registra la actividad en maintenance_activity_log
 *
 * Fuera de la transacción: actualizar km del vehículo (es warning, no crítico)
 */
export async function createMaintenanceOrderFromDeviations(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  engine_hours?: string;
  deviations: CreateDeviationFromNuevoPedido[];
  driverEmployeeId?: string;
}) {
  serverLogger.info('Creando pedido desde Nuevo Pedido', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations.length,
    },
  });

  const profile = await requireServerAuthProfile();

  const { request, order } = await prisma.$transaction(async (tx) => {
    // 1. Crear checklist_deviations con Promise.all para obtener los IDs
    const createdDeviations = await Promise.all(
      input.deviations.map((d) =>
        tx.checklist_deviations.create({
          data: {
            equipment_id: input.equipmentId,
            item_code: d.itemCode,
            item_label: d.itemLabel,
            section_code: d.sectionCode,
            is_critical: d.isCritical,
            driver_comment: d.comment ?? null,
            created_by_user_id: profile.id,
            // Sin checklist_answer_id porque es manual
          },
        })
      )
    );

    // 2. Crear maintenance_request con status aprobado y source='manual'
    const request = await tx.maintenance_requests.create({
      data: {
        equipment_id: input.equipmentId,
        supervisor_id: input.supervisorId,
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date(),
        user_id: profile.id,
        kilometer: input.kilometer ?? null,
        source: 'manual',
        driver_employee_id: input.driverEmployeeId ?? null,
      },
    });

    // 3. Crear maintenance_request_items vinculados a los desvíos
    // Si viene driverEmployeeId, el comentario es del chofer (desde mantenimiento).
    // Si no, es del supervisor (desde dashboard).
    const isFromDriver = !!input.driverEmployeeId;
    const requestItems = await Promise.all(
      createdDeviations.map((dev, idx) => {
        const comment = input.deviations[idx]?.comment ?? null;
        return tx.maintenance_request_items.create({
          data: {
            maintenance_request_id: request.id,
            checklist_deviation_id: dev.id,
            status: 'approved',
            description: comment,
            ...(isFromDriver
              ? {
                  driver_comment: comment,
                  driver_comment_by: comment ? profile.id : null,
                }
              : {
                  supervisor_comment: comment,
                  supervisor_comment_by: comment ? profile.id : null,
                }),
          },
        });
      })
    );

    // 4. Crear maintenance_order con source='manual'
    const order = await tx.maintenance_orders.create({
      data: {
        equipment_id: input.equipmentId,
        maintenance_request_id: request.id,
        status: 'pending_scheduling',
        kilometer_at_entry: input.kilometer ?? null,
        source: 'manual',
      },
    });

    // 5. Crear maintenance_order_items vinculados a request_items
    await tx.maintenance_order_items.createMany({
      data: requestItems.map((ri, idx) => ({
        maintenance_order_id: order.id,
        maintenance_request_item_id: ri.id,
        description: input.deviations[idx]?.comment ?? null,
        is_critical: input.deviations[idx]?.isCritical ?? false,
      })),
    });

    // 6. Registrar actividad en maintenance_activity_log
    await tx.maintenance_activity_log.create({
      data: {
        maintenance_request_id: request.id,
        maintenance_order_id: order.id,
        action_type: 'created',
        performed_by: profile.id,
        notes: 'Pedido creado manualmente desde Nuevo Pedido',
        metadata: {
          source: 'manual',
          supervisor_id: input.supervisorId,
          deviations_count: input.deviations.length,
        },
      },
    });

    return { request, order };
  });

  // 7. Actualizar kilometraje y horómetro del vehículo (fuera de transacción — es warning, no crítico)
  if (input.kilometer || input.engine_hours) {
    try {
      const currentVehicle = await prisma.vehicles.findUnique({
        where: { id: input.equipmentId },
        select: { kilometer: true, engine_hours: true },
      });

      const updateData: Record<string, unknown> = {};

      if (input.kilometer) {
        const currentKm = Number(currentVehicle?.kilometer) || 0;
        const newKm = Number(input.kilometer);
        if (newKm >= currentKm) {
          updateData.kilometer = input.kilometer;
        } else {
          serverLogger.warn('Kilometraje ignorado: menor al actual', {
            data: { newKm, currentKm, equipmentId: input.equipmentId },
          });
        }
      }

      if (input.engine_hours) {
        const currentHours = Number(currentVehicle?.engine_hours) || 0;
        const newHours = Number(input.engine_hours);
        if (newHours >= currentHours) {
          updateData.engine_hours = input.engine_hours;
        } else {
          serverLogger.warn('Horómetro ignorado: menor al actual', {
            data: { newHours, currentHours, equipmentId: input.equipmentId },
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.vehicles.update({
          where: { id: input.equipmentId },
          data: updateData,
        });
      }
    } catch (vehicleError) {
      serverLogger.warn('No se pudo actualizar datos del vehículo', {
        data: { error: vehicleError },
      });
    }
  }

  serverLogger.info('Pedido creado exitosamente desde Nuevo Pedido', {
    data: {
      requestId: request.id,
      orderId: order.id,
      deviationsCount: input.deviations.length,
    },
  });

  await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceOrderFromDeviations);

  return { request, order };
}

export type CreateMaintenanceOrderFromDeviationsResult = Awaited<
  ReturnType<typeof createMaintenanceOrderFromDeviations>
>;

/**
 * Crea una solicitud de mantenimiento con status pending_approval
 * (para cuando el creador NO es el supervisor).
 *
 * Flujo (dentro de $transaction):
 * 1. Crea checklist_deviations (con Promise.all para obtener IDs)
 * 2. Crea maintenance_request con status 'pending_approval'
 * 3. Crea maintenance_request_items vinculados a los desvíos
 * 4. Registra la actividad en maintenance_activity_log
 *
 * NO crea maintenance_order — eso se hace cuando el supervisor aprueba.
 */
export async function createMaintenanceRequestPendingApproval(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  engine_hours?: string;
  deviations: CreateDeviationFromNuevoPedido[];
  driverEmployeeId?: string;
}) {
  serverLogger.info('Creando solicitud de mantenimiento pendiente de aprobación', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations.length,
    },
  });

  const profile = await requireServerAuthProfile();

  const { request, requestItems } = await prisma.$transaction(async (tx) => {
    // 1. Crear checklist_deviations con Promise.all para obtener los IDs
    const createdDeviations = await Promise.all(
      input.deviations.map((d) =>
        tx.checklist_deviations.create({
          data: {
            equipment_id: input.equipmentId,
            item_code: d.itemCode,
            item_label: d.itemLabel,
            section_code: d.sectionCode,
            is_critical: d.isCritical,
            driver_comment: d.comment ?? null,
            created_by_user_id: profile.id,
            // Sin checklist_answer_id porque es manual
          },
        })
      )
    );

    // 2. Crear maintenance_request con status pending_approval (NO aprobado aún)
    const request = await tx.maintenance_requests.create({
      data: {
        equipment_id: input.equipmentId,
        supervisor_id: input.supervisorId,
        status: 'pending_approval',
        user_id: profile.id,
        kilometer: input.kilometer ?? null,
        source: 'manual',
        driver_employee_id: input.driverEmployeeId ?? null,
        // Sin approved_by ni approved_at ya que está pendiente
      },
    });

    // 3. Crear maintenance_request_items vinculados a los desvíos
    // Si viene driverEmployeeId, el comentario es del chofer (desde mantenimiento).
    // Si no, es del supervisor (desde dashboard).
    const isFromDriver = !!input.driverEmployeeId;
    const requestItems = await Promise.all(
      createdDeviations.map((dev, idx) => {
        const comment = input.deviations[idx]?.comment ?? null;
        return tx.maintenance_request_items.create({
          data: {
            maintenance_request_id: request.id,
            checklist_deviation_id: dev.id,
            status: 'pending',
            description: comment,
            ...(isFromDriver
              ? {
                  driver_comment: comment,
                  driver_comment_by: comment ? profile.id : null,
                }
              : {
                  supervisor_comment: comment,
                  supervisor_comment_by: comment ? profile.id : null,
                }),
          },
        });
      })
    );

    // 4. Registrar actividad en maintenance_activity_log
    await tx.maintenance_activity_log.create({
      data: {
        maintenance_request_id: request.id,
        action_type: 'created',
        performed_by: profile.id,
        notes: 'Solicitud creada manualmente desde Nuevo Pedido - Pendiente de aprobación del supervisor',
        metadata: {
          source: 'manual',
          supervisor_id: input.supervisorId,
          deviations_count: input.deviations.length,
          requires_approval: true,
        },
      },
    });

    return { request, requestItems };
  });

  // 5. Actualizar kilometraje y horómetro del vehículo (fuera de transacción — es warning, no crítico)
  if (input.kilometer || input.engine_hours) {
    try {
      const currentVehicle = await prisma.vehicles.findUnique({
        where: { id: input.equipmentId },
        select: { kilometer: true, engine_hours: true },
      });

      const updateData: Record<string, unknown> = {};

      if (input.kilometer) {
        const currentKm = Number(currentVehicle?.kilometer) || 0;
        const newKm = Number(input.kilometer);
        if (newKm >= currentKm) {
          updateData.kilometer = input.kilometer;
        } else {
          serverLogger.warn('Kilometraje ignorado: menor al actual', {
            data: { newKm, currentKm, equipmentId: input.equipmentId },
          });
        }
      }

      if (input.engine_hours) {
        const currentHours = Number(currentVehicle?.engine_hours) || 0;
        const newHours = Number(input.engine_hours);
        if (newHours >= currentHours) {
          updateData.engine_hours = input.engine_hours;
        } else {
          serverLogger.warn('Horómetro ignorado: menor al actual', {
            data: { newHours, currentHours, equipmentId: input.equipmentId },
          });
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.vehicles.update({
          where: { id: input.equipmentId },
          data: updateData,
        });
      }
    } catch (vehicleError) {
      serverLogger.warn('No se pudo actualizar datos del vehículo', {
        data: { error: vehicleError },
      });
    }
  }

  serverLogger.info('Solicitud creada exitosamente - Pendiente de aprobación', {
    data: {
      requestId: request.id,
      deviationsCount: input.deviations.length,
      supervisorId: input.supervisorId,
    },
  });

  await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequestPendingApproval);

  return { request, requestItems };
}

export type CreateMaintenanceRequestPendingApprovalResult = Awaited<
  ReturnType<typeof createMaintenanceRequestPendingApproval>
>;

/**
 * Obtiene el usuario actual del servidor para verificar si es supervisor.
 * Usa getServerAuthProfile() — NO usa cache (depende del usuario actual).
 */
export async function getCurrentUserForSupervisorCheck() {
  const profile = await getServerAuthProfile();

  if (!profile) {
    return null;
  }

  return {
    id: profile.credentialId, // credential_id de Supabase Auth (para comparar con supervisor_id)
    fullname: profile.fullname ?? 'Usuario',
    email: profile.email ?? '',
  };
}

export type CurrentUserForSupervisorCheck = Awaited<ReturnType<typeof getCurrentUserForSupervisorCheck>>;
