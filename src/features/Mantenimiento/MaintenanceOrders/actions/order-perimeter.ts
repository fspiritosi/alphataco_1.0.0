import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

/**
 * Perímetro de las mutaciones sobre un pedido de mantenimiento.
 *
 * Sin RLS, cada `'use server'` exportado es un endpoint público: antes de escribir hay que
 * verificar que el pedido pertenezca a la empresa activa. Devuelve la empresa para reusarla.
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

/** Ídem para una orden de trabajo (OT). */
export async function assertWorkOrderInActiveCompany(workOrderId: string): Promise<string> {
  const companyId = await getActiveCompanyId();

  const workOrder = await prisma.work_orders.findFirst({
    where: { id: workOrderId, company_id: companyId },
    select: { id: true },
  });

  if (!workOrder) throw new Error('La orden de trabajo no pertenece a la empresa activa');

  return companyId;
}
