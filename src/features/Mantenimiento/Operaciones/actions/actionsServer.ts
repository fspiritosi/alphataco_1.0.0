'use server';

import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { CACHE_TAGS, CACHE_TTL } from '@/shared/constants/cache';
import { INVALIDATION_MAP } from '@/shared/constants/cache-invalidation-map';
import { prisma } from '@/shared/lib/prisma';
import { invalidateCacheTags } from '@/shared/utils/cache-invalidation';
import { cacheLife, cacheTag } from 'next/cache';
import type { ApproveWorkshopEntryInput, RejectOperationInput } from '../../types';
import { getSupervisorFilterInfo } from '../../utils/supervisorFilter';

const serverLogger = new Logger('Operaciones/actions');

// ─── Tipos internos de activity_log ───────────────────────────────────────────

/**
 * Tipo de un registro de activity_log tal como lo retorna Prisma con el select ACTIVITY_LOG_SELECT.
 * Permite tipar correctamente los resultados antes del mapeo a "performer".
 */
type RawActivityLogEntry = {
  id: string;
  maintenance_request_id: string | null;
  maintenance_order_id: string | null;
  work_order_id: string | null;
  action_type: string;
  performed_by: string | null;
  performed_at: Date;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  rejection_reason: string | null;
  metadata: unknown;
  created_at: Date;
  profile: { id: string; fullname: string | null; email: string | null } | null;
};

/**
 * Tipo del activity_log con "performer" como alias de "profile".
 * Usado en el código del cliente para compatibilidad.
 */
type MappedActivityLogEntry = Omit<RawActivityLogEntry, 'profile'> & {
  performer: { id: string; fullname: string | null; email: string | null } | null;
};

// ─── Helpers de select reutilizables ──────────────────────────────────────────

/**
 * Select de maintenance_activity_log.
 * En Supabase se usaba alias "performer" con la FK; en Prisma la relacion se llama "profile".
 * Mapeamos el resultado para exponer "performer" en lugar de "profile".
 */
const ACTIVITY_LOG_SELECT = {
  id: true,
  maintenance_request_id: true,
  maintenance_order_id: true,
  work_order_id: true,
  action_type: true,
  performed_by: true,
  performed_at: true,
  previous_status: true,
  new_status: true,
  notes: true,
  rejection_reason: true,
  metadata: true,
  created_at: true,
  profile: {
    select: { id: true, fullname: true, email: true },
  },
} as const;

/**
 * Mapea un registro de activity_log para exponer "performer" en lugar de "profile".
 * Mantiene compatibilidad con el código que accede a entry.performer.
 */
function mapActivityLogEntry(entry: RawActivityLogEntry): MappedActivityLogEntry {
  const { profile, ...rest } = entry;
  return { ...rest, performer: profile };
}

// ─── Comentarios cargados sobre los items del pedido (ticket 649) ─────────────

/**
 * Select de los items de una solicitud con sus tres comentarios.
 *
 * No viajan por `maintenance_activity_log` (se escriben directo en la fila del
 * item, sin generar un evento), así que el historial no los veía: hay que
 * leerlos de la tabla.
 */
const REQUEST_ITEM_COMMENTS_SELECT = {
  id: true,
  description: true,
  free_text: true,
  driver_comment: true,
  supervisor_comment: true,
  validator_comment: true,
  checklist_deviations: {
    select: { item_label: true },
  },
  profile_maintenance_request_items_driver_comment_byToprofile: {
    select: { id: true, fullname: true, email: true },
  },
  profile_maintenance_request_items_supervisor_comment_byToprofile: {
    select: { id: true, fullname: true, email: true },
  },
  profile_maintenance_request_items_validator_comment_byToprofile: {
    select: { id: true, fullname: true, email: true },
  },
} as const;

type RawRequestItemComment = Prisma.maintenance_request_itemsGetPayload<{
  select: typeof REQUEST_ITEM_COMMENTS_SELECT;
}>;

/** Un comentario suelto, ya resuelto a quién lo escribió y con qué rol */
export type RequestItemComment = {
  itemId: string;
  /** Cómo se llama el item en pantalla (desvío del checklist, o el texto cargado a mano) */
  itemLabel: string;
  author: 'driver' | 'supervisor' | 'validator';
  comment: string;
  authorName: string | null;
};

