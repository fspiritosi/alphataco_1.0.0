'use server';

import { MIN_APPROVAL_DESCRIPTION_LENGTH } from '@/features/Mantenimiento/constants/approval';
import { isNonPropagatingChecklistItem } from '@/features/Mantenimiento/constants/non-propagating-checklist-items';
import { ACTIVITY_LOG } from '@/features/Mantenimiento/shared/activity-log/action-types';
import { logActivity } from '@/features/Mantenimiento/shared/activity-log/log-activity';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { CACHE_TAGS } from '@/shared/constants/cache';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { cacheLife, cacheTag } from 'next/cache';
import type { ApproveRequestItemsInput, MaintenanceRequestFilters, RejectRequestInput } from '../../types';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const serverLogger = new Logger('SolicitudesMantenimiento/actions');

// ─── Selector compartido para profile ───────────────────────────────────────
const PROFILE_SELECT = { id: true, fullname: true, email: true } as const;

// ─── Selector de solicitudes completo ───────────────────────────────────────
const MAINTENANCE_REQUEST_FULL_SELECT = {
  id: true,
  checklist_answer_id: true,
  equipment_id: true,
  employee_id: true,
  user_id: true,
  status: true,
  rejection_reason: true,
  rejected_by: true,
  rejected_at: true,
  approved_by: true,
  approved_at: true,
  kilometer: true,
  engine_hours: true,
  created_at: true,
  updated_at: true,
  supervisor_id: true,
  source: true,
  preventive_type: true,
  description: true,
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      kilometer: true,
      engine_hours: true,
      condition: true,
    },
  },
  employees: {
    select: { id: true, firstname: true, lastname: true, file: true },
  },
  driver_employee: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      file: true,
    },
  },
  checklist_answers: {
    select: { id: true, created_at: true, answer_data: true },
  },
  profile_maintenance_requests_user_idToprofile: {
    select: PROFILE_SELECT,
  },
  profile_maintenance_requests_supervisor_idToprofile: {
    select: PROFILE_SELECT,
  },
  maintenance_request_items: {
    select: {
      id: true,
      maintenance_request_id: true,
      checklist_deviation_id: true,
      repair_type_id: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      description: true,
      driver_comment: true,
      validator_comment: true,
      driver_comment_by: true,
      validator_comment_by: true,
      supervisor_comment: true,
      supervisor_comment_by: true,
      profile_maintenance_request_items_driver_comment_byToprofile: {
        select: PROFILE_SELECT,
      },
      profile_maintenance_request_items_validator_comment_byToprofile: {
        select: PROFILE_SELECT,
      },
      profile_maintenance_request_items_supervisor_comment_byToprofile: {
        select: PROFILE_SELECT,
      },
      // Grupo de reparaciones del que salio el item, para marcarlo en los listados
      maintenance_request_groups: {
        select: { id: true, name: true },
      },
      checklist_deviations: {
        select: {
          id: true,
          item_code: true,
          item_label: true,
          section_code: true,
          is_critical: true,
          driver_comment: true,
          checklist_answers: { select: { template_id: true } },
        },
      },
      types_of_repairs: {
        select: { id: true, name: true },
      },
    },
  },
  maintenance_orders: {
    select: {
      id: true,
      status: true,
      scheduled_date: true,
      date_approved_at: true,
      date_approved_by: true,
    },
  },
} as const;

/**
 * Mapea el resultado de Prisma agregando aliases de compatibilidad
 * para que los componentes existentes sigan funcionando sin cambios.
 */
function mapRequestWithAliases<
  T extends {
    profile_maintenance_requests_user_idToprofile: { id: string; fullname: string | null; email: string | null } | null;
    profile_maintenance_requests_supervisor_idToprofile: {
      id: string;
      fullname: string | null;
      email: string | null;
    } | null;
    maintenance_request_items: Array<{
      profile_maintenance_request_items_driver_comment_byToprofile: {
        id: string;
        fullname: string | null;
        email: string | null;
      } | null;
      profile_maintenance_request_items_validator_comment_byToprofile: {
        id: string;
        fullname: string | null;
        email: string | null;
      } | null;
      profile_maintenance_request_items_supervisor_comment_byToprofile: {
        id: string;
        fullname: string | null;
        email: string | null;
      } | null;
      [key: string]: unknown;
    }>;
  },
>(request: T) {
  return {
    ...request,
    // Alias de compatibilidad para componentes que usan `request.profile_user`
    profile_user: request.profile_maintenance_requests_user_idToprofile,
    // Alias de compatibilidad para componentes que usan `request.supervisor`
    supervisor: request.profile_maintenance_requests_supervisor_idToprofile,
    // Mapear aliases de profile en cada item para que ItemComments los encuentre
    maintenance_request_items: request.maintenance_request_items.map((item) => ({
      ...item,
      driver_comment_profile: item.profile_maintenance_request_items_driver_comment_byToprofile,
      validator_comment_profile: item.profile_maintenance_request_items_validator_comment_byToprofile,
      supervisor_comment_profile: item.profile_maintenance_request_items_supervisor_comment_byToprofile,
    })),
  };
}

/**
 * Obtiene las solicitudes de mantenimiento con filtros opcionales.
 * Incluye información de maintenance_orders para saber el estado del pedido.
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODAS las solicitudes
 * - Usuarios sin rol de sistema: solo ven solicitudes donde supervisor_id = su profile.id
 */
export async function getMaintenanceRequests(filters?: MaintenanceRequestFilters) {
  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  // Construir el filtro de fechas
  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (filters?.from_date) createdAtFilter.gte = new Date(filters.from_date);
  if (filters?.to_date) createdAtFilter.lte = new Date(filters.to_date);

  const where = {
    // Las rechazadas se excluyen: quedan como registro historico en el legajo
    // del equipo, tab "Historial de Mantenimiento".
    status: filters?.status ?? 'pending_approval',
    ...(filterInfo?.shouldFilterBySupervisor ? { supervisor_id: filterInfo.userId } : {}),
    ...(filters?.equipment_id ? { equipment_id: filters.equipment_id } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { created_at: createdAtFilter } : {}),
  };

  try {
    const requests = await prisma.maintenance_requests.findMany({
      where,
      select: MAINTENANCE_REQUEST_FULL_SELECT,
      orderBy: { created_at: 'desc' },
    });

    return requests.map(mapRequestWithAliases);
  } catch (error) {
    serverLogger.error('Error al obtener solicitudes de mantenimiento', { data: { error } });
    throw error;
  }
}

