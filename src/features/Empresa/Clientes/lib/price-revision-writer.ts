import { Prisma } from '@/generated/prisma/client';

/**
 * Único escritor de `service_items.item_price`.
 *
 * El precio vigente vive en dos lugares por diseño: `service_items.item_price` (lo que consulta
 * el resto del sistema) y la revisión marcada `is_current` (de dónde salió). Que no divergan no
 * puede depender de que cada camino se acuerde de escribir los dos: los tres caminos que cambian
 * un precio — alta del ítem, edición a mano y corrida de una regla — llaman a esta función.
 *
 * El orden de las tres escrituras no es negociable: bajar la vigente ANTES de insertar la nueva,
 * porque `uq_price_revisions_one_current_per_item` es un índice único parcial que no admite dos
 * vigentes por ítem. Si algún día el código se equivoca, la inserción falla en vez de dejar dos
 * precios vigentes y que gane el que la query saque primero.
 */
export interface PriceRevisionWrite {
  serviceItemId: string;
  /** Precio nuevo. Ya validado por quien llama. */
  price: Prisma.Decimal;
  /** Precio que regía. `null` en el alta del ítem: no había anterior. */
  previousPrice: Prisma.Decimal | null;
  validFrom: Date;
  source: 'manual' | 'index' | 'polynomial';
  reason?: string | null;
  createdBy?: string | null;
  /** Corrida a la que pertenece, cuando viene de una regla. */
  runId?: string | null;
}

/**
 * Escribe la revisión y deja el ítem con ese precio, dentro de la transacción de quien llama.
 *
 * Recibe el `tx` en vez de abrir su propia transacción: el alta de un ítem y la corrida de una
 * regla ya vienen dentro de una, y anidarlas dejaría el ítem escrito sin su revisión si la de
 * afuera falla después.
 */
export async function writePriceRevision(
  tx: Prisma.TransactionClient,
  write: PriceRevisionWrite
): Promise<{ id: string }> {
  await tx.service_item_price_revisions.updateMany({
    where: { service_item_id: write.serviceItemId, is_current: true },
    data: { is_current: false },
  });

  const created = await tx.service_item_price_revisions.create({
    data: {
      service_item_id: write.serviceItemId,
      price: write.price,
      previous_price: write.previousPrice,
      is_current: true,
      valid_from: write.validFrom,
      source: write.source,
      change_reason: write.reason?.trim() || null,
      created_by: write.createdBy ?? null,
      run_id: write.runId ?? null,
    },
    select: { id: true },
  });

  await tx.service_items.update({
    where: { id: write.serviceItemId },
    data: { item_price: write.price },
  });

  return created;
}

/**
 * ¿Cambió el precio? Compara por VALOR, no por identidad ni por texto.
 *
 * `Decimal` es un objeto: `!==` siempre da true. Y comparar `toString()` haría que `10` y
 * `10.0000` parezcan distintos y generen una revisión fantasma cada vez que se guarda el ítem
 * sin tocar el precio.
 */
export function priceChanged(before: Prisma.Decimal, after: Prisma.Decimal): boolean {
  return !before.equals(after);
}
