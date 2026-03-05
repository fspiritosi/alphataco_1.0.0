'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';

const logger = new Logger('Dashboard/Estadisticas/Operaciones');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AggregatedChartRow = {
  date: string;
  customerId: string;
  customerName: string;
  mensual: number;
  adicional: number;
};

export type OperationsChartData = {
  rows: AggregatedChartRow[];
  customers: { id: string; name: string }[];
};

// ---------------------------------------------------------------------------
// Main query
// ---------------------------------------------------------------------------

export async function getOperationsChartData(): Promise<OperationsChartData> {
  const companyId = await getServerCompanyId();
  const since = moment().subtract(90, 'days').format('YYYY-MM-DD');

  logger.debug('Fetching operations chart data', { data: { companyId, since } });

  try {
    const rows = await prisma.dailyreportrows.findMany({
      where: {
        dailyreport: {
          company_id: companyId,
          date: { gte: new Date(since) },
          is_active: true,
        },
        customer_id: { not: null },
      },
      select: {
        type_service: true,
        dailyreport: { select: { date: true } },
        customers: { select: { id: true, name: true } },
      },
    });

    // Pre-aggregate in a single loop
    const aggregation = new Map<string, { mensual: number; adicional: number }>();
    const customerMap = new Map<string, string>();

    for (const row of rows) {
      if (!row.dailyreport?.date || !row.customers) continue;

      const dateStr = moment(row.dailyreport.date).format('YYYY-MM-DD');
      const customerId = row.customers.id;
      const customerName = row.customers.name ?? 'Sin cliente';
      const key = `${dateStr}|${customerId}`;

      customerMap.set(customerId, customerName);

      let entry = aggregation.get(key);
      if (!entry) {
        entry = { mensual: 0, adicional: 0 };
        aggregation.set(key, entry);
      }

      if (row.type_service === 'mensual') {
        entry.mensual += 1;
      } else if (row.type_service === 'adicional' || row.type_service === 'adicional_permanente') {
        entry.adicional += 1;
      }
      // Rows with null type_service are skipped
    }

    // Transform to array
    const aggregatedRows: AggregatedChartRow[] = [];
    for (const [key, counts] of aggregation) {
      const [date, customerId] = key.split('|');
      aggregatedRows.push({
        date,
        customerId,
        customerName: customerMap.get(customerId) ?? 'Sin cliente',
        mensual: counts.mensual,
        adicional: counts.adicional,
      });
    }

    aggregatedRows.sort((a, b) => a.date.localeCompare(b.date));

    const customers = Array.from(customerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    logger.debug('Operations chart data fetched', {
      data: { rowCount: aggregatedRows.length, customerCount: customers.length },
    });

    return { rows: aggregatedRows, customers };
  } catch (error) {
    logger.error('Error fetching operations chart data', { data: { error } });
    throw error;
  }
}
