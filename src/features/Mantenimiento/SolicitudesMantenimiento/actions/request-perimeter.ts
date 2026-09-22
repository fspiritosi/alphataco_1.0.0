import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

/**
 * Perímetro de las mutaciones sobre una solicitud.
 *
 * Sin RLS, cada `'use server'` exportado es un endpoint público: antes de escribir hay que
 * verificar que la solicitud pertenezca a la empresa activa del usuario. Devuelve la empresa
 * para que quien llama la reuse (los registros derivados heredan la misma).
 *
 * Módulo server-only (NO es una Server Action): no expone ningún endpoint propio.
 */
export async function assertRequestInActiveCompany(requestId: string): Promise<string> {
  const companyId = await getActiveCompanyId();

  const request = await prisma.maintenance_requests.findFirst({
    where: { id: requestId, company_id: companyId },
    select: { id: true },
  });

  if (!request) throw new Error('La solicitud no pertenece a la empresa activa');

  return companyId;
}
