'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { buildTodayReportWhere } from '../lib/dashboard-dates';
import { percentage, summarizeFleet } from '../lib/indicators';
import { getEquipmentIndicators } from './fleet.server';

const logger = new Logger('features/Dashboard/Principal/kpis');

/**
 * Tarjetas de KPIs del tablero: empleados activos, equipos activos, servicios del día y
 * porcentaje de operatividad de la flota.
 *
 * Es el único agregado que cruza dominios (flota + personal + servicios), por eso vive en
 * su propio módulo en vez de en `fleet`/`rrhh`/`services`.
 */
export async function getDashboardKpis() {
  logger.debug('Obteniendo KPIs del dashboard');

  try {
    const companyId = await getActiveCompanyId();
    const reportWhere = buildTodayReportWhere(companyId);

    const [activeEmployees, activeVehicles, totalServices, equipmentData] = await Promise.all([
      prisma.employees.count({ where: withCompany({ is_active: true }, companyId) }),
      prisma.vehicles.count({ where: withCompany({ is_active: true }, companyId) }),
      prisma.dailyreportrows.count({ where: { status: { in: ['pendiente', 'ejecutado'] }, ...reportWhere } }),
      getEquipmentIndicators(),
    ]);

    const fleet = summarizeFleet(equipmentData);

    return {
      activeEmployees,
      activeVehicles,
      // Numerador de la operatividad: los activos que ademas estan operativos.
      // Distinto de `activeVehicles`, que cuenta TODOS los activos y coincide con `totalFleet`.
      operativeVehicles: fleet.operative,
      totalFleet: fleet.total,
      fleetMinusRepair: activeVehicles - fleet.notAvailable,
      totalServices,
      operativityPercentage: percentage(fleet.operative, fleet.total),
    };
  } catch (error) {
    logger.error('Error al obtener KPIs del dashboard', { data: { error } });
    throw error;
  }
}

export type DashboardKpisData = Awaited<ReturnType<typeof getDashboardKpis>>;
