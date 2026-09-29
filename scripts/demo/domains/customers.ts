/**
 * Clientes, contratos, items de servicio con su historial de precios, reglas de actualizacion,
 * areas, sectores, contactos y equipos del cliente.
 */
import type { Ctx } from '../lib/ctx.ts';
import { demoId } from '../lib/ids.ts';
import { CUSTOMERS, customerId } from '../data/customers.ts';
import { NEUQUEN_PROVINCE } from './catalogs.ts';

/** Precio de un item hace `monthsAgo` meses, desandando los dos aumentos del ultimo año. */
export function priceAt(current: number, monthsAgo: number): number {
  if (monthsAgo >= 6) return Math.round((current / 1.09 / 1.18) * 100) / 100;
  if (monthsAgo >= 2) return Math.round((current / 1.09) * 100) / 100;
  return current;
}

export async function seedCustomers(ctx: Ctx): Promise<void> {
  const { tx, cal, company, actorId } = ctx;
  const companyId = company.id;

  for (const c of CUSTOMERS) {
    const id = customerId(c);
    await tx.customers.create({
      data: {
        id,
        name: c.name,
        cuit: BigInt(c.cuit),
        client_email: c.email,
        client_phone: BigInt(c.phone),
        address: c.address,
        company_id: companyId,
        is_active: !c.inactive,
        termination_date: c.inactive ? cal.day(-150) : null,
        reason_for_termination: c.inactive ? 'Finalización del contrato marco' : null,
        created_at: cal.at(-700),
      },
    });
    await tx.contacts.create({
      data: {
        id: demoId('contact', c.key),
        contact_name: c.contact.name,
        constact_email: c.email.replace(/^[^@]+/, c.contact.name.split(' ')[0].toLowerCase()),
        contact_phone: BigInt(Number(c.phone) + 7),
        contact_charge: c.contact.role,
        company_id: companyId,
        customer_id: id,
      },
    });
    await tx.areas_cliente.createMany({
      data: c.areas.map((nombre) => ({ id: demoId('area', `${c.key}:${nombre}`), nombre, customer_id: id, descripcion_corta: nombre.slice(0, 3).toUpperCase() })),
    });
    await tx.area_province.createMany({
      data: c.areas.map((nombre) => ({ area_id: demoId('area', `${c.key}:${nombre}`), province_id: BigInt(NEUQUEN_PROVINCE) })),
    });
    await tx.sectors.createMany({
      data: c.sectors.map((name) => ({ id: demoId('sector', `${c.key}:${name}`), name, customer_id: id, descripcion_corta: name.slice(0, 4).toUpperCase() })),
    });
    if (c.rigs.length) {
      await tx.equipos_clientes.createMany({
        data: c.rigs.map((r) => ({ id: demoId('rig', `${c.key}:${r.name}`), name: r.name, type: r.type, customer_id: id })),
      });
    }

    for (const contract of c.contracts) {
      const contractId = demoId('contract', contract.key);
      const start = cal.monthRange(contract.startMonthsAgo).from;
      const endMonthsAgo = contract.startMonthsAgo - contract.months;
      await tx.customer_services.create({
        data: {
          id: contractId,
          customer_id: id,
          company_id: companyId,
          service_name: contract.name,
          contract_number: contract.number,
          currency: contract.currency,
          service_start: cal.day(start),
          service_validity: cal.day(cal.monthRange(endMonthsAgo).to),
          is_active: !c.inactive,
          created_at: cal.at(start),
        },
      });
      await tx.service_areas.createMany({
        data: c.areas.map((nombre) => ({
          id: demoId('service_area', `${contract.key}:${nombre}`),
          service_id: contractId,
          area_id: demoId('area', `${c.key}:${nombre}`),
        })),
      });
      await tx.service_sectors.createMany({
        data: c.sectors.map((name) => ({
          id: demoId('service_sector', `${contract.key}:${name}`),
          service_id: contractId,
          sector_id: demoId('sector', `${c.key}:${name}`),
        })),
      });

      for (const [index, item] of contract.items.entries()) {
        const itemId = demoId('item', `${contract.key}:${item.key}`);
        await tx.service_items.create({
          data: {
            id: itemId,
            customer_service_id: contractId,
            company_id: companyId,
            item_name: item.name,
            item_description: item.description,
            item_price: item.price,
            item_measure_units: item.unit,
            code_item: `${contract.number}-${String(index + 1).padStart(2, '0')}`,
            item_number: String(index + 1),
            needs_equipment: item.needsEquipment ?? true,
            needs_personnel: item.needsPersonnel ?? true,
            is_active: !c.inactive,
            created_at: cal.at(start),
          },
        });

        // Historial: precio inicial, ajuste por indice hace 6 meses y polinomica hace 2.
        if (item.price === 0) continue;
        const revisions: Array<{ monthsAgo: number; price: number; prev: number | null; source: 'manual' | 'index' | 'polynomial'; reason: string }> = [];
        const initialMonthsAgo = Math.min(contract.startMonthsAgo, 12);
        revisions.push({ monthsAgo: initialMonthsAgo, price: priceAt(item.price, 12), prev: null, source: 'manual', reason: 'Precio de contrato' });
        if (initialMonthsAgo > 6) {
          revisions.push({ monthsAgo: 6, price: priceAt(item.price, 2), prev: priceAt(item.price, 12), source: 'index', reason: 'Ajuste por IPC semestral' });
        }
        if (initialMonthsAgo > 2) {
          revisions.push({
            monthsAgo: 2,
            price: item.price,
            prev: priceAt(item.price, initialMonthsAgo > 6 ? 2 : 12),
            source: 'polynomial',
            reason: 'Polinómica: gasoil 45%, mano de obra 40%, IPC 15%',
          });
        } else {
          revisions[0].price = item.price;
        }
        await tx.service_item_price_revisions.createMany({
          data: revisions.map((r, i) => ({
            id: demoId('price_revision', `${itemId}:${i}`),
            service_item_id: itemId,
            price: r.price,
            previous_price: r.prev,
            is_current: i === revisions.length - 1,
            valid_from: cal.day(cal.monthRange(r.monthsAgo).from),
            source: r.source,
            change_reason: r.reason,
            created_by: actorId,
            run_id: r.source === 'manual' ? null : demoId('price_run', r.source),
            created_at: cal.at(cal.monthRange(r.monthsAgo).from),
          })),
        });
      }
    }
  }
}