export type MaintenanceRequestsData = Awaited<ReturnType<typeof getMaintenanceRequests>>;
export type MaintenanceRequestData = MaintenanceRequestsData[number];

/**
 * Obtiene una solicitud de mantenimiento por ID.
 */
export async function getMaintenanceRequestById(requestId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_REQUESTS);
  cacheLife({ expire: 15, revalidate: 15, stale: 5 });

  try {
    const request = await prisma.maintenance_requests.findUnique({
      where: { id: requestId },
      select: MAINTENANCE_REQUEST_FULL_SELECT,
    });

    if (!request) {
      serverLogger.warn('Solicitud no encontrada', { data: { requestId } });
      return null;
    }

    return mapRequestWithAliases(request);
  } catch (error) {
    serverLogger.error('Error al obtener solicitud de mantenimiento', { data: { error, requestId } });
    throw error;
  }
}

/**
 * Crea una solicitud de mantenimiento desde desvíos de checklist.
 *
 * NUEVO FLUJO (v2):
 * - El chofer NO asigna tipos de reparación, solo comentarios por desvío
 * - El chofer selecciona un supervisor de turno
 * - Los tipos de reparación se asignan después, antes de entrar al taller
 *
 * @param input.supervisorId - ID del supervisor de turno (asignado por el chofer)
 * @param input.deviationItems - Array de objetos con deviationId y driver_comment (sin repairTypeId)
 */
export async function createMaintenanceRequest(input: {
  checklistAnswerId: string;
  equipmentId: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  /** Supervisor de turno asignado por el chofer */
  supervisorId?: string;
  /** @deprecated Use deviationItems instead */
  deviationIds?: string[];
  /** Items de desvío con comentario del chofer (sin tipo de reparación) */
  deviationItems?: Array<{
    deviationId: string;
    /** @deprecated El tipo de reparación ya no se asigna en este paso */
    repairTypeId?: string;
    /** Comentario del chofer describiendo el desvío */
    driverComment?: string;
  }>;
}) {
  serverLogger.info('Creando solicitud de mantenimiento', { data: input });

  const profile = await requireServerAuthProfile();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Crear la solicitud
      const request = await tx.maintenance_requests.create({
        data: {
          checklist_answer_id: input.checklistAnswerId,
          equipment_id: input.equipmentId,
          employee_id: input.employeeId ?? null,
          user_id: input.userId ?? null,
          kilometer: input.kilometer ?? null,
          supervisor_id: input.supervisorId ?? null,
          status: 'pending_approval',
        },
      });

      serverLogger.debug('maintenance_request creada', { data: { requestId: request.id } });

      // Determinar los items a insertar
      type ItemData = {
        maintenance_request_id: string;
        checklist_deviation_id: string;
        repair_type_id: string | null;
        driver_comment: string | null;
        driver_comment_by: string | null;
        status: string;
      };

      let items: ItemData[];

      if (input.deviationItems && input.deviationItems.length > 0) {
        serverLogger.debug('Usando formato NUEVO (deviationItems)');
        items = input.deviationItems.map((item) => ({
          maintenance_request_id: request.id,
          checklist_deviation_id: item.deviationId,
          repair_type_id: item.repairTypeId ?? null,
          driver_comment: item.driverComment ?? null,
          driver_comment_by: item.driverComment ? profile.id : null,
          status: 'pending',
        }));
      } else if (input.deviationIds && input.deviationIds.length > 0) {
        serverLogger.debug('Usando formato ANTIGUO (deviationIds)');
        items = input.deviationIds.map((deviationId) => ({
          maintenance_request_id: request.id,
          checklist_deviation_id: deviationId,
          repair_type_id: null,
          driver_comment: null,
          driver_comment_by: null,
          status: 'pending',
        }));
      } else {
        throw new Error('Debe proporcionar al menos un desvío');
      }

      serverLogger.debug('Items a insertar', { data: { count: items.length } });

      await tx.maintenance_request_items.createMany({ data: items });

      return request;
    });

    serverLogger.info('Solicitud de mantenimiento creada exitosamente', { data: { requestId: result.id } });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequest);

    return result;
  } catch (error) {
    serverLogger.error('Error al crear solicitud de mantenimiento', { data: { error } });
    throw error;
  }
}

/**
 * Aprueba items de una solicitud y crea el pedido de mantenimiento.
 *
 * NOTA: Los tipos de reparación NO se asignan en este paso.
 * Se asignan posteriormente en la etapa de Planificación (AsignarTallerDialog).
 */
