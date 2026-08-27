'use server';

import { isNonPropagatingChecklistItem } from '@/features/Mantenimiento/constants/non-propagating-checklist-items';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { resourceIdFields, type MaintenanceResourceKind } from '@/features/Mantenimiento/shared/maintenance-resource';
import type { PreventiveType } from '@/features/Mantenimiento/shared/preventive-maintenance';
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
  /** Descripción libre del pedido (campo "Descripción (opcional)" del Nuevo Pedido) */
  description?: string;
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
        description: input.description?.trim() || null,
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
  deviations?: CreateDeviationFromNuevoPedido[];
  /** ID del template del checklist desde donde se eligieron los desvíos. Usado para detectar items no-propagables. */
  templateId?: string;
  source?: 'preventive';
  preventiveType?: PreventiveType;
  driverEmployeeId?: string;
  /** Vehiculo o equipamiento (ticket 596). Por defecto, vehiculo */
  resourceKind?: MaintenanceResourceKind;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
  /** Descripción libre del pedido (utilizada cuando el origen es preventivo) */
  description?: string;
}) {
  serverLogger.info('Creando pedido desde Nuevo Pedido', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations?.length ?? 0,
      source: input.source,
      preventiveType: input.preventiveType,
    },
  });

  if (input.manualItems && input.manualItems.length > 0) {
    serverLogger.debug('Se incluyeron ítems manuales', {
      data: { count: input.manualItems.length },
    });
  }

  const profile = await requireServerAuthProfile();

  const isPreventive = input.source === 'preventive' && input.preventiveType;

  if (isPreventive) {
    const { request, order } = await prisma.$transaction(async (tx) => {
      const request = await tx.maintenance_requests.create({
        data: {
          ...resourceIdFields(input.resourceKind, input.equipmentId),
          supervisor_id: input.supervisorId,
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date(),
          user_id: profile.id,
          kilometer: input.kilometer ?? null,
          source: 'preventive',
          preventive_type: input.preventiveType!,
          description: input.description?.trim() || null,
        },
      });

      const order = await tx.maintenance_orders.create({
        data: {
          ...resourceIdFields(input.resourceKind, input.equipmentId),
          maintenance_request_id: request.id,
          status: 'pending_scheduling',
          kilometer_at_entry: input.kilometer ?? null,
          source: 'preventive',
          preventive_type: input.preventiveType!,
          description: input.description?.trim() || null,
        },
      });

      await logActivity(tx, {
        maintenanceRequestId: request.id,
        maintenanceOrderId: order.id,
        actionType: ACTIVITY_LOG.CREATED,
        performedBy: profile.id,
        notes: `Pedido de mantenimiento preventivo creado: ${input.preventiveType}`,
        metadata: {
          source: 'preventive',
          preventive_type: input.preventiveType,
          supervisor_id: input.supervisorId,
        },
      });

      return { request, order };
    });

    // Actualizar kilometraje y horómetro del vehículo (fuera de transacción — es warning, no crítico)
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
          await prisma.vehicles.update({ where: { id: input.equipmentId }, data: updateData });
        }
      } catch (vehicleError) {
        serverLogger.warn('No se pudo actualizar datos del vehículo', { data: { error: vehicleError } });
      }
    }

    serverLogger.info('Pedido preventivo creado exitosamente', {
      data: { requestId: request.id, orderId: order.id, preventiveType: input.preventiveType },
    });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceOrderFromDeviations);
    return { request, order };
  }

  const deviations = input.deviations ?? [];

  const { request, order } = await prisma.$transaction(async (tx) => {
    // 1. Crear checklist_deviations con Promise.all para obtener los IDs
    const createdDeviations = await Promise.all(
      deviations.map((d) =>
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
        const comment = input.deviations?.[idx]?.comment ?? null;
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

    // 5. Crear maintenance_order_items vinculados a request_items.
    //    Filtramos los items "no propagables" (matriz checklist × item): los desvíos
    //    quedan creados como registro pero no generan trabajo de taller.
    const propagatingOrderItems = requestItems
      .map((ri, idx) => {
        const itemCode = deviations[idx]?.itemCode ?? null;
        const isNonPropagating = isNonPropagatingChecklistItem(input.templateId ?? null, itemCode);
        return isNonPropagating
          ? null
          : {
              maintenance_order_id: order.id,
              maintenance_request_item_id: ri.id,
              description: deviations[idx]?.comment ?? null,
              is_critical: deviations[idx]?.isCritical ?? false,
            };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    if (propagatingOrderItems.length < requestItems.length) {
      serverLogger.info('Filtrando items no propagables al crear pedido (Nuevo Pedido / supervisor)', {
        data: {
          total: requestItems.length,
          propagating: propagatingOrderItems.length,
          skipped: requestItems.length - propagatingOrderItems.length,
        },
      });
    }

    if (propagatingOrderItems.length > 0) {
      await tx.maintenance_order_items.createMany({ data: propagatingOrderItems });
    }

    // 6. Registrar actividad en maintenance_activity_log
    await logActivity(tx, {
      maintenanceRequestId: request.id,
      maintenanceOrderId: order.id,
      actionType: ACTIVITY_LOG.CREATED,
      performedBy: profile.id,
      notes: 'Pedido creado manualmente desde Nuevo Pedido',
      metadata: {
        source: 'manual',
        supervisor_id: input.supervisorId,
        deviations_count: deviations.length,
      },
    });

    // 7. Crear ítems manuales (texto libre, no del template)
    if (input.manualItems && input.manualItems.length > 0) {
      const manualDevs = await Promise.all(
        input.manualItems
          .filter((m) => m.label.trim().length > 0)
          .map((m) =>
            tx.checklist_deviations.create({
              data: {
                checklist_answer_id: null,
                equipment_id: input.equipmentId,
                item_code: 'manual',
                item_label: m.label.trim(),
                section_code: null,
                is_critical: false,
                created_by_user_id: profile.id,
              },
              select: { id: true },
            })
          )
      );

      if (manualDevs.length > 0) {
        const manualRequestItems = await Promise.all(
          manualDevs.map((d) =>
            tx.maintenance_request_items.create({
              data: {
                maintenance_request_id: request.id,
                checklist_deviation_id: d.id,
                repair_type_id: null,
                driver_comment: null,
                status: 'pending',
              },
              select: { id: true },
            })
          )
        );

        await tx.maintenance_order_items.createMany({
          data: manualRequestItems.map((ri) => ({
            maintenance_order_id: order.id,
            maintenance_request_item_id: ri.id,
            description: null,
            is_critical: false,
          })),
        });
      }
    }

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
      deviationsCount: deviations.length,
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
  deviations?: CreateDeviationFromNuevoPedido[];
  /** ID del template del checklist desde donde se eligieron los desvíos. Necesario para que el
   * filtro de items "no propagables" (matriz checklist × item) funcione al aprobar en validate. */
  templateId?: string;
  source?: 'preventive';
  preventiveType?: PreventiveType;
  driverEmployeeId?: string;
  /** Vehiculo o equipamiento (ticket 596). Por defecto, vehiculo */
  resourceKind?: MaintenanceResourceKind;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
  /** Descripción libre de la solicitud (utilizada cuando el origen es preventivo) */
  description?: string;
}) {
  serverLogger.info('Creando solicitud de mantenimiento pendiente de aprobación', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations?.length ?? 0,
      source: input.source,
      preventiveType: input.preventiveType,
    },
  });

  if (input.manualItems && input.manualItems.length > 0) {
    serverLogger.debug('Se incluyeron ítems manuales', {
      data: { count: input.manualItems.length },
    });
  }

  const profile = await requireServerAuthProfile();

  const isPreventive = input.source === 'preventive' && input.preventiveType;

  if (isPreventive) {
    const { request } = await prisma.$transaction(async (tx) => {
      const request = await tx.maintenance_requests.create({
        data: {
          ...resourceIdFields(input.resourceKind, input.equipmentId),
          supervisor_id: input.supervisorId,
          status: 'pending_approval',
          user_id: profile.id,
          kilometer: input.kilometer ?? null,
          source: 'preventive',
          preventive_type: input.preventiveType!,
          description: input.description?.trim() || null,
        },
      });

      await logActivity(tx, {
        maintenanceRequestId: request.id,
        actionType: ACTIVITY_LOG.CREATED,
        performedBy: profile.id,
        notes: `Solicitud de mantenimiento preventivo creada: ${input.preventiveType} - Pendiente de aprobación`,
        metadata: {
          source: 'preventive',
          preventive_type: input.preventiveType,
          supervisor_id: input.supervisorId,
          requires_approval: true,
        },
      });

      return { request };
    });

    // Actualizar kilometraje y horómetro del vehículo (fuera de transacción — es warning, no crítico)
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
          await prisma.vehicles.update({ where: { id: input.equipmentId }, data: updateData });
        }
      } catch (vehicleError) {
        serverLogger.warn('No se pudo actualizar datos del vehículo', { data: { error: vehicleError } });
      }
    }

    serverLogger.info('Solicitud preventiva creada - Pendiente de aprobación', {
      data: { requestId: request.id, preventiveType: input.preventiveType },
    });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequestPendingApproval);
    return { request, requestItems: [] };
  }

  const pendingDeviations = input.deviations ?? [];

  const { request, requestItems } = await prisma.$transaction(async (tx) => {
    // 1a. Crear checklist_answers "stub" para vincular los desvíos al template.
    //     Esto permite que el filtro de items "no propagables" pueda inferir el
    //     template_id al aprobar la solicitud en validate (paso 1 de Operaciones).
    //     `result='M'` porque hay desvíos (constraint de BD: solo 'B'|'M'). El
    //     campo `observations` deja constancia de que es un stub, no una respuesta
    //     real del checklist, para distinguirlo en reportes/auditorías.
    let stubAnswerId: string | null = null;
    if (input.templateId && pendingDeviations.length > 0) {
      const stub = await tx.checklist_answers.create({
        data: {
          template_id: input.templateId,
          equipment_id: input.equipmentId,
          user_id: profile.id,
          answer_data: {},
          result: 'M',
          observations: 'Stub generado desde Nuevo Pedido (sin respuesta real al checklist).',
        },
        select: { id: true },
      });
      stubAnswerId = stub.id;
    }

    // 1b. Crear checklist_deviations con Promise.all para obtener los IDs
    const createdDeviations = await Promise.all(
      pendingDeviations.map((d) =>
        tx.checklist_deviations.create({
          data: {
            equipment_id: input.equipmentId,
            item_code: d.itemCode,
            item_label: d.itemLabel,
            section_code: d.sectionCode,
            is_critical: d.isCritical,
            driver_comment: d.comment ?? null,
            created_by_user_id: profile.id,
            checklist_answer_id: stubAnswerId,
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
        const comment = input.deviations?.[idx]?.comment ?? null;
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
    await logActivity(tx, {
      maintenanceRequestId: request.id,
      actionType: ACTIVITY_LOG.CREATED,
      performedBy: profile.id,
      notes: 'Solicitud creada manualmente desde Nuevo Pedido - Pendiente de aprobación del supervisor',
      metadata: {
        source: 'manual',
        supervisor_id: input.supervisorId,
        deviations_count: pendingDeviations.length,
        requires_approval: true,
      },
    });

    // 5. Crear ítems manuales (texto libre, no del template)
    if (input.manualItems && input.manualItems.length > 0) {
      const manualDevs = await Promise.all(
        input.manualItems
          .filter((m) => m.label.trim().length > 0)
          .map((m) =>
            tx.checklist_deviations.create({
              data: {
                checklist_answer_id: null,
                equipment_id: input.equipmentId,
                item_code: 'manual',
                item_label: m.label.trim(),
                section_code: null,
                is_critical: false,
                created_by_user_id: profile.id,
              },
              select: { id: true },
            })
          )
      );

      if (manualDevs.length > 0) {
        await tx.maintenance_request_items.createMany({
          data: manualDevs.map((d) => ({
            maintenance_request_id: request.id,
            checklist_deviation_id: d.id,
            repair_type_id: null,
            driver_comment: null,
            status: 'pending',
          })),
        });
      }
    }

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
      deviationsCount: pendingDeviations.length,
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

/**
 * Crea una solicitud de mantenimiento por CARGA MANUAL (ticket 592).
 *
 * A diferencia del flujo de checklist, acá las reparaciones se cargan directamente:
 * cada item puede apuntar a un tipo de reparacion del sistema (`repairTypeId`) o
 * ser texto libre (`freeText`) cuando el solicitante no encuentra la tarea que
 * necesita — en ese caso el taller la asocia despues al tipo que corresponda.
 *
 * Los items NO tienen checklist_deviation_id: la columna es nullable desde este
 * ticket, justamente porque este camino no parte de ninguna inspeccion.
 *
 * Las imagenes llegan como URLs ya subidas al bucket 'repair-images' desde el
 * cliente; acá solo se persisten.
 */
export async function createManualMaintenanceRequest(input: {
  equipmentId: string;
  supervisorId: string;
  kilometer?: string;
  engine_hours?: string;
  driverEmployeeId?: string;
  /** Vehiculo o equipamiento (ticket 596). Por defecto, vehiculo */
  resourceKind?: MaintenanceResourceKind;
  /**
   * El usuario que carga ES el supervisor: la solicitud queda aprobada y genera
   * el pedido de una, igual que en los caminos de checklist y preventivo.
   */
  autoApprove?: boolean;
  repairs: Array<{
    repairTypeId: string | null;
    freeText: string | null;
    description: string;
    images: string[];
  }>;
}) {
  serverLogger.info('Creando solicitud de mantenimiento por carga manual', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      repairsCount: input.repairs.length,
    },
  });

  if (input.repairs.length === 0) {
    throw new Error('Debe incluirse al menos una reparación');
  }

  const profile = await requireServerAuthProfile();

  const autoApprove = input.autoApprove === true;

  try {
    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenance_requests.create({
        data: {
          ...resourceIdFields(input.resourceKind, input.equipmentId),
          supervisor_id: input.supervisorId,
          status: autoApprove ? 'approved' : 'pending_approval',
          ...(autoApprove ? { approved_by: profile.id, approved_at: new Date() } : {}),
          user_id: profile.id,
          kilometer: input.kilometer ?? null,
          engine_hours: input.engine_hours ?? null,
          driver_employee_id: input.driverEmployeeId ?? null,
          source: 'manual',
        },
      });

      await tx.maintenance_request_items.createMany({
        data: input.repairs.map((repair) => ({
          maintenance_request_id: created.id,
          checklist_deviation_id: null,
          repair_type_id: repair.repairTypeId,
          free_text: repair.freeText,
          description: repair.description || null,
          images: repair.images,
          status: autoApprove ? 'approved' : 'pending',
        })),
      });

      // Quien carga es el supervisor: el pedido se genera en el acto, sin pasar
      // por la validación de Operaciones.
      if (autoApprove) {
        const order = await tx.maintenance_orders.create({
          data: {
            ...resourceIdFields(input.resourceKind, input.equipmentId),
            maintenance_request_id: created.id,
            status: 'pending_scheduling',
            kilometer_at_entry: input.kilometer ?? null,
            engine_hours_at_entry: input.engine_hours ?? null,
            source: 'manual',
          },
        });

        // Los items del pedido se cuelgan de los de la solicitud, para conservar
        // la trazabilidad y arrastrar las fotos sin transformarlas.
        const requestItems = await tx.maintenance_request_items.findMany({
          where: { maintenance_request_id: created.id },
          select: { id: true, repair_type_id: true, description: true, free_text: true, images: true },
        });

        await tx.maintenance_order_items.createMany({
          data: requestItems.map((item) => ({
            maintenance_order_id: order.id,
            maintenance_request_item_id: item.id,
            repair_type_id: item.repair_type_id,
            // Sin tipo de reparación, el texto libre es lo único que describe la tarea
            description: item.description ?? item.free_text ?? null,
            images: item.images,
          })),
        });

        await logActivity(tx, {
          maintenanceRequestId: created.id,
          maintenanceOrderId: order.id,
          actionType: ACTIVITY_LOG.CREATED,
          performedBy: profile.id,
          notes: 'Pedido creado por carga manual',
          metadata: { source: 'manual', supervisor_id: input.supervisorId },
        });
      }

      return created;
    });

    serverLogger.info('Solicitud manual creada', {
      data: { requestId: request.id, itemsCount: input.repairs.length, autoApprove },
    });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequest);

    return request;
  } catch (error) {
    serverLogger.error('Error al crear solicitud manual', {
      data: { error, equipmentId: input.equipmentId },
    });
    throw error;
  }
}