const COMMENT_AUTHOR_ORDER: RequestItemComment['author'][] = ['driver', 'supervisor', 'validator'];

/**
 * Nombre visible del item: el desvío del checklist, o lo que se escribió a mano.
 *
 * `section_code` queda afuera a propósito: se guarda en snake_case crudo
 * (`semi_remolque_vacio`) y no hay mapa a texto legible, así que anteponerlo
 * ensucia la línea sin agregar nada — `item_label` ya viene redactado.
 */
function getRequestItemLabel(item: RawRequestItemComment): string {
  return (
    item.checklist_deviations?.item_label?.trim() ||
    item.description?.trim() ||
    item.free_text?.trim() ||
    'Item del pedido'
  );
}

/**
 * Aplana los items a una lista de comentarios: un item con comentario del chofer
 * y del supervisor produce dos entradas. Los items sin ningún comentario no
 * aparecen — el ticket pide mostrar los que tienen algo escrito.
 *
 * Deduplica por item con el mismo criterio que `getItemComments` (driverInfo.ts):
 * en estos datos los tres campos suelen repetir el mismo texto, y sin este filtro
 * el historial mostraba la misma frase hasta tres veces. Gana el primer autor del
 * orden chofer → supervisor → validación, que es el orden en que se escriben.
 */
function mapRequestItemComments(items: RawRequestItemComment[]): RequestItemComment[] {
  const comments: RequestItemComment[] = [];

  for (const item of items) {
    const itemLabel = getRequestItemLabel(item);
    const byAuthor = {
      driver: { text: item.driver_comment, profile: item.profile_maintenance_request_items_driver_comment_byToprofile },
      supervisor: {
        text: item.supervisor_comment,
        profile: item.profile_maintenance_request_items_supervisor_comment_byToprofile,
      },
      validator: {
        text: item.validator_comment,
        profile: item.profile_maintenance_request_items_validator_comment_byToprofile,
      },
    };

    const seenTexts = new Set<string>();

    for (const author of COMMENT_AUTHOR_ORDER) {
      const { text, profile } = byAuthor[author];
      const comment = text?.trim();
      if (!comment) continue;

      const normalized = comment.toLowerCase();
      if (seenTexts.has(normalized)) continue;
      seenTexts.add(normalized);

      comments.push({
        itemId: item.id,
        itemLabel,
        author,
        comment,
        authorName: profile?.fullname ?? profile?.email ?? null,
      });
    }
  }

  return comments;
}

/** Los comentarios de los items de una solicitud, listos para el historial */
async function getRequestItemComments(maintenanceRequestId: string | null | undefined) {
  if (!maintenanceRequestId) return [];
  const items = await prisma.maintenance_request_items.findMany({
    where: { maintenance_request_id: maintenanceRequestId },
    select: REQUEST_ITEM_COMMENTS_SELECT,
    orderBy: { created_at: 'asc' },
  });
  return mapRequestItemComments(items);
}

// ─── Queries de maintenance_order_items ───────────────────────────────────────

/**
 * Include completo para maintenance_order_items con sus relaciones anidadas.
 * Usado tanto en getMaintenanceOperations como en getOrdersForWorkshop.
 */
