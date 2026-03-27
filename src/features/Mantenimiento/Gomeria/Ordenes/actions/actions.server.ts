'use server';

import type { DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import { calculatePositions } from '@/features/Mantenimiento/Gomeria/shared/tire-diagram-utils';
import type { TireOldDestination, TireServiceOrderStatus } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import {
  NULL_FILTER_VALUE,
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Mantenimiento/Gomeria/Ordenes');

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_ORDER_SELECT = {
  id: true,
  vehicle_id: true,
  trailer_vehicle_id: true,
  kilometer: true,
  service_date: true,
  status: true,
  created_by: true,
  created_at: true,
  closed_at: true,
  vehicle: { select: { id: true, domain: true, intern_number: true } },
  trailer: { select: { id: true, domain: true, intern_number: true } },
  creator: { select: { id: true, fullname: true } },
  _count: { select: { items: true } },
} as const;

const VALID_SORT_FIELDS = new Set([
  'service_date',
  'kilometer',
  'status',
  'created_at',
  'closed_at',
  'vehicle_id',
  'trailer_vehicle_id',
  'created_by',
]);

const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle_id: (dir) => ({ vehicle: { domain: dir } }),
  trailer_vehicle_id: (dir) => ({ trailer: { domain: dir } }),
  created_by: (dir) => ({ creator: { fullname: dir } }),
};

const TEXT_FILTER_COLUMNS = ['kilometer'];
const DATE_RANGE_COLUMNS = ['service_date', 'created_at'];

// ============================================================================
// INTERNAL WHERE BUILDER
// ============================================================================

function buildServiceOrdersWhereClause(state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['kilometer']);

  const filtersWhere = buildFiltersWhere(
    state.filters,
    {},
    {
      exclude: [...TEXT_FILTER_COLUMNS, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  const filtersWhereAndConditions = (filtersWhere.AND as Record<string, unknown>[] | undefined) ?? [];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhere as Record<string, unknown> & { AND?: unknown };

  return {
    ...searchWhere,
    ...filtersWhereWithoutAnd,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...(filtersWhereAndConditions.length > 0 ? { AND: filtersWhereAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getServiceOrdersPaginated(searchParams: DataTableSearchParams) {
  logger.debug('Fetching service orders paginated');

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildServiceOrdersWhereClause(state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.tire_service_orders.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: SERVICE_ORDER_SELECT,
      }),
      prisma.tire_service_orders.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error fetching service orders paginated', { data: { error } });
    throw new Error(
      `Error al obtener las órdenes de gomería: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================================
// EXPORT QUERY
// ============================================================================

export async function getServiceOrdersForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exporting service orders');

  try {
    const state = parseSearchParams(searchParams);
    const where = buildServiceOrdersWhereClause(state);

    const data = await prisma.tire_service_orders.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: SERVICE_ORDER_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error exporting service orders', { data: { error } });
    throw new Error('Error al exportar las órdenes de gomería');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, cross-filtering)
// ============================================================================

export async function getServiceOrderSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const baseWhere = {};

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildServiceOrdersWhereClause(modified);
  }

  function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      if (key == null) {
        map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        map.set(String(key), count);
      }
    }
    return map;
  }

  try {
    const where = crossWhere(columnId);

    // ── Enum: status ──────────────────────────────────────────────────────────
    if (columnId === 'status') {
      const rows = await prisma.tire_service_orders.groupBy({
        by: ['status'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.status as string, count: r._count }))),
      };
    }

    // ── FK UUID: vehicle_id ───────────────────────────────────────────────────
    if (columnId === 'vehicle_id') {
      const rows = await prisma.tire_service_orders.groupBy({
        by: ['vehicle_id'],
        where,
        _count: true,
      });
      const counts = toFacetMap(rows.map((r) => ({ key: r.vehicle_id, count: r._count })));
      const ids = rows.map((r) => r.vehicle_id).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? (
              await prisma.vehicles.findMany({
                where: { id: { in: ids } },
                select: { id: true, domain: true },
                orderBy: { domain: 'asc' },
              })
            ).map((v) => ({ id: v.id, name: v.domain }))
          : [];
      return { counts, resolvedOptions };
    }

    // ── FK UUID nullable: trailer_vehicle_id ──────────────────────────────────
    if (columnId === 'trailer_vehicle_id') {
      const rows = await prisma.tire_service_orders.groupBy({
        by: ['trailer_vehicle_id'],
        where,
        _count: true,
      });
      const counts = toFacetMap(rows.map((r) => ({ key: r.trailer_vehicle_id, count: r._count })));
      const ids = rows.map((r) => r.trailer_vehicle_id).filter((id): id is string => id != null);
      const resolvedOptions =
        ids.length > 0
          ? (
              await prisma.vehicles.findMany({
                where: { id: { in: ids } },
                select: { id: true, domain: true },
                orderBy: { domain: 'asc' },
              })
            ).map((v) => ({ id: v.id, name: v.domain }))
          : [];
      return { counts, resolvedOptions };
    }

    // ── FK UUID: created_by ───────────────────────────────────────────────────
    if (columnId === 'created_by') {
      const rows = await prisma.tire_service_orders.groupBy({
        by: ['created_by'],
        where,
        _count: true,
      });
      const counts = toFacetMap(rows.map((r) => ({ key: r.created_by, count: r._count })));
      const ids = rows.map((r) => r.created_by).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.profile.findMany({
              where: { id: { in: ids } },
              select: { id: true, fullname: true },
              orderBy: { fullname: 'asc' },
            })
          : [];
      return {
        counts,
        resolvedOptions: resolvedOptions.map((p) => ({ id: p.id, name: p.fullname })),
      };
    }

    logger.warn('getServiceOrderSingleFacet: unknown columnId', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error getting service order single facet', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// DETAIL QUERY
// ============================================================================

export async function getServiceOrderById(id: string) {
  logger.debug('Fetching service order by id', { data: { id } });

  try {
    const order = await prisma.tire_service_orders.findUnique({
      where: { id },
      include: {
        vehicle: { select: { id: true, domain: true, intern_number: true } },
        trailer: { select: { id: true, domain: true, intern_number: true } },
        creator: { select: { id: true, fullname: true } },
        items: {
          select: {
            id: true,
            position_number: true,
            action: true,
            old_tire_destination: true,
            tread_depth: true,
            pressure_start: true,
            pressure_end: true,
            observations: true,
            created_at: true,
            tire: {
              select: {
                id: true,
                serial_number: true,
                status: true,
                brand: { select: { id: true, name: true } },
                tire_type: { select: { id: true, size: true, tread_type: true } },
              },
            },
            new_tire: {
              select: {
                id: true,
                serial_number: true,
                brand: { select: { id: true, name: true } },
                tire_type: { select: { id: true, size: true, tread_type: true } },
              },
            },
          },
          orderBy: { position_number: 'asc' },
        },
      },
    });

    return order;
  } catch (error) {
    logger.error('Error fetching service order by id', { data: { error, id } });
    throw error;
  }
}

// ============================================================================
// CREATE SERVICE ORDER
// ============================================================================

export async function createServiceOrder(data: {
  vehicle_id: string;
  trailer_vehicle_id?: string | null;
  kilometer?: string | null;
  company_id: string;
}) {
  const profile = await requireServerAuthProfile();
  logger.debug('Creating service order', { data: { vehicle_id: data.vehicle_id } });

  try {
    const order = await prisma.tire_service_orders.create({
      data: {
        vehicle_id: data.vehicle_id,
        trailer_vehicle_id: data.trailer_vehicle_id ?? null,
        kilometer: data.kilometer ?? null,
        service_date: new Date(),
        created_by: profile.id,
        company_id: data.company_id,
      },
    });
    return order;
  } catch (error) {
    logger.error('Error creating service order', { data: { error } });
    throw error;
  }
}

// ============================================================================
// CLOSE SERVICE ORDER
// ============================================================================

export async function closeServiceOrder(id: string) {
  logger.debug('Closing service order', { data: { id } });

  try {
    const order = await prisma.tire_service_orders.update({
      where: { id },
      data: {
        status: 'CLOSED' as TireServiceOrderStatus,
        closed_at: new Date(),
      },
    });
    return order;
  } catch (error) {
    logger.error('Error closing service order', { data: { error, id } });
    throw error;
  }
}

// ============================================================================
// CANCEL SERVICE ORDER
// ============================================================================

export async function cancelServiceOrder(id: string) {
  logger.debug('Cancelling service order', { data: { id } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the order and verify it's OPEN
      const order = await tx.tire_service_orders.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }
      if (order.status !== 'OPEN') {
        throw new Error('Solo se pueden cancelar órdenes en estado Abierta');
      }

      // 2. Fetch all service items
      const items = await tx.tire_service_items.findMany({
        where: { service_order_id: id },
        orderBy: { created_at: 'desc' },
      });

      // 3. Check if any item has old_tire_destination = DISCARD
      const hasDiscardedTires = items.some((item) => item.old_tire_destination === ('DISCARD' as TireOldDestination));
      if (hasDiscardedTires) {
        throw new Error('No se puede cancelar: la orden contiene cubiertas descartadas');
      }

      // 4. Reverse items in reverse chronological order (already sorted desc by created_at)
      for (const item of items) {
        if (item.action === 'CALIBRATE') {
          // No status to reverse for calibration
          continue;
        }

        if (item.action === 'REPLACE') {
          // Reverse new tire back to AVAILABLE
          if (item.new_tire_id) {
            await tx.tires.update({
              where: { id: item.new_tire_id },
              data: { status: 'AVAILABLE' },
            });
          }

          // Reverse old tire back to INSTALLED (if it was moved out)
          if (item.tire_id && (item.old_tire_destination === 'AVAILABLE' || item.old_tire_destination === 'REPAIR')) {
            await tx.tires.update({
              where: { id: item.tire_id },
              data: { status: 'INSTALLED' },
            });
            // Restore the position
            await tx.vehicle_tire_positions.updateMany({
              where: {
                vehicle_id: item.vehicle_id,
                position_number: item.position_number,
              },
              data: { tire_id: item.tire_id },
            });
          }
        }

        if (item.action === 'REPAIR') {
          // Reverse new tire back to AVAILABLE
          if (item.new_tire_id) {
            await tx.tires.update({
              where: { id: item.new_tire_id },
              data: { status: 'AVAILABLE' },
            });
          }
          // Reverse old tire back to INSTALLED and restore position
          if (item.tire_id) {
            await tx.tires.update({
              where: { id: item.tire_id },
              data: { status: 'INSTALLED' },
            });
            await tx.vehicle_tire_positions.updateMany({
              where: {
                vehicle_id: item.vehicle_id,
                position_number: item.position_number,
              },
              data: { tire_id: item.tire_id },
            });
          }
        }

        // Initial assign: tire_id is null in item, new_tire was placed for the first time
        if (!item.tire_id && item.new_tire_id) {
          await tx.tires.update({
            where: { id: item.new_tire_id },
            data: { status: 'AVAILABLE' },
          });
          await tx.vehicle_tire_positions.updateMany({
            where: {
              vehicle_id: item.vehicle_id,
              position_number: item.position_number,
            },
            data: { tire_id: null },
          });
        }
      }

      // 5. Delete the order (cascades to items)
      await tx.tire_service_orders.delete({ where: { id } });

      return { success: true };
    });

    return result;
  } catch (error) {
    logger.error('Error cancelling service order', { data: { error, id } });
    throw error;
  }
}

// ============================================================================
// GET VEHICLE TIRE POSITIONS
// ============================================================================

export async function getVehicleTirePositions(vehicleId: string) {
  logger.debug('Fetching vehicle tire positions', { data: { vehicleId } });

  try {
    const positions = await prisma.vehicle_tire_positions.findMany({
      where: { vehicle_id: vehicleId },
      include: {
        tire: {
          select: {
            id: true,
            serial_number: true,
            is_new: true,
            retread_level: true,
            tread_depth: true,
            status: true,
            brand: { select: { id: true, name: true } },
            tire_type: { select: { id: true, size: true, tread_type: true } },
          },
        },
        template_axle: {
          select: {
            id: true,
            axle_number: true,
            tires_per_side: true,
            tire_size: true,
            is_drive_axle: true,
            is_spare: true,
          },
        },
      },
      orderBy: { position_number: 'asc' },
    });
    return positions;
  } catch (error) {
    logger.error('Error fetching vehicle tire positions', { data: { error, vehicleId } });
    throw error;
  }
}

// ============================================================================
// GET AVAILABLE TIRES FOR AXLE
// ============================================================================

export async function getAvailableTiresForAxle(tireSize: string) {
  logger.debug('Fetching available tires for axle', { data: { tireSize } });

  try {
    const tires = await prisma.tires.findMany({
      where: {
        status: { in: ['AVAILABLE', 'MISSING'] },
        is_active: true,
        tire_type: { size: tireSize },
      },
      select: {
        id: true,
        serial_number: true,
        status: true,
        is_new: true,
        retread_level: true,
        tread_depth: true,
        brand: { select: { id: true, name: true } },
        tire_type: { select: { id: true, size: true, tread_type: true } },
      },
      orderBy: [{ status: 'asc' }, { serial_number: 'asc' }],
    });
    return tires;
  } catch (error) {
    logger.error('Error fetching available tires for axle', { data: { error, tireSize } });
    throw error;
  }
}

// ============================================================================
// CALIBRATE
// ============================================================================

export async function performCalibration(data: {
  serviceOrderId: string;
  positionNumber: number;
  vehicleId: string;
  tireId: string;
  treadDepth?: number;
  pressureStart?: number;
  pressureEnd?: number;
  observations?: string;
}) {
  logger.debug('Performing calibration', {
    data: { serviceOrderId: data.serviceOrderId, positionNumber: data.positionNumber },
  });

  try {
    // Assert: tire exists at this position and matches tireId
    const position = await prisma.vehicle_tire_positions.findFirst({
      where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
    });
    if (!position) {
      throw new Error(`Posición ${data.positionNumber} no encontrada para el vehículo`);
    }
    if (position.tire_id !== data.tireId) {
      throw new Error(`La cubierta en la posición ${data.positionNumber} no coincide con la cubierta esperada`);
    }

    // Create service item
    await prisma.tire_service_items.create({
      data: {
        service_order_id: data.serviceOrderId,
        position_number: data.positionNumber,
        vehicle_id: data.vehicleId,
        action: 'CALIBRATE',
        tire_id: data.tireId,
        tread_depth: data.treadDepth != null ? String(data.treadDepth) : null,
        pressure_start: data.pressureStart != null ? String(data.pressureStart) : null,
        pressure_end: data.pressureEnd != null ? String(data.pressureEnd) : null,
        observations: data.observations ?? null,
      },
    });

    // Update tread_depth on the tire if provided
    if (data.treadDepth != null) {
      await prisma.tires.update({
        where: { id: data.tireId },
        data: { tread_depth: String(data.treadDepth) },
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error performing calibration', { data: { error } });
    throw error;
  }
}

// ============================================================================
// REPAIR (atomic: old → IN_REPAIR, new → INSTALLED)
// ============================================================================

export async function performRepair(data: {
  serviceOrderId: string;
  positionNumber: number;
  vehicleId: string;
  tireId: string;
  newTireId: string;
  observations?: string;
}) {
  logger.debug('Performing repair', {
    data: { serviceOrderId: data.serviceOrderId, positionNumber: data.positionNumber },
  });

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Assert old tire matches the position
      const position = await tx.vehicle_tire_positions.findFirst({
        where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
      });
      if (!position) {
        throw new Error(`Posición ${data.positionNumber} no encontrada`);
      }
      if (position.tire_id !== data.tireId) {
        throw new Error(`La cubierta en la posición ${data.positionNumber} no coincide con la cubierta esperada`);
      }

      // 2. Assert new tire is AVAILABLE or MISSING
      const newTire = await tx.tires.findUnique({ where: { id: data.newTireId } });
      if (!newTire) throw new Error('Cubierta de reemplazo no encontrada');
      if (newTire.status !== 'AVAILABLE' && newTire.status !== 'MISSING') {
        throw new Error(
          `La cubierta de reemplazo (${newTire.serial_number}) no está disponible — estado actual: ${newTire.status}`
        );
      }

      // 3. Old tire → IN_REPAIR
      await tx.tires.update({
        where: { id: data.tireId },
        data: { status: 'IN_REPAIR' },
      });

      // 4. New tire → INSTALLED
      await tx.tires.update({
        where: { id: data.newTireId },
        data: { status: 'INSTALLED' },
      });

      // 5. Update position → new tire
      await tx.vehicle_tire_positions.updateMany({
        where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
        data: { tire_id: data.newTireId },
      });

      // 6. Create service item
      await tx.tire_service_items.create({
        data: {
          service_order_id: data.serviceOrderId,
          position_number: data.positionNumber,
          vehicle_id: data.vehicleId,
          action: 'REPAIR',
          tire_id: data.tireId,
          new_tire_id: data.newTireId,
          observations: data.observations ?? null,
        },
      });
    });

    return { success: true };
  } catch (error) {
    logger.error('Error performing repair', { data: { error } });
    throw error;
  }
}

// ============================================================================
// REPLACE (atomic: handle old tire destination, new tire → INSTALLED)
// ============================================================================

export async function performReplace(data: {
  serviceOrderId: string;
  positionNumber: number;
  vehicleId: string;
  tireId: string | null; // null for initial assign (empty position)
  newTireId: string;
  oldDestination?: 'AVAILABLE' | 'DISCARD' | 'REPAIR';
  discardPhotoUrl?: string;
  discardComment?: string;
  treadDepth?: number;
  pressureStart?: number;
  pressureEnd?: number;
  observations?: string;
}) {
  logger.debug('Performing replace', {
    data: { serviceOrderId: data.serviceOrderId, positionNumber: data.positionNumber },
  });

  try {
    await prisma.$transaction(async (tx) => {
      if (data.tireId !== null) {
        // 1. Assert old tire matches the position
        const position = await tx.vehicle_tire_positions.findFirst({
          where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
        });
        if (!position) {
          throw new Error(`Posición ${data.positionNumber} no encontrada`);
        }
        if (position.tire_id !== data.tireId) {
          throw new Error(`La cubierta en la posición ${data.positionNumber} no coincide con la cubierta esperada`);
        }

        // 2. Handle old tire destination
        if (data.oldDestination === 'AVAILABLE') {
          await tx.tires.update({
            where: { id: data.tireId },
            data: { status: 'AVAILABLE' },
          });
        } else if (data.oldDestination === 'DISCARD') {
          await tx.tires.update({
            where: { id: data.tireId },
            data: {
              status: 'DISCARDED',
              discard_photo: data.discardPhotoUrl ?? null,
              discard_comment: data.discardComment ?? null,
              discarded_at: new Date(),
            },
          });
        } else if (data.oldDestination === 'REPAIR') {
          await tx.tires.update({
            where: { id: data.tireId },
            data: { status: 'IN_REPAIR' },
          });
        }
      }

      // 3. Assert new tire is AVAILABLE or MISSING
      const newTire = await tx.tires.findUnique({ where: { id: data.newTireId } });
      if (!newTire) throw new Error('Cubierta de reemplazo no encontrada');
      if (newTire.status !== 'AVAILABLE' && newTire.status !== 'MISSING') {
        throw new Error(
          `La cubierta de reemplazo (${newTire.serial_number}) no está disponible — estado actual: ${newTire.status}`
        );
      }

      // 4. New tire → INSTALLED
      await tx.tires.update({
        where: { id: data.newTireId },
        data: {
          status: 'INSTALLED',
          ...(data.treadDepth != null ? { tread_depth: String(data.treadDepth) } : {}),
        },
      });

      // 5. Update position → new tire
      await tx.vehicle_tire_positions.updateMany({
        where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
        data: { tire_id: data.newTireId },
      });

      // 6. Create service item
      const oldDestPrisma = data.oldDestination as TireOldDestination | undefined;
      await tx.tire_service_items.create({
        data: {
          service_order_id: data.serviceOrderId,
          position_number: data.positionNumber,
          vehicle_id: data.vehicleId,
          action: 'REPLACE',
          tire_id: data.tireId,
          new_tire_id: data.newTireId,
          old_tire_destination: oldDestPrisma ?? null,
          tread_depth: data.treadDepth != null ? String(data.treadDepth) : null,
          pressure_start: data.pressureStart != null ? String(data.pressureStart) : null,
          pressure_end: data.pressureEnd != null ? String(data.pressureEnd) : null,
          observations: data.observations ?? null,
        },
      });
    });

    return { success: true };
  } catch (error) {
    logger.error('Error performing replace', { data: { error } });
    throw error;
  }
}

// ============================================================================
// MISSING REPORT (mark tire as missing, clear position)
// ============================================================================

export async function performMissingReport(data: {
  serviceOrderId: string;
  positionNumber: number;
  vehicleId: string;
  tireId: string;
  observations?: string;
}) {
  logger.debug('Performing missing report', {
    data: { serviceOrderId: data.serviceOrderId, positionNumber: data.positionNumber, tireId: data.tireId },
  });

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Assert tire matches the position
      const position = await tx.vehicle_tire_positions.findFirst({
        where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
      });
      if (!position) {
        throw new Error(`Posición ${data.positionNumber} no encontrada`);
      }
      if (position.tire_id !== data.tireId) {
        throw new Error(`La cubierta en la posición ${data.positionNumber} no coincide con la cubierta esperada`);
      }

      // 2. Mark tire as MISSING
      await tx.tires.update({
        where: { id: data.tireId },
        data: { status: 'MISSING' },
      });

      // 3. Clear the position (tire_id = null)
      await tx.vehicle_tire_positions.updateMany({
        where: { vehicle_id: data.vehicleId, position_number: data.positionNumber },
        data: { tire_id: null },
      });

      // 4. Create service item record
      await tx.tire_service_items.create({
        data: {
          service_order_id: data.serviceOrderId,
          position_number: data.positionNumber,
          vehicle_id: data.vehicleId,
          action: 'MISSING_REPORT',
          tire_id: data.tireId,
          new_tire_id: null,
          observations: data.observations ?? null,
        },
      });
    });

    return { success: true };
  } catch (error) {
    logger.error('Error performing missing report', { data: { error } });
    throw error;
  }
}

// ============================================================================
// SEARCH VEHICLE BY DOMAIN
// ============================================================================

export async function searchVehicleByDomain(domain: string, companyId: string) {
  logger.debug('Searching vehicle by domain', { data: { domain, companyId } });

  try {
    const vehicles = await prisma.vehicles.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        domain: { contains: domain, mode: 'insensitive' },
      },
      select: {
        id: true,
        domain: true,
        intern_number: true,
        type: true,
        sub_type: {
          select: {
            id: true,
            tire_template_id: true,
          },
        },
      },
      take: 10,
    });

    return vehicles.map((v) => ({
      id: v.id,
      domain: v.domain,
      intern_number: v.intern_number,
      tire_template_id: v.sub_type?.tire_template_id ?? null,
      sub_type_id: v.sub_type?.id ?? null,
      type_id: v.type ?? null,
    }));
  } catch (error) {
    logger.error('Error searching vehicle by domain', { data: { error, domain } });
    throw error;
  }
}

/**
 * Get vehicle type info (is_tractor_unit, has_hitch) for hitch UI visibility
 */
export async function getVehicleTypeInfo(vehicleId: string) {
  logger.debug('Getting vehicle type info', { data: { vehicleId } });

  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      select: {
        type_vehicles_typeTotype: {
          select: {
            id: true,
            name: true,
            is_tractor_unit: true,
            has_hitch: true,
          },
        },
      },
    });

    if (!vehicle?.type_vehicles_typeTotype) return null;

    const vType = vehicle.type_vehicles_typeTotype;
    return {
      id: vType.id,
      name: vType.name,
      is_tractor_unit: vType.is_tractor_unit ?? false,
      has_hitch: vType.has_hitch ?? false,
    };
  } catch (error) {
    logger.error('Error getting vehicle type info', { data: { error, vehicleId } });
    return null;
  }
}

/**
 * Search compatible hitch vehicles for a given tractor unit.
 * Uses type_hitch_types junction table to filter by compatible types.
 */
export async function searchCompatibleHitchVehicles(tractorId: string, domain: string, companyId: string) {
  logger.debug('Searching compatible hitch vehicles', { data: { tractorId, domain, companyId } });

  try {
    // 1. Get the tractor's type
    const tractor = await prisma.vehicles.findUnique({
      where: { id: tractorId },
      select: {
        type_vehicles_typeTotype: {
          select: { id: true, is_tractor_unit: true, has_hitch: true },
        },
      },
    });

    if (!tractor?.type_vehicles_typeTotype?.is_tractor_unit || !tractor.type_vehicles_typeTotype.has_hitch) {
      return [];
    }

    // 2. Get compatible type IDs from type_hitch_types
    const hitchTypes = await prisma.type_hitch_types.findMany({
      where: { type_id: tractor.type_vehicles_typeTotype.id },
      select: { compatible_type_id: true },
    });

    if (hitchTypes.length === 0) return [];

    const compatibleTypeIds = hitchTypes.map((ht) => ht.compatible_type_id);

    // 3. Search vehicles of compatible types, filtered by domain
    const vehicles = await prisma.vehicles.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        type: { in: compatibleTypeIds },
        id: { not: tractorId },
        ...(domain.trim().length > 0 ? { domain: { contains: domain, mode: 'insensitive' as const } } : {}),
      },
      select: {
        id: true,
        domain: true,
        intern_number: true,
        type: true,
        sub_type: {
          select: {
            id: true,
            tire_template_id: true,
          },
        },
      },
      take: 10,
      orderBy: { domain: 'asc' },
    });

    return vehicles.map((v) => ({
      id: v.id,
      domain: v.domain,
      intern_number: v.intern_number,
      tire_template_id: v.sub_type?.tire_template_id ?? null,
      sub_type_id: v.sub_type?.id ?? null,
      type_id: v.type ?? null,
    }));
  } catch (error) {
    logger.error('Error searching compatible hitch vehicles', { data: { error, tractorId, domain } });
    return [];
  }
}

// ============================================================================
// ENSURE VEHICLE TIRE POSITIONS (lazy generation)
// ============================================================================

/**
 * Ensures a vehicle has tire positions generated from its sub_type's template.
 * Idempotent: if positions already exist, returns them immediately.
 * If positions are missing, generates them from the sub_type's tire_template.
 */
export async function ensureVehicleTirePositions(vehicleId: string) {
  logger.debug('Ensuring vehicle tire positions', { data: { vehicleId } });

  try {
    // 1. Check if vehicle already has positions
    const existingPositions = await prisma.vehicle_tire_positions.findMany({
      where: { vehicle_id: vehicleId },
      include: {
        tire: {
          select: {
            id: true,
            serial_number: true,
            is_new: true,
            retread_level: true,
            tread_depth: true,
            status: true,
            brand: { select: { id: true, name: true } },
            tire_type: { select: { id: true, size: true, tread_type: true } },
          },
        },
        template_axle: {
          select: {
            id: true,
            axle_number: true,
            tires_per_side: true,
            tire_size: true,
            is_drive_axle: true,
            is_spare: true,
          },
        },
      },
      orderBy: { position_number: 'asc' },
    });

    if (existingPositions.length > 0) {
      return existingPositions;
    }

    // 2. No positions — need to generate from sub_type's template
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        sub_type: {
          select: {
            id: true,
            tire_template_id: true,
          },
        },
      },
    });

    if (!vehicle?.sub_type?.tire_template_id) {
      throw new Error('El subtipo de este equipo no tiene plantilla de cubiertas asignada');
    }

    const templateId = vehicle.sub_type.tire_template_id;

    // 3. Load template axles
    const templateAxles = await prisma.tire_template_axles.findMany({
      where: { template_id: templateId },
      orderBy: { axle_number: 'asc' },
    });

    if (templateAxles.length === 0) {
      throw new Error('La plantilla del subtipo no tiene ejes configurados');
    }

    // 4. Calculate positions using TireDiagramRenderer logic
    const diagramAxles: DiagramAxle[] = templateAxles.map((axle) => ({
      id: axle.id,
      axle_number: axle.axle_number,
      tires_per_side: axle.tires_per_side,
      tire_size: axle.tire_size,
      is_drive_axle: axle.is_drive_axle,
      is_spare: axle.is_spare,
    }));

    const computedPositions = calculatePositions(diagramAxles);

    // 5. Create vehicle_tire_positions (all tire_id = null)
    if (computedPositions.length > 0) {
      const axleIdByNumber = new Map(templateAxles.map((a) => [a.axle_number, a.id]));

      await prisma.vehicle_tire_positions.createMany({
        data: computedPositions.map((pos) => ({
          vehicle_id: vehicleId,
          template_axle_id: axleIdByNumber.get(pos.axle_number)!,
          position_number: pos.position_number,
          axle_number: pos.axle_number,
          side: pos.side,
          tire_id: null,
        })),
      });
    }

    // 6. Re-fetch with full includes and return
    const newPositions = await prisma.vehicle_tire_positions.findMany({
      where: { vehicle_id: vehicleId },
      include: {
        tire: {
          select: {
            id: true,
            serial_number: true,
            is_new: true,
            retread_level: true,
            tread_depth: true,
            status: true,
            brand: { select: { id: true, name: true } },
            tire_type: { select: { id: true, size: true, tread_type: true } },
          },
        },
        template_axle: {
          select: {
            id: true,
            axle_number: true,
            tires_per_side: true,
            tire_size: true,
            is_drive_axle: true,
            is_spare: true,
          },
        },
      },
      orderBy: { position_number: 'asc' },
    });

    logger.info('Generated tire positions for vehicle', {
      data: { vehicleId, count: newPositions.length, templateId },
    });

    return newPositions;
  } catch (error) {
    logger.error('Error ensuring vehicle tire positions', { data: { error, vehicleId } });
    throw error;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type ServiceOrderListItem = Awaited<ReturnType<typeof getServiceOrdersPaginated>>['data'][number];

export type ServiceOrderDetail = Awaited<ReturnType<typeof getServiceOrderById>>;

export type VehicleTirePosition = Awaited<ReturnType<typeof getVehicleTirePositions>>[number];

export type AvailableTire = Awaited<ReturnType<typeof getAvailableTiresForAxle>>[number];

export type VehicleSearchResult = Awaited<ReturnType<typeof searchVehicleByDomain>>[number];

export type EnsuredTirePosition = Awaited<ReturnType<typeof ensureVehicleTirePositions>>[number];