export async function approveMaintenanceRequestItems(input: ApproveRequestItemsInput) {
  serverLogger.info('Aprobando items de solicitud', {
    data: {
      requestId: input.requestId,
      approvedCount: input.approvedItems.length,
      rejectedCount: input.rejectedItems.length,
    },
  });

  const profile = await requireServerAuthProfile();

  // Descripción que verá el taller. Es obligatoria siempre que la aprobación
  // genere un pedido; la validación de longitud se repite acá porque el modal
  // no es la única barrera posible contra esta action.
  const description = input.description?.trim() || null;

  function assertDescription() {
    if (!description || description.length < MIN_APPROVAL_DESCRIPTION_LENGTH) {
      throw new Error(
        `La descripción es obligatoria y debe tener al menos ${MIN_APPROVAL_DESCRIPTION_LENGTH} caracteres`
      );
    }
  }

  // --- PREVENTIVE APPROVAL BRANCH ---
  if (input.preventiveApproval) {
    // Una aprobación preventiva siempre genera pedido.
    assertDescription();

    const request = await prisma.maintenance_requests.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { equipment_id: true, kilometer: true, engine_hours: true, source: true, preventive_type: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.maintenance_requests.update({
        where: { id: input.requestId },
        data: {
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date(),
        },
      });

      await tx.maintenance_orders.create({
        data: {
          maintenance_request_id: input.requestId,
          equipment_id: request.equipment_id,
          status: 'pending_scheduling',
          kilometer_at_entry: request.kilometer ?? null,
          source: request.source,
          preventive_type: request.preventive_type,
          description,
        },
      });

      await logActivity(tx, {
        maintenanceRequestId: input.requestId,
        actionType: ACTIVITY_LOG.REQUEST_APPROVED,
        performedBy: profile.id,
        notes: input.validatorComment || 'Solicitud preventiva aprobada',
        metadata: { source: 'preventive', preventive_type: request.preventive_type },
      });
    });

    await invalidateCacheTags(INVALIDATION_MAP.approveMaintenanceRequestItems);
    return;
  }
  // --- END PREVENTIVE BRANCH ---

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar items aprobados (sin tipos de reparación)
      await Promise.all(
        input.approvedItems.map((item) =>
          tx.maintenance_request_items.update({
            where: { id: item.itemId },
            data: {
              status: 'approved',
              validator_comment: item.validatorComment ?? null,
              validator_comment_by: item.validatorComment ? profile.id : null,
            },
          })
        )
      );

      // 2. Actualizar items rechazados
      await Promise.all(
        input.rejectedItems.map((item) =>
          tx.maintenance_request_items.update({
            where: { id: item.itemId },
            data: {
              status: 'rejected',
              rejection_reason: item.reason,
              validator_comment: item.validatorComment ?? null,
              validator_comment_by: item.validatorComment ? profile.id : null,
            },
          })
        )
      );

      // 3. Obtener la solicitud para crear el pedido
      const request = await tx.maintenance_requests.findUniqueOrThrow({
        where: { id: input.requestId },
        select: { id: true, equipment_id: true, kilometer: true },
      });

      // 4. Filtrar items "no propagables" según matriz checklist × item.
      //    Estos items SI quedan aprobados como maintenance_request_items (paso 1),
      //    pero NO generan maintenance_order_items, por lo que no llegan al taller.
      const approvedItemContexts = await tx.maintenance_request_items.findMany({
        where: { id: { in: input.approvedItems.map((i) => i.itemId) } },
        select: {
          id: true,
          checklist_deviations: {
            select: {
              item_code: true,
              checklist_answers: { select: { template_id: true } },
            },
          },
        },
      });

      const propagatingItemIds = new Set(
        approvedItemContexts
          .filter(
            (ctx) =>
              !isNonPropagatingChecklistItem(
                ctx.checklist_deviations?.checklist_answers?.template_id ?? null,
                ctx.checklist_deviations?.item_code ?? null
              )
          )
          .map((ctx) => ctx.id)
      );

      const propagatingApprovedItems = input.approvedItems.filter((i) => propagatingItemIds.has(i.itemId));

      if (propagatingApprovedItems.length < input.approvedItems.length) {
        serverLogger.info('Filtrando items no propagables al crear pedido', {
          data: {
            approved: input.approvedItems.length,
            propagating: propagatingApprovedItems.length,
            skipped: input.approvedItems.length - propagatingApprovedItems.length,
          },
        });
      }

      // 5. Actualizar estado de la solicitud.
      //    Solo se aprueba si algo llega al taller. Si no quedó ningún item propagable
      //    y hubo rechazos, la solicitud se cierra como rechazada — antes quedaba
      //    'approved' sin pedido asociado, desaparecía de la bandeja y no figuraba
      //    como rechazada en ningún lado.
      const willCreateOrder = propagatingApprovedItems.length > 0;
      const isFullyRejected = !willCreateOrder && input.rejectedItems.length > 0;

      if (willCreateOrder) {
        assertDescription();
      }

      if (isFullyRejected) {
        const reasons = [...new Set(input.rejectedItems.map((item) => item.reason.trim()).filter(Boolean))];

        await tx.maintenance_requests.update({
          where: { id: input.requestId },
          data: {
            status: 'rejected',
            rejection_reason: reasons.join('; '),
            rejected_by: profile.id,
            rejected_at: new Date(),
          },
        });
      } else {
        await tx.maintenance_requests.update({
          where: { id: input.requestId },
          data: {
            status: 'approved',
            approved_by: profile.id,
            approved_at: new Date(),
          },
        });
      }

      // 6. Crear pedido de mantenimiento si hay items propagables
      if (willCreateOrder) {
        const order = await tx.maintenance_orders.create({
          data: {
            maintenance_request_id: input.requestId,
            equipment_id: request.equipment_id,
            status: 'pending_scheduling',
            kilometer_at_entry: request.kilometer ?? null,
            description,
          },
        });

        serverLogger.info('Pedido de mantenimiento creado', { data: { orderId: order.id } });

        // 7. Actualizar el kilometraje del vehículo si la solicitud tiene km.
        //    Solo aplica a vehículos: los equipamientos no llevan kilometraje.
        if (request.kilometer && request.equipment_id) {
          try {
            await tx.vehicles.update({
              where: { id: request.equipment_id },
              data: { kilometer: request.kilometer },
            });
          } catch (vehicleError) {
            serverLogger.warn('No se pudo actualizar kilometraje del vehículo al generar pedido', {
              data: { error: vehicleError },
            });
          }
        }

        // 8. Crear items del pedido SIN tipos de reparación
        await tx.maintenance_order_items.createMany({
          data: propagatingApprovedItems.map((item) => ({
            maintenance_order_id: order.id,
            maintenance_request_item_id: item.itemId,
            repair_type_id: null,
            is_critical: false,
          })),
        });
      }
    });

    await invalidateCacheTags(INVALIDATION_MAP.approveMaintenanceRequestItems);

    return { success: true };
  } catch (error) {
    serverLogger.error('Error al aprobar items de solicitud', { data: { error, requestId: input.requestId } });
    throw error;
  }
}

