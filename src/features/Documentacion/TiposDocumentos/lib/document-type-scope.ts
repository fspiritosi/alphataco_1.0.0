import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';

/**
 * Perímetro de `document_types` sin RLS.
 *
 * Los tipos de documento son GLOBALES (`company_id IS NULL`, compartidos por todas las
 * empresas) o PROPIOS de una empresa. Toda lectura/escritura por id se acota a ese conjunto:
 * un uuid de un tipo de otra empresa no existe para la empresa activa.
 */
export function documentTypeCompanyScope(companyId: string): Prisma.document_typesWhereInput {
  return { OR: [{ company_id: null }, { company_id: companyId }] };
}

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Busca un tipo de documento por id dentro del perímetro de la empresa activa.
 * Lanza `Tipo de documento no encontrado` si no existe o pertenece a otra empresa.
 */
export async function findScopedDocumentType<S extends Prisma.document_typesSelect>(
  client: Client,
  id: string,
  companyId: string,
  select: S,
  extraWhere: Prisma.document_typesWhereInput = {}
) {
  const row = await client.document_types.findFirst({
    where: { id, AND: [documentTypeCompanyScope(companyId), extraWhere] },
    select,
  });
  if (!row) throw new Error('Tipo de documento no encontrado');
  return row;
}
