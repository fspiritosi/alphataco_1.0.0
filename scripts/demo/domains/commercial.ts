/**
 * Certificaciones: una por contrato y por mes en los ultimos seis meses. Las de hace dos o mas
 * meses estan confirmadas, la del mes pasado emitida, la del mes en curso en borrador, y hay una
 * anulada (reemplazada por otra). Cada linea sale de una linea de parte diario ejecutada del
 * periodo, al precio vigente en ese mes; las lineas certificadas pasan a `en_certificacion`.
 */
import type { Prisma } from '../../../src/generated/prisma/client.ts';
import { insertMany, withoutTriggers, type Ctx } from '../lib/ctx.ts';
import { toDmy } from '../lib/dates.ts';
import { demoId } from '../lib/ids.ts';
import { ACTIVE_CUSTOMERS, customerId } from '../data/customers.ts';
import { priceAt } from './customers.ts';
import type { DemoRow } from './operations.ts';

export async function seedCertifications(ctx: Ctx, rows: DemoRow[]): Promise<void> {
  const { tx, cal, company, actorId } = ctx;
  const certs: Prisma.certificationsCreateManyInput[] = [];
  const lines: Prisma.certification_linesCreateManyInput[] = [];
  const certifiedRows: string[] = [];
  const numbers = new Map<string, number>();
  const nextNumber = (period: string) => {
    const year = period.slice(0, 4);
    const n = (numbers.get(year) ?? 0) + 1;
    numbers.set(year, n);
    return `CERT-${year}-${String(n).padStart(4, '0')}`;
  };

  for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
    const { from, to } = cal.monthRange(monthsAgo);
    for (const customer of ACTIVE_CUSTOMERS.filter((c) => c.key !== 'interno')) {
      for (const contract of customer.contracts) {
        const periodRows = rows.filter(
          (r) => r.contractKey === contract.key && r.offset >= from && r.offset <= Math.min(to, 0) && r.status === 'ejecutado'
        );
        if (!periodRows.length) continue;
        const status = monthsAgo === 0 ? 'borrador' : monthsAgo === 1 ? 'emitida' : 'confirmada';
        const voided = monthsAgo === 3 && contract.key === 'andes_transporte';
        const make = (suffix: string, certStatus: 'borrador' | 'emitida' | 'confirmada' | 'anulada') => {
          const id = demoId('certification', `${contract.key}:${cal.period(monthsAgo)}:${suffix}`);
          let total = 0;
          for (const row of periodRows) {
            const unit = priceAt(row.item.price, monthsAgo);
            const amount = Math.round(unit * row.quantity * 100) / 100;
            total += amount;
            lines.push({
              certification_id: id,
              dailyreportrow_id: certStatus === 'anulada' ? null : row.id,
              service_item_id: demoId('item', `${contract.key}:${row.item.key}`),
              description: `${row.item.name} - ${toDmy(cal.ymd(row.offset))}`,
              quantity: row.quantity,
              unit_price: unit,
              amount,
              is_live: certStatus !== 'anulada',
              created_at: cal.at(to + 1 > 0 ? 0 : to + 1, 10),
            });
          }
          const closed = Math.min(to + 3, 0);
          certs.push({
            id,
            company_id: company.id,
            customer_id: customerId(customer),
            customer_service_id: demoId('contract', contract.key),
            number: nextNumber(cal.period(monthsAgo)),
            period_from: cal.day(from),
            period_to: cal.day(to),
            status: certStatus,
            currency: contract.currency,
            total: Math.round(total * 100) / 100,
            notes: certStatus === 'anulada' ? 'Anulada por error en las cantidades de horas' : null,
            issued_at: certStatus === 'borrador' ? null : cal.at(closed, 11),
            issued_by: certStatus === 'borrador' ? null : actorId,
            confirmed_at: certStatus === 'confirmada' ? cal.at(Math.min(closed + 5, 0), 11) : null,
            confirmed_by: certStatus === 'confirmada' ? actorId : null,
            voided_at: certStatus === 'anulada' ? cal.at(Math.min(closed + 2, 0), 11) : null,
            voided_by: certStatus === 'anulada' ? actorId : null,
            voided_reason: certStatus === 'anulada' ? 'Error en las cantidades de horas' : null,
            created_at: cal.at(Math.min(to + 1, 0), 9),
          });
        };
        if (voided) make('anulada', 'anulada');
        make('vigente', status);
        if (status !== 'borrador') certifiedRows.push(...periodRows.map((r) => r.id));
      }
    }
  }

  await tx.certifications.createMany({ data: certs });
  await insertMany(lines, (c) => tx.certification_lines.createMany({ data: c }), 3000);
  // Sin triggers: el de historial registraria cada cambio de estado de las lineas.
  await withoutTriggers(tx, () =>
    tx.$executeRawUnsafe(`UPDATE dailyreportrows SET status = 'en_certificacion' WHERE id = ANY($1::uuid[])`, certifiedRows)
  );
  const certified = new Set(certifiedRows);
  for (const row of rows) if (certified.has(row.id)) row.status = 'en_certificacion';
  ctx.log(`${certs.length} certificaciones con ${lines.length} líneas`);
}