/**
 * Asigna tipos de reparación a los items de una solicitud de mantenimiento.
 * Usado por el chofer después de completar el checklist para asignar cada desvío a una reparación.
 */
export async function assignRepairTypesToDeviations(input: {
  equipmentId: string;
  assignments: Array<{
    deviationId: string;
    repairTypeId: string;
    description?: string;
  }>;
}): Promise<{ ok: true; success: true } | { ok: false; error: string }> {
  serverLogger.info('Asignando tipos de reparación a desvíos', {
    data: { equipmentId: input.equipmentId, assignmentsCount: input.assignments.length },
  });

  if (!input.equipmentId || !input.assignments || input.assignments.length === 0) {
    serverLogger.warn('Datos inválidos para asignar tipos de reparación');
    return { ok: false, error: 'Datos inválidos para asignar tipos de reparación' };
  }

  try {
    const deviationIds = input.assignments.map((a) => a.deviationId);

    // Buscar los maintenance_request_items que corresponden a estos desvíos
    const items = await prisma.maintenance_request_items.findMany({
      where: { checklist_deviation_id: { in: deviationIds } },
      select: { id: true, checklist_deviation_id: true, maintenance_request_id: true },
    });

    if (items.length === 0) {
      serverLogger.warn('No se encontraron items para los desvíos proporcionados', {
        data: { deviationIds },
      });
      return { ok: false, error: 'No se encontraron items de solicitud para los desvíos' };
    }

    // Actualizar cada item con su tipo de reparación
    await Promise.all(
      input.assignments.map(async (assignment) => {
        const item = items.find((i) => i.checklist_deviation_id === assignment.deviationId);
        if (!item) {
          serverLogger.warn('Item no encontrado para desvío', { data: { deviationId: assignment.deviationId } });
          return;
        }

        await prisma.maintenance_request_items.update({
          where: { id: item.id },
          data: {
            repair_type_id: assignment.repairTypeId,
            description: assignment.description ?? null,
          },
        });
      })
    );

    serverLogger.info('Tipos de reparación asignados exitosamente', {
      data: { equipmentId: input.equipmentId, itemsUpdated: items.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.approveMaintenanceRequestItems);

    return { ok: true, success: true };
  } catch (error) {
    serverLogger.error('Error al asignar tipos de reparación', { data: { error } });
    return { ok: false, error: 'Error inesperado al asignar tipos de reparación' };
  }
}

/** Estados en los que una solicitud todavía admite que se le agreguen desvíos */
const OPEN_REQUEST_STATUSES = ['pending_approval', 'rejected'] as const;

/**
 * Crea o actualiza solicitudes de mantenimiento desde desvíos.
 *
 * Reglas:
 * - Los desvíos que YA pertenecen a una solicitud solo reciben actualización de comentarios.
 * - Los desvíos SIN solicitud se agrupan por su checklist de origen Y por el equipo al que
 *   pertenecen: cada checklist genera (o reutiliza) su propia solicitud, porque
 *   `maintenance_requests.checklist_answer_id` admite un único checklist por solicitud.
 * - La solicitud se crea sobre el `equipment_id` DEL DESVÍO, no sobre el `input.equipmentId`
 *   (ticket 677). Un checklist de unidad tractora con enganche produce desvíos de las dos
 *   unidades; imputarlos todos a la tractora cargaba al camión el gasto del acoplado.
 * - Solo se reutiliza una solicitud existente si sigue abierta (pending_approval / rejected).
 *   Una solicitud ya aprobada NUNCA se modifica: se crea una nueva.
 *
 * Usado desde el modal de desvíos críticos y desde la tabla de "Equipos con Desvíos"
 */
export async function createOrUpdateMaintenanceRequest(input: {
  equipmentId: string;
  supervisorId: string;
  deviations: Array<{
    deviationId: string;
    comment?: string;
  }>;
  /** Requerido si se va a crear una nueva solicitud */
  checklistAnswerId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  driverEmployeeId?: string;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
}): Promise<
  | {
      ok: true;
      requestId?: string;
      created: boolean;
      /** Cantidad de solicitudes nuevas creadas */
      createdCount: number;
      /** Cantidad de solicitudes abiertas a las que se les sumaron desvíos */
      updatedCount: number;
      /** Cantidad de desvíos que quedaron asociados a una solicitud en esta operación */
      itemsAdded: number;
      /** Desvíos que ya pertenecían a una solicitud previa (solo se actualizó su comentario) */
      alreadyLinkedCount: number;
    }
  | { ok: false; error: string }
> {
  serverLogger.info('createOrUpdateMaintenanceRequest - Iniciando', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      deviationsCount: input.deviations.length,
      hasChecklistAnswerId: !!input.checklistAnswerId,
    },
  });

  if (input.manualItems && input.manualItems.length > 0) {
    serverLogger.debug('Se incluyeron ítems manuales', {
      data: { count: input.manualItems.length },
    });
  }

  try {
    const profile = await requireServerAuthProfile();
    const deviationIds = input.deviations.map((d) => d.deviationId);

    // Comentarios del chofer indexados por desvío
    const commentByDeviationId = new Map(
      input.deviations
        .filter((d) => d.comment && d.comment.trim().length > 0)
        .map((d) => [d.deviationId, d.comment!.trim()] as const)
    );

    // 1. Traer los desvíos con su checklist de origen y las solicitudes que ya los contienen
    const deviations = await prisma.checklist_deviations.findMany({
      where: { id: { in: deviationIds } },
      select: {
        id: true,
        checklist_answer_id: true,
        // Ticket 677: cada desvío sabe a qué unidad pertenece; la solicitud se crea sobre esa
        equipment_id: true,
        maintenance_request_items: { select: { maintenance_request_id: true } },
      },
    });

    const manualItemLabels = (input.manualItems ?? []).map((m) => m.label.trim()).filter((label) => label.length > 0);

    if (deviations.length === 0 && manualItemLabels.length === 0) {
      serverLogger.warn('No se encontraron desvíos para procesar', { data: { deviationIds } });
      return { ok: false, error: 'No se encontraron los desvíos indicados' };
    }

    // 2. Separar los desvíos que YA pertenecen a una solicitud de los que todavía no tienen ninguna
    const alreadyLinked = deviations.filter((d) => d.maintenance_request_items.length > 0);
    const unlinked = deviations.filter((d) => d.maintenance_request_items.length === 0);

    // 3. Agrupar los desvíos sin solicitud por checklist de origen + equipo al que aplican.
    //    Cada checklist necesita su propia solicitud: maintenance_requests.checklist_answer_id
    //    referencia un único checklist, así que mezclarlos falsearía el origen de los desvíos.
    //    Y cada equipo también: una solicitud apunta a un único `equipment_id`, así que los
    //    desvíos del enganche no pueden convivir con los de la unidad tractora (ticket 677).
    const NO_CHECKLIST = '__no_checklist__';
    const groupKey = (checklistAnswerId: string, equipmentId: string) => `${checklistAnswerId}|${equipmentId}`;
    const deviationGroups = new Map<
      string,
      { checklistAnswerId: string | null; equipmentId: string; deviationIds: string[] }
    >();

    for (const deviation of unlinked) {
      const checklistKey = deviation.checklist_answer_id ?? input.checklistAnswerId ?? NO_CHECKLIST;
      const equipmentId = deviation.equipment_id ?? input.equipmentId;
      const key = groupKey(checklistKey, equipmentId);
      const group = deviationGroups.get(key) ?? {
        checklistAnswerId: checklistKey === NO_CHECKLIST ? null : checklistKey,
        equipmentId,
        deviationIds: [],
      };
      group.deviationIds.push(deviation.id);
      deviationGroups.set(key, group);
    }

    // 4. Buscar solicitudes ABIERTAS para reutilizar (una aprobada nunca se modifica).
    //    La coincidencia es por checklist Y equipo: son las dos columnas que definen la solicitud.
    const checklistKeys = [
      ...new Set(
        [...deviationGroups.values()]
          .map((group) => group.checklistAnswerId)
          .filter((checklistAnswerId): checklistAnswerId is string => !!checklistAnswerId)
      ),
    ];

    const equipmentIds = [...new Set([...deviationGroups.values()].map((group) => group.equipmentId))];

    const openRequests = checklistKeys.length
      ? await prisma.maintenance_requests.findMany({
          where: {
            equipment_id: { in: equipmentIds },
            status: { in: [...OPEN_REQUEST_STATUSES] },
            checklist_answer_id: { in: checklistKeys },
          },
          select: { id: true, checklist_answer_id: true, equipment_id: true },
        })
      : [];

    const openRequestByGroup = new Map<string, string>();
    for (const request of openRequests) {
      if (!request.checklist_answer_id || !request.equipment_id) continue;
      const key = groupKey(request.checklist_answer_id, request.equipment_id);
      if (!openRequestByGroup.has(key)) {
        openRequestByGroup.set(key, request.id);
      }
    }

    // Datos de origen del checklist. Necesarios cuando la solicitud se crea desde la tabla de
    // desvíos acumulados, donde el modal no aporta chofer, kilometraje ni quién cargó el checklist.
    const checklistAnswers = checklistKeys.length
      ? await prisma.checklist_answers.findMany({
          where: { id: { in: checklistKeys } },
          select: { id: true, employee_id: true, chofer_employee_id: true, user_id: true, kilometraje: true },
        })
      : [];

    const checklistAnswerById = new Map(checklistAnswers.map((answer) => [answer.id, answer] as const));

    // Solicitudes que ya contienen los desvíos previamente vinculados: solo se refresca el
    // supervisor de las que siguen abiertas.
    const linkedRequestIds = [
      ...new Set(alreadyLinked.flatMap((d) => d.maintenance_request_items.map((item) => item.maintenance_request_id))),
    ];

    const openLinkedRequests = linkedRequestIds.length
      ? await prisma.maintenance_requests.findMany({
          where: { id: { in: linkedRequestIds }, status: { in: [...OPEN_REQUEST_STATUSES] } },
          select: { id: true, equipment_id: true },
        })
      : [];

    const openLinkedRequestIds = openLinkedRequests.map((request) => request.id);
    /** Solicitudes abiertas de la unidad desde la que se abrió el modal (no las del enganche) */
    const openLinkedContextRequestIds = openLinkedRequests
      .filter((request) => request.equipment_id === input.equipmentId)
      .map((request) => request.id);

    let createdCount = 0;
    let updatedCount = 0;
    let itemsAdded = 0;
    let primaryRequestId: string | undefined;
    /** Solicitud correspondiente a la unidad del contexto: es donde van los ítems manuales */
    let contextRequestId: string | undefined;

    await prisma.$transaction(async (tx) => {
      const touchedRequestIds = new Set<string>(openLinkedRequestIds);

      // 5. Una solicitud por checklist + equipo: reutilizar la abierta o crear una nueva
      for (const [key, group] of deviationGroups) {
        const { checklistAnswerId, equipmentId: groupEquipmentId, deviationIds: groupDeviationIds } = group;
        const reusableRequestId = checklistAnswerId ? openRequestByGroup.get(key) : undefined;
        let targetRequestId: string;

        if (reusableRequestId) {
          targetRequestId = reusableRequestId;
          updatedCount += 1;
        } else {
          const sourceAnswer = checklistAnswerId ? checklistAnswerById.get(checklistAnswerId) : undefined;
          // El kilometraje del checklist es el del odómetro de la unidad tractora. Si la
          // solicitud es de otra unidad (el enganche), no le corresponde: al aprobar la
          // entrada a taller ese valor se escribe en `vehicles.kilometer` del recurso, y
          // le estaríamos cargando al acoplado los km del camión (ticket 677).
          const isContextEquipment = groupEquipmentId === input.equipmentId;

          const created = await tx.maintenance_requests.create({
            data: {
              checklist_answer_id: checklistAnswerId,
              // Ticket 677: la unidad del desvío, no la del contexto del modal
              equipment_id: groupEquipmentId,
              employee_id: input.employeeId ?? sourceAnswer?.employee_id ?? null,
              user_id: input.userId ?? sourceAnswer?.user_id ?? profile.id,
              kilometer: isContextEquipment ? input.kilometer ?? sourceAnswer?.kilometraje?.toString() ?? null : null,
              supervisor_id: input.supervisorId,
              status: 'pending_approval',
              driver_employee_id: input.driverEmployeeId ?? sourceAnswer?.chofer_employee_id ?? null,
            },
            select: { id: true },
          });
          targetRequestId = created.id;
          createdCount += 1;
        }

        touchedRequestIds.add(targetRequestId);

        // La solicitud "principal" es la del checklist que originó la operación
        if (!primaryRequestId || (input.checklistAnswerId && checklistAnswerId === input.checklistAnswerId)) {
          primaryRequestId = targetRequestId;
        }

        if (!contextRequestId && groupEquipmentId === input.equipmentId) {
          contextRequestId = targetRequestId;
        }

        const { count } = await tx.maintenance_request_items.createMany({
          data: groupDeviationIds.map((deviationId) => ({
            maintenance_request_id: targetRequestId,
            checklist_deviation_id: deviationId,
            repair_type_id: null,
            driver_comment: commentByDeviationId.get(deviationId) ?? null,
            driver_comment_by: commentByDeviationId.has(deviationId) ? profile.id : null,
            status: 'pending',
          })),
          skipDuplicates: true,
        });

        itemsAdded += count;
      }

      // 6. Ítems manuales (texto libre): van a la solicitud del checklist en curso, y siempre
      //    sobre la unidad desde la que se abrió el modal — nunca sobre la del enganche, que
      //    tiene su propia solicitud (ticket 677).
      if (manualItemLabels.length > 0) {
        let manualRequestId = contextRequestId ?? openLinkedContextRequestIds[0];
        let manualChecklistAnswerId = input.checklistAnswerId ?? null;

        if (!manualRequestId) {
          const created = await tx.maintenance_requests.create({
            data: {
              checklist_answer_id: manualChecklistAnswerId,
              equipment_id: input.equipmentId,
              employee_id: input.employeeId ?? null,
              user_id: input.userId ?? profile.id,
              kilometer: input.kilometer ?? null,
              supervisor_id: input.supervisorId,
              status: 'pending_approval',
              driver_employee_id: input.driverEmployeeId ?? null,
            },
            select: { id: true },
          });
          manualRequestId = created.id;
          createdCount += 1;
          primaryRequestId = created.id;
        }

        touchedRequestIds.add(manualRequestId);

        if (!manualChecklistAnswerId) {
          const request = await tx.maintenance_requests.findUnique({
            where: { id: manualRequestId },
            select: { checklist_answer_id: true },
          });
          manualChecklistAnswerId = request?.checklist_answer_id ?? null;
        }

        for (const label of manualItemLabels) {
          const manualDeviation = await tx.checklist_deviations.create({
            data: {
              checklist_answer_id: manualChecklistAnswerId,
              equipment_id: input.equipmentId,
              item_code: 'manual',
              item_label: label,
              section_code: null,
              is_critical: false,
              created_by_user_id: profile.id,
            },
            select: { id: true },
          });

          await tx.maintenance_request_items.create({
            data: {
              maintenance_request_id: manualRequestId,
              checklist_deviation_id: manualDeviation.id,
              repair_type_id: null,
              driver_comment: null,
              status: 'pending',
            },
          });

          itemsAdded += 1;
        }
      }

      // 7. Comentarios del chofer: se guardan en el desvío y en su ítem
      for (const [deviationId, comment] of commentByDeviationId) {
        await tx.checklist_deviations.update({
          where: { id: deviationId },
          data: { driver_comment: comment },
        });

        await tx.maintenance_request_items.updateMany({
          where: { checklist_deviation_id: deviationId },
          data: { driver_comment: comment, driver_comment_by: profile.id },
        });
      }

      // 8. Supervisor de turno: solo sobre las solicitudes ABIERTAS tocadas en esta operación.
      //    Una solicitud ya aprobada conserva su supervisor original.
      if (touchedRequestIds.size > 0) {
        await tx.maintenance_requests.updateMany({
          where: { id: { in: [...touchedRequestIds] }, status: { in: [...OPEN_REQUEST_STATUSES] } },
          data: { supervisor_id: input.supervisorId, updated_at: new Date() },
        });
      }
    });

    serverLogger.info('Desvíos procesados', {
      data: {
        equipmentId: input.equipmentId,
        createdCount,
        updatedCount,
        itemsAdded,
        alreadyLinkedCount: alreadyLinked.length,
      },
    });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequest);

    return {
      ok: true,
      requestId: primaryRequestId,
      created: createdCount > 0,
      createdCount,
      updatedCount,
      itemsAdded,
      alreadyLinkedCount: alreadyLinked.length,
    };
  } catch (error) {
    serverLogger.error('Error inesperado en createOrUpdateMaintenanceRequest', { data: { error } });
    return { ok: false, error: 'Error inesperado al procesar la solicitud' };
  }
}

