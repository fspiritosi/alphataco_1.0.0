'use server';

import { Logger } from '@/lib/logger';
import { getCachedSession } from '@/shared/lib/cached-session';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Dashboard/KPIs/Graficos');

type KpiCode = 'KPI-0001' | 'KPI-0002' | 'KPI-0003' | 'KPI-0004' | 'KPI-0005' | 'KPI-0006';

// Descripciones cortas para cada KPI (no requieren query a BD)
const KPI_DESCRIPTION_MAP: Record<KpiCode, string> = {
  'KPI-0001': 'Porcentaje de empleados ausentes sobre el total de empleados activos (AD = TA / TE × 100)',
  'KPI-0002':
    'Porcentaje de personal asignado a movimientos internos sobre el total de personal apto (PMI = TMI / TPA × 100)',
  'KPI-0003':
    'Porcentaje de personal productivo asignado a clientes sobre el personal disponible (PP = TPC / (TPA - TMI) × 100)',
  'KPI-0004': 'Porcentaje de equipos no operativos sobre el total de equipos aptos (EDO = ENO / EA × 100)',
  'KPI-0005':
    'Porcentaje de equipos asignados a movimientos internos sobre equipos operativos (EMI = EAMI / EOA × 100)',
  'KPI-0006':
    'Porcentaje de equipos operativos asignados a clientes sobre equipos disponibles (EOC = TEOC / TEOA × 100)',
};

/**
 * Obtiene metadata (name, number, description) de los 6 KPIs en 1 sola query.
 * Diseñado para ser llamado desde el Server Component.
 */
export async function getAllKpisMetadata() {
  logger.debug('Obteniendo metadata de todos los KPIs');

  try {
    const session = await getCachedSession();
    const companyId = session?.user?.app_metadata?.company;

    if (!companyId) {
      logger.warn('No se encontró company_id en la sesión');
      return [];
    }

    const kpis = await prisma.kpis.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        code: { in: ['KPI-0001', 'KPI-0002', 'KPI-0003', 'KPI-0004', 'KPI-0005', 'KPI-0006'] },
      },
      select: {
        code: true,
        name: true,
        number: true,
      },
      orderBy: { code: 'asc' },
    });

    return kpis.map((kpi) => ({
      code: kpi.code as KpiCode,
      name: kpi.name,
      number: kpi.number ? Number(kpi.number) : 0,
      description: KPI_DESCRIPTION_MAP[kpi.code as KpiCode] || 'Evolución del indicador',
    }));
  } catch (error) {
    logger.error('Error al obtener metadata de KPIs', { data: { error } });
    return [];
  }
}

export type KpiMetadataItem = Awaited<ReturnType<typeof getAllKpisMetadata>>[number];