const MAINTENANCE_ORDER_ITEMS_INCLUDE = {
  maintenance_request_items: {
    include: {
      checklist_deviations: {
        select: {
          id: true,
          item_code: true,
          item_label: true,
          section_code: true,
          driver_comment: true,
          checklist_answers: {
            select: {
              id: true,
              employees: {
                select: { id: true, firstname: true, lastname: true },
              },
              profile: {
                select: { id: true, fullname: true, email: true },
              },
            },
          },
        },
      },
    },
  },
  types_of_repairs: {
    select: { id: true, name: true },
  },
  maintenance_order_item_repair_types: {
    select: {
      repair_type_id: true,
      types_of_repairs: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

// ─── READs ────────────────────────────────────────────────────────────────────

/**
 * Obtiene las operaciones planificadas (pedidos con status 'scheduled')
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODAS las operaciones
 * - Usuarios sin rol de sistema: solo ven operaciones cuya solicitud tiene supervisor_id = su user_id
 */
export async function getMaintenanceOperations() {
  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  try {
    const data = await prisma.maintenance_orders.findMany({
      where: {
        status: 'scheduled',
        // !inner en Supabase → maintenance_requests NOT NULL
        maintenance_request_id: { not: null },
        ...(filterInfo?.shouldFilterBySupervisor
          ? {
              maintenance_requests: {
                supervisor_id: filterInfo.userId,
              },
            }
          : {}),
      },
      select: {
        id: true,
        maintenance_request_id: true,
        equipment_id: true,
        status: true,
        scheduled_date: true,
        scheduled_by: true,
        scheduled_at: true,
        rejection_reason: true,
        rejected_by: true,
        rejected_at: true,
        workshop_entry_date: true,
        workshop_approved_by: true,
        kilometer_at_entry: true,
        engine_hours_at_entry: true,
        created_at: true,
        updated_at: true,
        date_approved_at: true,
        date_approved_by: true,
        date_rejected_at: true,
        date_rejected_by: true,
        date_rejection_reason: true,
        source: true,
        order_number: true,
        workshop_validated_at: true,
        workshop_validation_notes: true,
        operations_validated_by: true,
        operations_validated_at: true,
        operations_validation_notes: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            condition: true,
            kilometer: true,
            engine_hours: true,
          },
        },
        maintenance_requests: {
          select: {
            id: true,
            kilometer: true,
            engine_hours: true,
            created_at: true,
            supervisor_id: true,
            source: true,
            preventive_type: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          include: MAINTENANCE_ORDER_ITEMS_INCLUDE,
        },
      },
      orderBy: { scheduled_date: 'asc' },
    });

    return data;
  } catch (error) {
    serverLogger.error('Error al obtener operaciones', { data: { error } });
    throw error;
  }
}

export type MaintenanceOperationsData = Awaited<ReturnType<typeof getMaintenanceOperations>>;
export type MaintenanceOperationData = MaintenanceOperationsData[number];

/**
 * Obtiene los pedidos con fecha confirmada (date_confirmed) y los que ya están en taller (in_workshop)
 * Para que el usuario tenga visibilidad de todos los equipos en taller
 *
 * FILTRO DE SUPERVISOR:
 * - Usuarios con rol de sistema: ven TODOS los pedidos
 * - Usuarios sin rol de sistema: solo ven pedidos cuya solicitud tiene supervisor_id = su user_id
 */
export async function getOrdersForWorkshop() {
  // Obtener información del filtro de supervisor
  const filterInfo = await getSupervisorFilterInfo();

  try {
    const data = await prisma.maintenance_orders.findMany({
      where: {
        status: 'date_confirmed',
        // !inner en Supabase → maintenance_requests NOT NULL
        maintenance_request_id: { not: null },
        ...(filterInfo?.shouldFilterBySupervisor
          ? {
              maintenance_requests: {
                supervisor_id: filterInfo.userId,
              },
            }
          : {}),
      },
      select: {
        id: true,
        maintenance_request_id: true,
        equipment_id: true,
        status: true,
        scheduled_date: true,
        scheduled_by: true,
        scheduled_at: true,
        rejection_reason: true,
        rejected_by: true,
        rejected_at: true,
        workshop_entry_date: true,
        workshop_approved_by: true,
        kilometer_at_entry: true,
        engine_hours_at_entry: true,
        created_at: true,
        updated_at: true,
        date_approved_at: true,
        date_approved_by: true,
        date_rejected_at: true,
        date_rejected_by: true,
        date_rejection_reason: true,
        source: true,
        order_number: true,
        workshop_validated_at: true,
        workshop_validation_notes: true,
        operations_validated_by: true,
        operations_validated_at: true,
        operations_validation_notes: true,
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            condition: true,
            kilometer: true,
            engine_hours: true,
          },
        },
        maintenance_requests: {
          select: {
            id: true,
            kilometer: true,
            engine_hours: true,
            created_at: true,
            supervisor_id: true,
            source: true,
            preventive_type: true,
            profile_maintenance_requests_supervisor_idToprofile: {
              select: { id: true, fullname: true },
            },
          },
        },
        maintenance_order_items: {
          include: MAINTENANCE_ORDER_ITEMS_INCLUDE,
        },
      },
      orderBy: { scheduled_date: 'asc' },
    });

    return data;
  } catch (error) {
    serverLogger.error('Error al obtener pedidos para taller', { data: { error } });
    throw error;
  }
}

