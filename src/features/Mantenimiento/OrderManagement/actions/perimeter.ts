import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

/**
 * Perímetro de las mutaciones de gestión de taller.
 *
 * Sin RLS, cada `'use server'` exportado es un endpoint público: antes de escribir hay que
 * verificar que el pedido (o el ítem) pertenezca a la empresa activa. Devuelve la empresa
 * para que quien llama la reuse en los registros derivados.
 *
 * Módulo server-only (NO es una Server Action).
 */
export async function assertOrderInActiveCompany(orderId: string): Promise<string> {
  const companyId = await getActiveCompanyId();

  const order = await prisma.maintenance_orders.findFirst({
    where: { id: orderId, company_id: companyId },
    select: { id: true },
  });

  if (!order) throw new Error('El pedido de mantenimiento no pertenece a la empresa activa');

  return companyId;
}

/** Ídem para un ítem del pedido. */
export async function assertOrderItemInActiveCompany(itemId: string): Promise<string> {
  const companyId = await getActiveCompanyId();

  const item = await prisma.maintenance_order_items.findFirst({
    where: { id: itemId, company_id: companyId },
    select: { id: true },
  });

  if (!item) throw new Error('El ítem del pedido no pertenece a la empresa activa');

  return companyId;
}
