import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';

/**
 * Perímetro de los documentos sin RLS: toda lectura/escritura por id o por `document_path`
 * se acota a la empresa activa a través del recurso (`employees.company_id`,
 * `vehicles.company_id`, `documents_company.applies`).
 */

/** Recurso al que pertenece un documento, tal como lo nombran las páginas de detalle. */
export type DocumentResourceKind = 'employee' | 'vehicle' | 'company';

export function isDocumentResourceKind(value: unknown): value is DocumentResourceKind {
  return value === 'employee' || value === 'vehicle' || value === 'company';
}

type Client = Prisma.TransactionClient | typeof prisma;

/** Fila mínima común a las tres tablas de documentos. */
export interface ScopedDocumentRow {
  id: string;
  document_path: string | null;
  id_document_types: string | null;
}

/** Documento por id dentro de la empresa activa, o null. */
export async function findScopedDocument(
  client: Client,
  kind: DocumentResourceKind,
  id: string,
  companyId: string
): Promise<ScopedDocumentRow | null> {
  const select = { id: true, document_path: true, id_document_types: true } as const;
  switch (kind) {
    case 'employee':
      return client.documents_employees.findFirst({ where: { id, employees: { company_id: companyId } }, select });
    case 'vehicle':
      return client.documents_equipment.findFirst({ where: { id, vehicles: { company_id: companyId } }, select });
    case 'company':
      return client.documents_company.findFirst({ where: { id, applies: companyId }, select });
  }
}

/**
 * Paths (de `document_path`) que efectivamente pertenecen a documentos de la empresa activa.
 * Un path que no esté en el resultado no se sirve ni se toca.
 */
export async function filterOwnedDocumentPaths(client: Client, paths: string[], companyId: string): Promise<Set<string>> {
  const unique = [...new Set(paths.filter((p) => p.length > 0))];
  if (unique.length === 0) return new Set();
  const where = { document_path: { in: unique } };
  const select = { document_path: true } as const;
  const [employees, vehicles, company] = await Promise.all([
    client.documents_employees.findMany({ where: { ...where, employees: { company_id: companyId } }, select }),
    client.documents_equipment.findMany({ where: { ...where, vehicles: { company_id: companyId } }, select }),
    client.documents_company.findMany({ where: { ...where, applies: companyId }, select }),
  ]);
  const owned = new Set<string>();
  for (const row of [...employees, ...vehicles, ...company]) {
    if (row.document_path) owned.add(row.document_path);
  }
  return owned;
}