export type OrdersForWorkshopData = Awaited<ReturnType<typeof getOrdersForWorkshop>>;
export type OrderForWorkshopData = OrdersForWorkshopData[number];

/**
 * Obtiene el historial de actividades de un pedido de mantenimiento.
 * Incluye información del usuario que realizó cada acción (como "performer").
 */
export async function getMaintenanceOrderActivityLog(orderId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial de actividades', { data: { orderId } });

  try {
    const data = await prisma.maintenance_activity_log.findMany({
      where: { maintenance_order_id: orderId },
      select: ACTIVITY_LOG_SELECT,
      orderBy: { performed_at: 'asc' },
    });

    return data.map(mapActivityLogEntry);
  } catch (error) {
    serverLogger.error('Error al obtener historial de actividades', { data: { error, orderId } });
    throw error;
  }
}

export type MaintenanceActivityLogData = Awaited<ReturnType<typeof getMaintenanceOrderActivityLog>>;
export type MaintenanceActivityLogEntry = MaintenanceActivityLogData[number];

/**
 * Obtiene el historial de actividades de una solicitud de mantenimiento.
 */
export async function getMaintenanceRequestActivityLog(requestId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_REQUESTS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial de actividades de solicitud', { data: { requestId } });

  try {
    const data = await prisma.maintenance_activity_log.findMany({
      where: { maintenance_request_id: requestId },
      select: ACTIVITY_LOG_SELECT,
      orderBy: { performed_at: 'asc' },
    });

    return data.map(mapActivityLogEntry);
  } catch (error) {
    serverLogger.error('Error al obtener historial de actividades de solicitud', { data: { error, requestId } });
    throw error;
  }
}

/**
 * Tipo del origen de una solicitud de mantenimiento
 */
export type MaintenanceRequestOrigin = {
  type: 'checklist' | 'manual';
  // Datos del checklist (si aplica)
  checklist?: {
    id: string;
    fecha: string | null;
    hora: string | null;
    chofer: string | null;
    kilometraje: string | null;
    createdAt: string | null;
    respondedBy: {
      id: string;
      fullname: string | null;
      email: string | null;
    } | null;
  };
  // Datos del creador manual (si aplica)
  manualCreator?: {
    id: string;
    fullname: string | null;
    email: string | null;
  } | null;
  createdAt: string | null;
  // Empleado conductor asociado a la solicitud (si aplica)
  driverEmployee?: {
    firstname: string;
    lastname: string;
    file: string | null;
  } | null;
};

/**
 * Obtiene el historial COMPLETO de una solicitud de mantenimiento, incluyendo:
 * - El origen (checklist o manual)
 * - El historial de actividades
 */
export async function getMaintenanceRequestFullActivityLog(requestId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_REQUESTS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial completo de solicitud', { data: { requestId } });

  try {
    // 1. Obtener la solicitud, el activity log y los comentarios de los items en paralelo
    const [request, activityLogRaw, itemComments] = await Promise.all([
      prisma.maintenance_requests.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          source: true,
          preventive_type: true,
          created_at: true,
          checklist_answer_id: true,
          user_id: true,
          checklist_answers: {
            select: {
              id: true,
              answer_data: true,
              created_at: true,
              profile: {
                select: { id: true, fullname: true, email: true },
              },
              employees: {
                select: { id: true, firstname: true, lastname: true },
              },
            },
          },
          profile_maintenance_requests_user_idToprofile: {
            select: { id: true, fullname: true, email: true },
          },
          driver_employee: {
            select: { id: true, firstname: true, lastname: true, file: true },
          },
        },
      }),
      prisma.maintenance_activity_log.findMany({
        where: { maintenance_request_id: requestId },
        select: ACTIVITY_LOG_SELECT,
        orderBy: { performed_at: 'asc' },
      }),
      getRequestItemComments(requestId),
    ]);

    if (!request) {
      serverLogger.error('Solicitud no encontrada', { data: { requestId } });
      throw new Error(`Solicitud ${requestId} no encontrada`);
    }

    const activityLog = activityLogRaw.map(mapActivityLogEntry);

    // 2. Construir información del origen
    let origin: MaintenanceRequestOrigin;

    if (request.source === 'manual' || !request.checklist_answer_id) {
      // Origen manual (sin checklist)
      const creator = request.profile_maintenance_requests_user_idToprofile;
      origin = {
        type: 'manual',
        manualCreator: creator ? { id: creator.id, fullname: creator.fullname, email: creator.email } : null,
        createdAt: request.created_at?.toISOString() ?? null,
        driverEmployee: request.driver_employee ?? null,
      };
    } else {
      // Origen desde checklist
      const answerData = request.checklist_answers?.answer_data as {
        fecha?: string;
        hora?: string;
        chofer?: string;
        kilometraje?: string;
      } | null;

      const checklistUser = request.checklist_answers?.profile;

      origin = {
        type: 'checklist',
        checklist: {
          id: request.checklist_answer_id,
          fecha: answerData?.fecha ?? null,
          hora: answerData?.hora ?? null,
          chofer: answerData?.chofer ?? null,
          kilometraje: answerData?.kilometraje ?? null,
          createdAt: request.checklist_answers?.created_at?.toISOString() ?? null,
          respondedBy: checklistUser
            ? { id: checklistUser.id, fullname: checklistUser.fullname, email: checklistUser.email }
            : null,
        },
        createdAt: request.created_at?.toISOString() ?? null,
        driverEmployee: request.driver_employee ?? null,
      };
    }

    return { origin, history: activityLog, itemComments };
  } catch (error) {
    serverLogger.error('Error al obtener historial completo de solicitud', { data: { error, requestId } });
    throw error;
  }
}

