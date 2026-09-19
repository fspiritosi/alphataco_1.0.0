'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import moment from 'moment';

const logger = new Logger('Dashboard/Estadisticas/SalaDeControl/PreparteKpi');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PreparteKpiRow = {
  date: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  pendiente: number;
  confirmado: number;
  rechazado: number;
  cancelado: number;
  otros: number; // reprogramado + vencido
  total: number;
};

export type PreparteKpiData = {
  rows: PreparteKpiRow[];
  customers: { id: string; name: string }[];
};

// ---------------------------------------------------------------------------
// Main query
// ---------------------------------------------------------------------------

export async function getPreparteKpiData(): Promise<PreparteKpiData> {
  const since = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');

  logger.debug('Fetching preparte KPI data', { data: { since } });

  try {
    const companyId = await getActiveCompanyId();
    const records = await prisma.preparte.findMany({
      where: {
        created_at: { gte: new Date(since) },
        // Mismo alcance que el listado de Preparte: filas legacy sin company_id se consideran de la empresa
        OR: [{ company_id: companyId }, { company_id: null }],
      },
      select: {
        status: true,
        created_at: true,
        customers: { select: { id: true, name: true } },
      },
    });

    // Pre-aggregate by date + customer
    const aggregation = new Map<string, PreparteKpiRow>();
    const customerMap = new Map<string, string>();

    for (const record of records) {
      if (!record.created_at || !record.customers) continue;

      const dateKey = moment(record.created_at).format('YYYY-MM-DD');
      const customerId = record.customers.id;
      const customerName = record.customers.name ?? 'Sin cliente';
      const key = `${dateKey}|${customerId}`;

      customerMap.set(customerId, customerName);

      let entry = aggregation.get(key);
      if (!entry) {
        entry = {
          date: dateKey,
          customerId,
          customerName,
          pendiente: 0,
          confirmado: 0,
          rechazado: 0,
          cancelado: 0,
          otros: 0,
          total: 0,
        };
        aggregation.set(key, entry);
      }

      entry.total++;
      switch (record.status) {
        case 'pendiente':
          entry.pendiente++;
          break;
        case 'confirmado':
          entry.confirmado++;
          break;
        case 'rechazado':
          entry.rechazado++;
          break;
        case 'cancelado':
          entry.cancelado++;
          break;
        default:
          // reprogramado, vencido, null
          entry.otros++;
          break;
      }
    }

    const rows = Array.from(aggregation.values()).sort((a, b) => a.date.localeCompare(b.date));

    const customers = Array.from(customerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    logger.debug('Preparte KPI data fetched', {
      data: { totalRecords: records.length, aggregatedRows: rows.length, customerCount: customers.length },
    });

    return { rows, customers };
  } catch (error) {
    logger.error('Error fetching preparte KPI data', { data: { error } });
    throw error;
  }
}
