'use server';

import { Prisma } from '@/generated/prisma/client';
import { checkPermissionServer } from '@/features/Permissions';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { errorMessage, fail, ok, type ActionResult } from '../lib/action-result';
import { writePriceRevision } from '../lib/price-revision-writer';

const logger = new Logger('features/Empresa/Clientes/price-revisions');

const COMERCIAL_PATH = '/dashboard/comercial';

/**
 * Historial de precios de un ítem de contrato.
 *
 * `service_items.item_price` es el precio VIGENTE y esta tabla es su historia. La revisión
 * marcada `is_current` es la que lo produjo, y un índice único parcial en la base
 * (`uq_price_revisions_one_current_per_item`) impide que haya dos: si el código se equivoca,
 * la escritura falla en vez de dejar dos precios vigentes y que gane el que salga primero.
 *
 * Por eso las dos escrituras van SIEMPRE en la misma transacción y en este orden:
 * bajar la vigente → insertar la nueva → actualizar el ítem.
 */

/** Perímetro: el ítem tiene que colgar de un contrato de un cliente de la empresa activa. */
async function assertItemOwned(serviceItemId: string, companyId: string) {
  const item = await prisma.service_items.findFirst({
    where: { id: serviceItemId, customer_services: { customers: { company_id: companyId } } },
    select: { id: true, item_price: true, item_name: true },
  });
  if (!item) throw new Error('Ítem de contrato no encontrado');
  return item;
}

export async function getPriceRevisions(serviceItemId: string) {
  const companyId = await getActiveCompanyId();

  try {
    await assertItemOwned(serviceItemId, companyId);

    const rows = await prisma.service_item_price_revisions.findMany({
      where: { service_item_id: serviceItemId },
      select: {
        id: true,
        price: true,
        previous_price: true,
        is_current: true,
        valid_from: true,
        source: true,
        change_reason: true,
        created_at: true,
        run: { select: { id: true, applied_at: true, rule: { select: { id: true, name: true } } } },
      },
      orderBy: [{ valid_from: 'desc' }, { created_at: 'desc' }],
    });

    // Los importes viajan como TEXTO. `Decimal` es una instancia de clase y no cruza la frontera
    // a un Client Component; y convertirlo a `number` le comeria decimales a una columna
    // Decimal(15,4). El componente sólo los formatea, nunca hace aritmética con ellos.
    return rows.map((row) => ({
      ...row,
      price: row.price.toString(),
      previous_price: row.previous_price === null ? null : row.previous_price.toString(),
    }));
  } catch (error) {
    logger.error('Error al obtener el historial de precios', { data: { error, serviceItemId } });
    throw error;
  }
}

export type PriceRevisionRow = Awaited<ReturnType<typeof getPriceRevisions>>[number];

interface ApplyPriceRevisionInput {
  serviceItemId: string;
  /** Precio nuevo. Llega como texto: convertirlo a `number` antes de tiempo pierde decimales. */
  price: string;
  validFrom: string;
  reason?: string | null;
}

/**
 * Cambia el precio de un ítem a mano y deja la revisión.
 *
 * Es el camino `manual`. Los automáticos (índice y polinómica) pasan por
 * `runPriceUpdateRule`, que aplica el mismo mecanismo a muchos ítems bajo una corrida.
 */
export async function applyPriceRevision(input: ApplyPriceRevisionInput): Promise<ActionResult<{ id: string }>> {
  const companyId = await getActiveCompanyId();

  const canUpdatePrices = await checkPermissionServer('comercial', 'items-contrato', 'update_prices');
  if (!canUpdatePrices) return fail('No tenés permiso para modificar precios');

  let price: Prisma.Decimal;
  try {
    price = new Prisma.Decimal(input.price);
  } catch {
    return fail('El precio no es un número válido');
  }
  if (!price.isFinite() || price.isNegative()) return fail('El precio no puede ser negativo');

  const validFrom = new Date(input.validFrom);
  if (Number.isNaN(validFrom.getTime())) return fail('La fecha de vigencia no es válida');

  try {
    const item = await assertItemOwned(input.serviceItemId, companyId);
    const createdBy = await getSessionUserId();

    const revision = await prisma.$transaction((tx) =>
      writePriceRevision(tx, {
        serviceItemId: input.serviceItemId,
        price,
        previousPrice: item.item_price,
        validFrom,
        source: 'manual',
        reason: input.reason,
        createdBy,
      })
    );

    logger.info('Precio actualizado a mano', {
      data: { serviceItemId: input.serviceItemId, de: item.item_price.toString(), a: price.toString() },
    });
    revalidatePath(COMERCIAL_PATH);
    return ok({ id: revision.id });
  } catch (error) {
    logger.error('Error al actualizar el precio', { data: { error, serviceItemId: input.serviceItemId } });
    return fail(errorMessage(error, 'Error al actualizar el precio'));
  }
}