export type MaintenanceRequestFullActivityLog = Awaited<ReturnType<typeof getMaintenanceRequestFullActivityLog>>;

/**
 * Obtiene el historial COMPLETO de un pedido de mantenimiento (maintenance_order), incluyendo:
 * - El origen (checklist o manual) desde la solicitud asociada
 * - El historial de actividades de la solicitud
 * - El historial de actividades del pedido
 */
export async function getMaintenanceOrderFullActivityLog(orderId: string, requestId?: string) {
  'use cache';
  cacheTag(CACHE_TAGS.MAINTENANCE_ORDERS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial completo de pedido', { data: { orderId, requestId } });

  try {
    // Resolver el requestId si no viene
    let maintenanceRequestId = requestId;
    if (!maintenanceRequestId) {
      const order = await prisma.maintenance_orders.findUnique({
        where: { id: orderId },
        select: { maintenance_request_id: true },
      });
      maintenanceRequestId = order?.maintenance_request_id ?? undefined;
    }

    // Resolver work_orders hijas de la OM con sus datos básicos
    const workOrdersData = await prisma.work_orders.findMany({
      where: {
        maintenance_order_items: {
          some: { maintenance_order_id: orderId },
        },
      },
      select: {
        id: true,
        order_number: true,
        status: true,
        planned_start_date: true,
        planned_end_date: true,
        sector_id: true,
        workshop_id: true,
        workshop_sectors: { select: { id: true, name: true } },
        workshops: { select: { id: true, name: true, type: true } },
      },
      orderBy: { sequence_number: 'asc' },
    });

    const workOrderIds = workOrdersData.map((wo) => wo.id);

    const [requestData, requestLogsRaw, orderLogsRaw, workOrderLogsRaw, itemComments] = await Promise.all([
      // 1. Origen desde la solicitud (si hay requestId)
      maintenanceRequestId
        ? prisma.maintenance_requests.findUnique({
            where: { id: maintenanceRequestId },
            select: {
              id: true,
              source: true,
              preventive_type: true,
              created_at: true,
              checklist_answer_id: true,
              user_id: true,
              checklist_answers: {
                select: {
                  id: true,
                  answer_data: true,
                  created_at: true,
                  profile: {
                    select: { id: true, fullname: true, email: true },
                  },
                  employees: {
                    select: { id: true, firstname: true, lastname: true },
                  },
                },
              },
              profile_maintenance_requests_user_idToprofile: {
                select: { id: true, fullname: true, email: true },
              },
              driver_employee: {
                select: { id: true, firstname: true, lastname: true, file: true },
              },
            },
          })
        : Promise.resolve(null),
      // 2. Logs de la solicitud (si hay requestId)
      maintenanceRequestId
        ? prisma.maintenance_activity_log.findMany({
            where: { maintenance_request_id: maintenanceRequestId },
            select: ACTIVITY_LOG_SELECT,
            orderBy: { performed_at: 'asc' },
          })
        : Promise.resolve([]),
      // 3. Logs del pedido (siempre)
      prisma.maintenance_activity_log.findMany({
        where: { maintenance_order_id: orderId },
        select: ACTIVITY_LOG_SELECT,
        orderBy: { performed_at: 'asc' },
      }),
      // 4. Logs de TODAS las work_orders hijas (si hay)
      workOrderIds.length > 0
        ? prisma.maintenance_activity_log.findMany({
            where: { work_order_id: { in: workOrderIds } },
            select: ACTIVITY_LOG_SELECT,
            orderBy: { performed_at: 'asc' },
          })
        : Promise.resolve([]),
      // 5. Comentarios cargados sobre los items del pedido (ticket 649)
      getRequestItemComments(maintenanceRequestId),
    ]);

    // 4. Construir información del origen
    let origin: MaintenanceRequestOrigin | null = null;

    if (requestData) {
      if (requestData.source === 'manual' || !requestData.checklist_answer_id) {
        const creator = requestData.profile_maintenance_requests_user_idToprofile;
        origin = {
          type: 'manual',
          manualCreator: creator ? { id: creator.id, fullname: creator.fullname, email: creator.email } : null,
          createdAt: requestData.created_at?.toISOString() ?? null,
          driverEmployee: requestData.driver_employee ?? null,
        };
      } else {
        const answerData = requestData.checklist_answers?.answer_data as {
          fecha?: string;
          hora?: string;
          chofer?: string;
          kilometraje?: string;
        } | null;

        const checklistUser = requestData.checklist_answers?.profile;

        origin = {
          type: 'checklist',
          checklist: {
            id: requestData.checklist_answer_id,
            fecha: answerData?.fecha ?? null,
            hora: answerData?.hora ?? null,
            chofer: answerData?.chofer ?? null,
            kilometraje: answerData?.kilometraje ?? null,
            createdAt: requestData.checklist_answers?.created_at?.toISOString() ?? null,
            respondedBy: checklistUser
              ? { id: checklistUser.id, fullname: checklistUser.fullname, email: checklistUser.email }
              : null,
          },
          createdAt: requestData.created_at?.toISOString() ?? null,
          driverEmployee: requestData.driver_employee ?? null,
        };
      }
    }

    // 6. OM history = request + order logs (deduped, sorted) — sin events de WO
    const requestLogs = requestLogsRaw.map(mapActivityLogEntry);
    const orderLogs = orderLogsRaw.map(mapActivityLogEntry);
    const workOrderLogs = workOrderLogsRaw.map(mapActivityLogEntry);

    const omLogsMap = new Map<string, (typeof requestLogs)[number]>();
    for (const log of requestLogs) omLogsMap.set(log.id, log);
    for (const log of orderLogs) {
      if (!omLogsMap.has(log.id)) omLogsMap.set(log.id, log);
    }
    const omHistory = Array.from(omLogsMap.values()).sort(
      (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime()
    );

    // 7. Group WO logs by work_order_id
    const woHistoryByWoId = new Map<string, (typeof workOrderLogs)[number][]>();
    for (const log of workOrderLogs) {
      if (!log.work_order_id) continue;
      const arr = woHistoryByWoId.get(log.work_order_id) ?? [];
      arr.push(log);
      woHistoryByWoId.set(log.work_order_id, arr);
    }

    // 8. Build workOrders array
    const workOrders = workOrdersData.map((wo) => ({
      id: wo.id,
      orderNumber: wo.order_number,
      status: wo.status,
      plannedStartDate: wo.planned_start_date,
      plannedEndDate: wo.planned_end_date,
      sectorName: wo.workshop_sectors?.name ?? null,
      workshopName: wo.workshops?.name ?? null,
      isExternal: wo.workshops?.type === 'externo',
      history: woHistoryByWoId.get(wo.id) ?? [],
    }));

    return { origin, history: omHistory, workOrders, itemComments };
  } catch (error) {
    serverLogger.error('Error al obtener historial completo de pedido', { data: { error, orderId } });
    throw error;
  }
}

export type MaintenanceOrderFullActivityLog = Awaited<ReturnType<typeof getMaintenanceOrderFullActivityLog>>;

/**
 * Obtiene el historial de actividades de una orden de trabajo.
 */
export async function getWorkOrderActivityLog(workOrderId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.WORK_ORDER_REPAIRS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial de actividades de orden de trabajo', { data: { workOrderId } });

  try {
    const data = await prisma.maintenance_activity_log.findMany({
      where: { work_order_id: workOrderId },
      select: ACTIVITY_LOG_SELECT,
      orderBy: { performed_at: 'asc' },
    });

    return data.map(mapActivityLogEntry);
  } catch (error) {
    serverLogger.error('Error al obtener historial de actividades de orden de trabajo', {
      data: { error, workOrderId },
    });
    throw error;
  }
}

/**
 * Obtiene el historial COMPLETO de una orden de trabajo, incluyendo:
 * - El historial de la solicitud/pedido original (maintenance_order)
 * - El historial específico de la orden de trabajo
 * - Información de otras OTs derivadas de la misma solicitud
 */
export async function getWorkOrderFullActivityLog(workOrderId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.WORK_ORDER_REPAIRS);
  cacheLife({ revalidate: CACHE_TTL.PAGINATED_LIST });

  serverLogger.debug('Obteniendo historial completo de orden de trabajo', { data: { workOrderId } });

  try {
    // 1. Obtener la work_order con sus relaciones y el activity log de la WO en paralelo
    const [workOrder, workOrderLogsRaw] = await Promise.all([
      prisma.work_orders.findUnique({
        where: { id: workOrderId },
        select: {
          id: true,
          order_number: true,
          status: true,
          created_at: true,
          work_order_items: {
            select: {
              maintenance_order_item_id: true,
              maintenance_order_items: {
                select: {
                  maintenance_order_id: true,
                  maintenance_orders: {
                    select: {
                      id: true,
                      maintenance_request_id: true,
                      equipment_id: true,
                      vehicles: {
                        select: { domain: true, intern_number: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.maintenance_activity_log.findMany({
        where: { work_order_id: workOrderId },
        select: ACTIVITY_LOG_SELECT,
        orderBy: { performed_at: 'asc' },
      }),
    ]);

    if (!workOrder) {
      serverLogger.error('Orden de trabajo no encontrada', { data: { workOrderId } });
      throw new Error(`Orden de trabajo ${workOrderId} no encontrada`);
    }

    // Extraer IDs relevantes
    const maintenanceOrderId = workOrder.work_order_items[0]?.maintenance_order_items?.maintenance_order_id;
    const maintenanceRequestId =
      workOrder.work_order_items[0]?.maintenance_order_items?.maintenance_orders?.maintenance_request_id;

    // 2. Obtener logs del pedido, OTs hermanas y comentarios de los items en paralelo
    const [orderLogsRaw, siblingWorkOrdersRaw, itemComments] = await Promise.all([
      maintenanceOrderId
        ? prisma.maintenance_activity_log.findMany({
            where: { maintenance_order_id: maintenanceOrderId },
            select: ACTIVITY_LOG_SELECT,
            orderBy: { performed_at: 'asc' },
          })
        : Promise.resolve([]),
      maintenanceOrderId
        ? prisma.work_orders.findMany({
            where: {
              id: { not: workOrderId },
              work_order_items: {
                some: {
                  maintenance_order_items: {
                    maintenance_order_id: maintenanceOrderId,
                  },
                },
              },
            },
            select: { id: true, order_number: true, status: true },
          })
        : Promise.resolve([]),
      // Comentarios de los items del pedido del que cuelga esta OT (ticket 649)
      getRequestItemComments(maintenanceRequestId),
    ]);

    const orderLogs = orderLogsRaw.map(mapActivityLogEntry);
    const workOrderLogs = workOrderLogsRaw.map(mapActivityLogEntry);

    // 3. OTs hermanas — la query de Prisma ya filtra correctamente con `some`
    const siblingWorkOrders = siblingWorkOrdersRaw.map((wo) => ({
      id: wo.id,
      order_number: wo.order_number,
      status: wo.status as string,
    }));

    // 4. Combinar y marcar la fuente de cada registro
    const combinedHistory = [
      ...orderLogs.map((entry) => ({
        ...entry,
        source: 'order' as const,
        sourceLabel: 'Pedido de Mantenimiento',
      })),
      ...workOrderLogs.map((entry) => ({
        ...entry,
        source: 'work_order' as const,
        sourceLabel: `OT: ${workOrder.order_number}`,
      })),
    ].sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());

    return {
      history: combinedHistory,
      workOrder: {
        id: workOrder.id,
        orderNumber: workOrder.order_number,
        status: workOrder.status as string,
      },
      maintenanceOrderId,
      maintenanceRequestId,
      siblingWorkOrders,
      vehicleInfo: workOrder.work_order_items[0]?.maintenance_order_items?.maintenance_orders?.vehicles,
      itemComments,
    };
  } catch (error) {
    serverLogger.error('Error al obtener historial completo de orden de trabajo', { data: { error, workOrderId } });
    throw error;
  }
}

export type WorkOrderFullActivityLog = Awaited<ReturnType<typeof getWorkOrderFullActivityLog>>;

// ─── WRITEs ───────────────────────────────────────────────────────────────────

/**
 * Rechaza una operación y la devuelve al estado de pedido pendiente
 */
export async function rejectMaintenanceOperation(input: RejectOperationInput) {
  const profile = await requireServerAuthProfile();

  serverLogger.info('Rechazando operación', { data: { orderId: input.orderId, reason: input.reason } });

  try {
    const data = await prisma.maintenance_orders.update({
      where: { id: input.orderId },
      data: {
        status: 'pending_scheduling',
        // Resetear campos de programación a NULL
        scheduled_date: null,
        scheduled_by: null,
        scheduled_at: null,
        rejection_reason: input.reason,
        rejected_by: profile.id,
        rejected_at: new Date(),
      },
    });

    serverLogger.info('Operación rechazada, vuelve a pedido pendiente', { data: { orderId: input.orderId } });

    await invalidateCacheTags(INVALIDATION_MAP.rejectMaintenanceOperation);

    return data;
  } catch (error) {
    serverLogger.error('Error al rechazar operación', { data: { error, orderId: input.orderId } });
    throw error;
  }
}

/**
 * Aprueba la entrada al taller y actualiza el kilometraje y condición del equipo.
 * Usa transacción atómica para garantizar consistencia entre order y vehicle.
 */
export async function approveWorkshopEntry(input: ApproveWorkshopEntryInput) {
  const profile = await requireServerAuthProfile();

  serverLogger.info('Aprobando entrada a taller', { data: { orderId: input.orderId, kilometer: input.kilometer } });

  try {
    // Usar transacción para garantizar atomicidad entre update order + update vehicle
    const result = await prisma.$transaction(async (tx) => {
      // Obtener el pedido para saber el equipment_id
      const order = await tx.maintenance_orders.findUnique({
        where: { id: input.orderId },
        select: { equipment_id: true, other_equipment_id: true },
      });

      if (!order) {
        throw new Error(`Pedido ${input.orderId} no encontrado`);
      }

      // Actualizar el pedido
      await tx.maintenance_orders.update({
        where: { id: input.orderId },
        data: {
          status: 'in_workshop',
          workshop_entry_date: new Date(),
          workshop_approved_by: profile.id,
          kilometer_at_entry: input.kilometer,
        },
      });

      // Actualizar el recurso: condición a 'no_operativo' y kilometraje.
      // El pedido es de un vehículo o de un equipamiento (ticket 596); los
      // equipamientos no llevan kilometraje, solo cambian de condición.
      if (order.equipment_id) {
        await tx.vehicles.update({
          where: { id: order.equipment_id },
          data: {
            condition: 'no_operativo',
            kilometer: input.kilometer,
          },
        });
      } else if (order.other_equipment_id) {
        await tx.other_equipment.update({
          where: { id: order.other_equipment_id },
          data: { condition: 'no_operativo' },
        });
      }

      return { equipmentId: order.equipment_id ?? order.other_equipment_id };
    });

    serverLogger.info('Entrada a taller aprobada, equipo actualizado', {
      data: {
        orderId: input.orderId,
        equipmentId: result.equipmentId,
        kilometer: input.kilometer,
      },
    });

    await invalidateCacheTags(INVALIDATION_MAP.approveWorkshopEntry);

    return { success: true };
  } catch (error) {
    serverLogger.error('Error al aprobar entrada a taller', { data: { error, orderId: input.orderId } });
    throw error;
  }
}
