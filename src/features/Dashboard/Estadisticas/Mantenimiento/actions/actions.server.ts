'use server';

import {
  contract_type_vehicles_enum,
  daily_report_status,
  repair_state,
  work_order_status,
} from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';
import type {
  MaintenanceMonthSummary,
  MaintenanceTypeOption,
  MaintenanceVehicle,
  OwnershipCategory,
  VehicleStatus,
  WorkdaysAggregate,
} from '../types';

const logger = new Logger('Dashboard/Estadisticas/Mantenimiento');

// ============================================================================
// CONSTANTES INTERNAS
// ============================================================================

// Mapeo de contract_type del enum a las 3 categorias del dashboard.
// Prendado se agrupa con Leasing por decision de negocio.
const CATEGORY_BY_CONTRACT_TYPE: Record<contract_type_vehicles_enum, OwnershipCategory> = {
  Propio: 'Propios',
  Leasing: 'Leasing',
  Prendado: 'Leasing',
  Alquiler: 'Contratados',
};

const CONTRACT_TYPES_BY_CATEGORY: Record<OwnershipCategory, contract_type_vehicles_enum[]> = {
  Propios: ['Propio'],
  Leasing: ['Leasing', 'Prendado'],
  Contratados: ['Alquiler'],
};

// Estados terminales de los workflows. Todo lo no terminal cuenta como "abierto".
const TERMINAL_REQUEST_STATUSES = ['rejected', 'completed', 'cancelled'];
const TERMINAL_ORDER_STATUSES = ['cancelled', 'completed'];
const TERMINAL_REPAIR_STATES: repair_state[] = [
  repair_state.Finalizado,
  repair_state.Rechazado,
  repair_state.Cancelado,
];
const TERMINAL_WORK_ORDER_STATUSES: work_order_status[] = [
  work_order_status.completed,
  work_order_status.cancelled,
  work_order_status.completed_partial,
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcula los dias calendario transcurridos del mes:
 * - Mes en curso → dias del 1 a hoy (inclusivo)
 * - Mes pasado  → dias totales del mes
 * - Mes futuro  → 0
 */
function computeDaysElapsed(monthStart: moment.Moment): number {
  const today = moment().startOf('day');
  if (monthStart.isAfter(today, 'month')) return 0;
  if (monthStart.isBefore(today, 'month')) return monthStart.daysInMonth();
  return today.date();
}

function emptyTypeMap(): Record<OwnershipCategory, Map<string, string>> {
  return { Propios: new Map(), Leasing: new Map(), Contratados: new Map() };
}

function toSortedOptions(m: Map<string, string>): MaintenanceTypeOption[] {
  return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// SUMMARY (liviano — se carga upfront)
// ============================================================================

/**
 * Devuelve los datos LIVIANOS del dashboard de mantenimiento para el mes:
 * counts por categoria, tipos disponibles por categoria, counts por condicion.
 * NO incluye la lista de vehiculos ni dias trabajados — eso se pide on-demand
 * con `getMaintenanceCategoryVehicles` cuando se abre cada acordeon.
 */
export async function getMaintenanceMonthSummary(monthKey: string): Promise<MaintenanceMonthSummary> {
  const companyId = await getServerCompanyId();
  logger.debug('Fetching maintenance month summary', { data: { companyId, monthKey } });

  try {
    const monthStart = moment(monthKey, 'YYYY-MM').startOf('month');
    if (!monthStart.isValid()) {
      throw new Error(`Invalid monthKey: ${monthKey}`);
    }

    const monthEnd = monthStart.clone().add(1, 'month').startOf('month');
    const daysElapsed = computeDaysElapsed(monthStart);

    const baseWhere = {
      company_id: companyId,
      is_active: true,
      type_of_contract: { not: null },
    } as const;

    const [vehiclesLight, workedRelations, oldestReport] = await Promise.all([
      // Trae lo necesario para counts + types + condicion por categoria
      prisma.vehicles.findMany({
        where: baseWhere,
        select: {
          id: true,
          condition: true,
          type_of_contract: true,
          type_vehicles_typeTotype: { select: { id: true, name: true } },
        },
      }),
      // Para workdays globales: trae todas las relaciones dailyreport↔vehiculo
      // del mes (cualquier categoria). Luego agrupamos en memoria por categoria.
      prisma.dailyreportequipmentrelations.findMany({
        where: {
          equipment_id: { not: null },
          vehicles: { company_id: companyId, is_active: true, type_of_contract: { not: null } },
          dailyreportrows: {
            status: { not: daily_report_status.cancelado },
            dailyreport: {
              company_id: companyId,
              is_active: true,
              date: { gte: monthStart.toDate(), lt: monthEnd.toDate() },
            },
          },
        },
        select: {
          equipment_id: true,
          dailyreportrows: { select: { dailyreport: { select: { date: true } } } },
        },
      }),
      prisma.dailyreport.findFirst({
        where: { company_id: companyId, is_active: true },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
    ]);

    // Estructura inicial vacia (helpers)
    const emptyConditionCounts = (): Record<VehicleStatus, number> => ({
      operativo: 0,
      operativo_condicionado: 0,
      en_preparacion: 0,
      no_operativo: 0,
      en_reparacion: 0,
    });

    // Counts, tipos y conditionCountsByCategory en una sola pasada
    const countsByCategory: Record<OwnershipCategory, number> = { Propios: 0, Leasing: 0, Contratados: 0 };
    const typesPerCat = emptyTypeMap();
    const conditionCountsByCategory: Record<OwnershipCategory, Record<VehicleStatus, number>> = {
      Propios: emptyConditionCounts(),
      Leasing: emptyConditionCounts(),
      Contratados: emptyConditionCounts(),
    };
    // Index vehicle id → categoria, para mapear los workedDays luego
    const categoryByVehicleId = new Map<string, OwnershipCategory>();

    for (const v of vehiclesLight) {
      const cat = CATEGORY_BY_CONTRACT_TYPE[v.type_of_contract!];
      countsByCategory[cat] += 1;
      categoryByVehicleId.set(v.id, cat);

      const t = v.type_vehicles_typeTotype;
      if (t?.id && t?.name) typesPerCat[cat].set(t.id, t.name);

      // condition es nullable; default operativo (mismo criterio que en el detail action)
      const status = (v.condition as VehicleStatus | null) ?? 'operativo';
      if (status in conditionCountsByCategory[cat]) {
        conditionCountsByCategory[cat][status] += 1;
      }
    }

    // Fechas unicas trabajadas por vehiculo, luego sumadas por categoria
    const daysByVehicle = new Map<string, Set<string>>();
    for (const rel of workedRelations) {
      const vehicleId = rel.equipment_id;
      const date = rel.dailyreportrows?.dailyreport?.date;
      if (!vehicleId || !date) continue;
      const key = moment(date).format('YYYY-MM-DD');
      let set = daysByVehicle.get(vehicleId);
      if (!set) {
        set = new Set();
        daysByVehicle.set(vehicleId, set);
      }
      set.add(key);
    }

    const workdaysByCategory: Record<OwnershipCategory, WorkdaysAggregate> = {
      Propios: { worked: 0, possible: countsByCategory.Propios * daysElapsed },
      Leasing: { worked: 0, possible: countsByCategory.Leasing * daysElapsed },
      Contratados: { worked: 0, possible: countsByCategory.Contratados * daysElapsed },
    };
    for (const [vehicleId, dates] of daysByVehicle) {
      const cat = categoryByVehicleId.get(vehicleId);
      if (!cat) continue;
      // Cap a daysElapsed: si se cargaron dias futuros, no inflan el worked.
      workdaysByCategory[cat].worked += Math.min(dates.size, daysElapsed);
    }

    return {
      month: monthStart.format('YYYY-MM'),
      daysElapsed,
      daysInMonth: monthStart.daysInMonth(),
      countsByCategory,
      typesByCategory: {
        Propios: toSortedOptions(typesPerCat.Propios),
        Leasing: toSortedOptions(typesPerCat.Leasing),
        Contratados: toSortedOptions(typesPerCat.Contratados),
      },
      conditionCountsByCategory,
      workdaysByCategory,
      earliestMonth: oldestReport ? moment(oldestReport.date).startOf('month').format('YYYY-MM') : null,
    };
  } catch (error) {
    logger.error('Error fetching maintenance month summary', { data: { error, monthKey } });
    throw error;
  }
}

// ============================================================================
// PER-CATEGORY DETAIL (pesado — se carga lazy al abrir cada acordeon)
// ============================================================================

/**
 * Devuelve los vehiculos detallados de UNA categoria para el mes dado:
 * - status (derivado de condition)
 * - workedDays (fechas unicas en daily reports del mes)
 * - workflows abiertos (counts de solicitudes, ordenes, reparaciones, work orders)
 */
export async function getMaintenanceCategoryVehicles(
  monthKey: string,
  category: OwnershipCategory
): Promise<MaintenanceVehicle[]> {
  const companyId = await getServerCompanyId();
  logger.debug('Fetching maintenance category vehicles', { data: { companyId, monthKey, category } });

  try {
    const monthStart = moment(monthKey, 'YYYY-MM').startOf('month');
    if (!monthStart.isValid()) {
      throw new Error(`Invalid monthKey: ${monthKey}`);
    }
    const monthEnd = monthStart.clone().add(1, 'month').startOf('month');
    const contractTypes = CONTRACT_TYPES_BY_CATEGORY[category];

    const [vehiclesRaw, equipmentRelations] = await Promise.all([
      prisma.vehicles.findMany({
        where: {
          company_id: companyId,
          is_active: true,
          type_of_contract: { in: contractTypes },
        },
        select: {
          id: true,
          domain: true,
          condition: true,
          type_of_contract: true,
          type_vehicles_typeTotype: { select: { id: true, name: true } },
          sub_type: { select: { id: true, name: true } },
          brand_vehicles: { select: { name: true } },
          model_vehicles: { select: { name: true } },
          _count: {
            select: {
              maintenance_requests: { where: { status: { notIn: TERMINAL_REQUEST_STATUSES } } },
              maintenance_orders: { where: { status: { notIn: TERMINAL_ORDER_STATUSES } } },
              repair_solicitudes: { where: { state: { notIn: TERMINAL_REPAIR_STATES } } },
              work_orders: { where: { status: { notIn: TERMINAL_WORK_ORDER_STATUSES } } },
            },
          },
        },
        orderBy: { domain: 'asc' },
      }),
      prisma.dailyreportequipmentrelations.findMany({
        where: {
          equipment_id: { not: null },
          vehicles: {
            company_id: companyId,
            is_active: true,
            type_of_contract: { in: contractTypes },
          },
          dailyreportrows: {
            status: { not: daily_report_status.cancelado },
            dailyreport: {
              company_id: companyId,
              is_active: true,
              date: { gte: monthStart.toDate(), lt: monthEnd.toDate() },
            },
          },
        },
        select: {
          equipment_id: true,
          dailyreportrows: { select: { dailyreport: { select: { date: true } } } },
        },
      }),
    ]);

    // Fechas unicas trabajadas por equipment_id
    const daysByVehicle = new Map<string, Set<string>>();
    for (const rel of equipmentRelations) {
      const vehicleId = rel.equipment_id;
      const date = rel.dailyreportrows?.dailyreport?.date;
      if (!vehicleId || !date) continue;
      const key = moment(date).format('YYYY-MM-DD');
      let set = daysByVehicle.get(vehicleId);
      if (!set) {
        set = new Set();
        daysByVehicle.set(vehicleId, set);
      }
      set.add(key);
    }

    // Mapear al shape final
    const vehicles: MaintenanceVehicle[] = vehiclesRaw.map((v) => {
      const requests = v._count.maintenance_requests;
      const orders = v._count.maintenance_orders;
      const repairs = v._count.repair_solicitudes;
      const workOrders = v._count.work_orders;
      // condition es nullable pero por defecto es 'operativo'. Si llega null, asumimos operativo.
      const status: VehicleStatus = (v.condition as VehicleStatus | null) ?? 'operativo';
      return {
        id: v.id,
        domain: v.domain,
        brand: v.brand_vehicles?.name ?? null,
        model: v.model_vehicles?.name ?? null,
        category,
        typeId: v.type_vehicles_typeTotype?.id ?? null,
        typeName: v.type_vehicles_typeTotype?.name ?? null,
        subTypeId: v.sub_type?.id ?? null,
        subTypeName: v.sub_type?.name ?? null,
        status,
        workflows: {
          total: requests + orders + repairs + workOrders,
          requests,
          orders,
          repairs,
          workOrders,
        },
        workedDays: daysByVehicle.get(v.id)?.size ?? 0,
      };
    });

    return vehicles;
  } catch (error) {
    logger.error('Error fetching maintenance category vehicles', { data: { error, monthKey, category } });
    throw error;
  }
}

// ============================================================================
// EQUIPOS EN MANTENIMIENTO POR TIPO (ticket 233)
// ============================================================================

export type MaintenanceTypeVehicle = {
  id: string;
  domain: string | null;
  internNumber: string | null;
  status: VehicleStatus;
  kilometer: string | null;
  engineHours: string | null;
  /** Solicitudes/ordenes/OT/reparaciones abiertas (no terminales) del equipo. */
  openCount: number;
};

export type MaintenanceByTypeGroup = {
  typeId: string;
  typeName: string;
  /** Equipos unicos (dominios) de este tipo en mantenimiento en el mes. */
  count: number;
  vehicles: MaintenanceTypeVehicle[];
};

/**
 * Para el mes dado, agrupa por TIPO de equipo los equipos UNICOS (dominios) que
 * estuvieron en mantenimiento ese mes — definido como equipos que entraron al
 * taller (maintenance_orders.workshop_entry_date dentro del mes). Cada equipo
 * aparece una sola vez (findMany de vehicles = 1 fila por dominio) e incluye sus
 * solicitudes/procesos abiertos ACTUALES (openCount) para el detalle. Ordenado
 * por cantidad de equipos desc.
 */
export async function getMaintenanceByTypeForMonth(monthKey: string): Promise<MaintenanceByTypeGroup[]> {
  const companyId = await getServerCompanyId();
  logger.debug('Fetching maintenance by type for month', { data: { companyId, monthKey } });

  try {
    const monthStart = moment(monthKey, 'YYYY-MM').startOf('month');
    if (!monthStart.isValid()) {
      throw new Error(`Invalid monthKey: ${monthKey}`);
    }
    const monthEnd = monthStart.clone().add(1, 'month').startOf('month');

    const vehiclesRaw = await prisma.vehicles.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        maintenance_orders: {
          some: { workshop_entry_date: { gte: monthStart.toDate(), lt: monthEnd.toDate() } },
        },
      },
      select: {
        id: true,
        domain: true,
        intern_number: true,
        condition: true,
        kilometer: true,
        engine_hours: true,
        type_vehicles_typeTotype: { select: { id: true, name: true } },
        _count: {
          select: {
            maintenance_requests: { where: { status: { notIn: TERMINAL_REQUEST_STATUSES } } },
            maintenance_orders: { where: { status: { notIn: TERMINAL_ORDER_STATUSES } } },
            repair_solicitudes: { where: { state: { notIn: TERMINAL_REPAIR_STATES } } },
            work_orders: { where: { status: { notIn: TERMINAL_WORK_ORDER_STATUSES } } },
          },
        },
      },
      orderBy: { domain: 'asc' },
    });

    // Agrupar por tipo. Cada vehiculo es un dominio unico (1 fila por equipo).
    const byType = new Map<string, MaintenanceByTypeGroup>();
    for (const v of vehiclesRaw) {
      const typeId = v.type_vehicles_typeTotype?.id ?? 'sin-tipo';
      const typeName = v.type_vehicles_typeTotype?.name ?? 'Sin tipo';
      let group = byType.get(typeId);
      if (!group) {
        group = { typeId, typeName, count: 0, vehicles: [] };
        byType.set(typeId, group);
      }
      const openCount =
        v._count.maintenance_requests +
        v._count.maintenance_orders +
        v._count.repair_solicitudes +
        v._count.work_orders;
      group.vehicles.push({
        id: v.id,
        domain: v.domain,
        internNumber: v.intern_number,
        status: (v.condition as VehicleStatus | null) ?? 'operativo',
        kilometer: v.kilometer,
        engineHours: v.engine_hours,
        openCount,
      });
      group.count += 1;
    }

    return Array.from(byType.values()).sort((a, b) => b.count - a.count);
  } catch (error) {
    logger.error('Error fetching maintenance by type for month', { data: { error, monthKey } });
    throw error;
  }
}