/**
 * Actualiza los comentarios de los desvíos y el supervisor de una solicitud.
 * Usado por el chofer después de completar el checklist.
 * @deprecated Usar createOrUpdateMaintenanceRequest en su lugar
 */
export async function updateDeviationCommentsAndSupervisor(input: {
  equipmentId: string;
  supervisorId: string;
  comments: Array<{
    deviationId: string;
    comment: string;
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  serverLogger.info('Actualizando comentarios de desvíos y supervisor', {
    data: {
      equipmentId: input.equipmentId,
      supervisorId: input.supervisorId,
      commentsCount: input.comments.length,
    },
  });

  try {
    const deviationIds = input.comments.map((c) => c.deviationId);

    // 1. Actualizar los comentarios en checklist_deviations
    await Promise.all(
      input.comments.map((item) =>
        prisma.checklist_deviations
          .update({
            where: { id: item.deviationId },
            data: { driver_comment: item.comment },
          })
          .catch((err) => {
            serverLogger.error('Error al actualizar comentario de desvío', {
              data: { error: err, deviationId: item.deviationId },
            });
          })
      )
    );

    // 2. Obtener los IDs de las solicitudes de mantenimiento que contienen estos desvíos
    const requestItems = await prisma.maintenance_request_items.findMany({
      where: { checklist_deviation_id: { in: deviationIds } },
      select: { maintenance_request_id: true, checklist_deviation_id: true },
    });

    // 3. Actualizar el supervisor en las solicitudes únicas
    const uniqueRequestIds = [...new Set(requestItems.map((item) => item.maintenance_request_id))];

    await Promise.all(
      uniqueRequestIds.map((requestId) =>
        prisma.maintenance_requests
          .update({
            where: { id: requestId },
            data: { supervisor_id: input.supervisorId },
          })
          .catch((err) => {
            serverLogger.error('Error al actualizar supervisor de solicitud', {
              data: { error: err, requestId },
            });
          })
      )
    );

    // 4. Actualizar los comentarios en maintenance_request_items
    await Promise.all(
      input.comments.map((item) =>
        prisma.maintenance_request_items
          .updateMany({
            where: { checklist_deviation_id: item.deviationId },
            data: { driver_comment: item.comment },
          })
          .catch((err) => {
            serverLogger.error('Error al actualizar comentario de item', {
              data: { error: err, deviationId: item.deviationId },
            });
          })
      )
    );

    serverLogger.info('Comentarios y supervisor actualizados exitosamente', {
      data: { requestsUpdated: uniqueRequestIds.length, commentsUpdated: input.comments.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.reassignRequestSupervisor);

    return { ok: true };
  } catch (error) {
    serverLogger.error('Error inesperado al actualizar comentarios', { data: { error } });
    return { ok: false, error: 'Error inesperado al actualizar los comentarios' };
  }
}

/**
 * Reasigna el supervisor de una solicitud de mantenimiento pendiente de aprobación.
 * Solo aplica a solicitudes en estado 'pending_approval'.
 */
export async function reassignRequestSupervisor(requestId: string, newSupervisorId: string) {
  serverLogger.info('Reasignando supervisor de solicitud', {
    data: { requestId, newSupervisorId },
  });

  try {
    await prisma.maintenance_requests.update({
      where: { id: requestId },
      data: { supervisor_id: newSupervisorId },
    });

    serverLogger.info('Supervisor reasignado exitosamente', { data: { requestId, newSupervisorId } });

    await invalidateCacheTags(INVALIDATION_MAP.reassignRequestSupervisor);

    return { success: true };
  } catch (error) {
    serverLogger.error('Error al reasignar supervisor', { data: { error, requestId, newSupervisorId } });
    throw error;
  }
}

/**
 * Rechaza una solicitud de mantenimiento completa.
 * @deprecated Usar rejectMaintenanceRequestItems para rechazar items específicos
 */
export async function rejectMaintenanceRequest(input: RejectRequestInput) {
  serverLogger.info('Rechazando solicitud de mantenimiento', {
    data: { requestId: input.requestId, reason: input.reason },
  });

  const profile = await requireServerAuthProfile();

  try {
    await prisma.$transaction(async (tx) => {
      // Actualizar todos los items como rechazados
      await tx.maintenance_request_items.updateMany({
        where: { maintenance_request_id: input.requestId },
        data: {
          status: 'rejected',
          rejection_reason: input.reason,
        },
      });

      // Actualizar estado de la solicitud
      await tx.maintenance_requests.update({
        where: { id: input.requestId },
        data: {
          status: 'rejected',
          rejection_reason: input.reason,
          rejected_by: profile.id,
          rejected_at: new Date(),
        },
      });
    });

    serverLogger.info('Solicitud rechazada exitosamente', { data: { requestId: input.requestId } });

    await invalidateCacheTags(INVALIDATION_MAP.rejectMaintenanceRequest);

    return { success: true };
  } catch (error) {
    serverLogger.error('Error al rechazar solicitud', { data: { error, requestId: input.requestId } });
    throw error;
  }
}

/**
 * Rechaza items específicos de una solicitud de mantenimiento.
 * Permite rechazo selectivo (item por item) con un motivo común.
 */
export async function rejectMaintenanceRequestItems(input: { requestId: string; itemIds: string[]; reason: string }) {
  serverLogger.info('Rechazando items de solicitud', {
    data: { requestId: input.requestId, itemCount: input.itemIds.length, reason: input.reason },
  });

  const profile = await requireServerAuthProfile();

  // --- PREVENTIVE REJECTION BRANCH ---
  if (input.itemIds.length === 0 && input.reason) {
    const request = await prisma.maintenance_requests.findUniqueOrThrow({
      where: { id: input.requestId },
      select: { source: true, preventive_type: true },
    });

    if (request.source === 'preventive') {
      await prisma.$transaction(async (tx) => {
        await tx.maintenance_requests.update({
          where: { id: input.requestId },
          data: { status: 'rejected' },
        });

        await logActivity(tx, {
          maintenanceRequestId: input.requestId,
          actionType: ACTIVITY_LOG.REJECTED,
          performedBy: profile.id,
          notes: input.reason,
          metadata: { source: 'preventive', preventive_type: request.preventive_type },
        });
      });

      await invalidateCacheTags(INVALIDATION_MAP.rejectMaintenanceRequestItems);
      return;
    }
  }
  // --- END PREVENTIVE BRANCH ---

  try {
    // Actualizar solo los items seleccionados como rechazados
    await prisma.maintenance_request_items.updateMany({
      where: { id: { in: input.itemIds } },
      data: {
        status: 'rejected',
        rejection_reason: input.reason,
      },
    });

    // Verificar si quedan items pendientes en la solicitud
    const remainingItems = await prisma.maintenance_request_items.findMany({
      where: { maintenance_request_id: input.requestId },
      select: { id: true, status: true },
    });

    const pendingItems = remainingItems.filter((item) => item.status === 'pending');
    const allRejected = remainingItems.length > 0 && remainingItems.every((item) => item.status === 'rejected');

    // Si todos los items están rechazados, actualizar el estado de la solicitud
    if (allRejected) {
      await prisma.maintenance_requests.update({
        where: { id: input.requestId },
        data: {
          status: 'rejected',
          rejection_reason: input.reason,
          rejected_by: profile.id,
          rejected_at: new Date(),
        },
      });
    }

    serverLogger.info('Items rechazados exitosamente', {
      data: {
        requestId: input.requestId,
        rejectedCount: input.itemIds.length,
        pendingCount: pendingItems.length,
        allRejected,
      },
    });

    await invalidateCacheTags(INVALIDATION_MAP.rejectMaintenanceRequestItems);

    return { success: true, pendingCount: pendingItems.length, allRejected };
  } catch (error) {
    serverLogger.error('Error al rechazar items de solicitud', { data: { error, requestId: input.requestId } });
    throw error;
  }
}

/**
 * Crea desvíos manuales sobre un checklist ya guardado (sin ítems fallidos automáticos)
 * junto con su solicitud de mantenimiento. Todo en una sola transacción.
 *
 * Flujo: checklist_deviations → maintenance_requests → maintenance_request_items.
 * Los desvíos quedan vinculados al checklist_answer_id (a diferencia de los desvíos
 * manuales de NuevoPedido que son huérfanos).
 */
export async function createManualDeviationsFromChecklist(input: {
  checklistAnswerId: string;
  equipmentId: string;
  supervisorId: string;
  driverEmployeeId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  items: Array<{
    templateItemId: string;
    itemCode: string;
    itemLabel: string;
    sectionCode: string;
    isCritical: boolean;
    comment?: string;
  }>;
  /** Ítems manuales (texto libre, no del template) */
  manualItems?: Array<{ label: string }>;
}): Promise<{ ok: true; requestId: string; deviationIds: string[] } | { ok: false; error: string }> {
  serverLogger.info('createManualDeviationsFromChecklist - Iniciando', {
    data: {
      checklistAnswerId: input.checklistAnswerId,
      equipmentId: input.equipmentId,
      itemsCount: input.items.length,
    },
  });

  if (input.manualItems && input.manualItems.length > 0) {
    serverLogger.debug('Se incluyeron ítems manuales', {
      data: { count: input.manualItems.length },
    });
  }

  const manualCount = (input.manualItems ?? []).filter((m) => m.label.trim().length > 0).length;
  if (input.items.length === 0 && manualCount === 0) {
    return { ok: false, error: 'Debe agregar al menos un ítem' };
  }

  try {
    const profile = await requireServerAuthProfile();

    const answer = await prisma.checklist_answers.findUnique({
      where: { id: input.checklistAnswerId },
      select: { id: true, equipment_id: true },
    });

    if (!answer || answer.equipment_id !== input.equipmentId) {
      serverLogger.error('checklist_answer invalido o no coincide con equipo', {
        data: { checklistAnswerId: input.checklistAnswerId, equipmentId: input.equipmentId },
      });
      return { ok: false, error: 'Checklist no encontrado o no coincide con el equipo' };
    }

    const userId = input.userId ?? profile.id;

    const result = await prisma.$transaction(async (tx) => {
      const createdDeviations = await Promise.all(
        input.items.map((item) =>
          tx.checklist_deviations.create({
            data: {
              checklist_answer_id: input.checklistAnswerId,
              equipment_id: input.equipmentId,
              item_code: item.itemCode,
              item_label: item.itemLabel,
              section_code: item.sectionCode,
              is_critical: item.isCritical,
              driver_comment: item.comment?.trim() || null,
              created_by_user_id: profile.id,
            },
            select: { id: true },
          })
        )
      );

      let deviationIds = createdDeviations.map((d) => d.id);

      const request = await tx.maintenance_requests.create({
        data: {
          checklist_answer_id: input.checklistAnswerId,
          equipment_id: input.equipmentId,
          employee_id: input.employeeId ?? null,
          user_id: userId,
          kilometer: input.kilometer ?? null,
          supervisor_id: input.supervisorId,
          status: 'pending_approval',
          driver_employee_id: input.driverEmployeeId ?? null,
        },
        select: { id: true },
      });

      await tx.maintenance_request_items.createMany({
        data: input.items.map((item, idx) => ({
          maintenance_request_id: request.id,
          checklist_deviation_id: deviationIds[idx],
          repair_type_id: null,
          driver_comment: item.comment?.trim() || null,
          driver_comment_by: item.comment?.trim() ? profile.id : null,
          status: 'pending',
        })),
      });

      // Crear ítems manuales (texto libre, no del template)
      if (input.manualItems && input.manualItems.length > 0) {
        const manualDevs = await Promise.all(
          input.manualItems
            .filter((m) => m.label.trim().length > 0)
            .map((m) =>
              tx.checklist_deviations.create({
                data: {
                  checklist_answer_id: input.checklistAnswerId,
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
          deviationIds = [...deviationIds, ...manualDevs.map((d) => d.id)];
        }
      }

      return { requestId: request.id, deviationIds };
    });

    serverLogger.info('createManualDeviationsFromChecklist - OK', {
      data: { requestId: result.requestId, deviationsCount: result.deviationIds.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequest);

    return { ok: true, requestId: result.requestId, deviationIds: result.deviationIds };
  } catch (error) {
    serverLogger.error('Error en createManualDeviationsFromChecklist', { data: { error } });
    return { ok: false, error: 'Error inesperado al registrar los desvíos' };
  }
}
