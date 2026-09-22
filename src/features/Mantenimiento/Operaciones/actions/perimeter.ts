import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

/**
 * Perímetro de las mutaciones de Operaciones.
 *
 * Sin RLS, cada `'use server'` exportado es un endpoint público: antes de escribir hay que
 * verificar que el pedido pertenezca a la empresa activa.
 *
 * Módulo server-only (NO es una Server Action).
 */
export async function assertOperationOrderInActiveCompany(orderId: string): Promise<string> {
  const companyId = await getActiveCompanyId();

  const order = await prisma.maintenance_orders.findFirst({
    where: { id: orderId, company_id: companyId },
    select: { id: true },
  });

  if (!order) throw new Error('El pedido de mantenimiento no pertenece a la empresa activa');

  return companyId;
}