/** Reglas y corridas de actualizacion de precios (van antes de las revisiones que las citan). */
export async function seedPriceRules(ctx: Ctx): Promise<void> {
  const { tx, cal, company, actorId } = ctx;
  await tx.price_update_rules.createMany({
    data: [
      {
        id: demoId('price_rule', 'ipc'),
        company_id: company.id,
        name: 'Ajuste semestral por IPC',
        method: 'index',
        config: { index: 'IPC-INDEC', frequency_months: 6 },
        created_by: actorId,
        created_at: cal.at(-400),
      },
      {
        id: demoId('price_rule', 'polinomica'),
        company_id: company.id,
        // El contrato todavia no existe: `linkPriceRules` lo vincula despues.
        name: 'Polinómica transporte Andes Energía',
        method: 'polynomial',
        config: { terms: [{ index: 'Gasoil', weight: 0.45 }, { index: 'Mano de obra CCT 644', weight: 0.4 }, { index: 'IPC', weight: 0.15 }] },
        created_by: actorId,
        created_at: cal.at(-400),
      },
    ],
  });
  await tx.price_update_runs.createMany({
    data: [
      {
        id: demoId('price_run', 'index'),
        company_id: company.id,
        rule_id: demoId('price_rule', 'ipc'),
        applied_at: cal.at(cal.monthRange(6).from, 9),
        applied_by: actorId,
        items_affected: 12,
        note: 'IPC acumulado del semestre: 18%',
      },
      {
        id: demoId('price_run', 'polynomial'),
        company_id: company.id,
        rule_id: demoId('price_rule', 'polinomica'),
        applied_at: cal.at(cal.monthRange(2).from, 9),
        applied_by: actorId,
        items_affected: 12,
        note: 'Variación polinómica del período: 9%',
      },
    ],
  });
}

/** Vincula la regla polinomica a su contrato, una vez creados los contratos. */
export async function linkPriceRules(ctx: Ctx): Promise<void> {
  await ctx.tx.price_update_rules.update({
    where: { id: demoId('price_rule', 'polinomica') },
    data: { customer_service_id: demoId('contract', 'andes_transporte') },
  });
}
