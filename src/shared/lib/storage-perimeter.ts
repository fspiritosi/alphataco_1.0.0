import 'server-only';

import { prisma } from '@/shared/lib/prisma';
import { companyIdFromKey, isCompanyPrefixedBucket, type StorageBucket } from '@/shared/lib/storage-buckets';

/**
 * ¿De qué empresa es este archivo?
 *
 * Sin RLS, la ruta proxy (`/api/files/...`) es un lector de archivos por path: si no
 * resolviera el dueño, cualquier sesión podría leer el archivo de cualquier empresa
 * adivinando la ruta. Es el mismo agujero que P2 cerró en cada action, aplicado al storage.
 *
 * Dos estrategias según el bucket:
 *
 * 1. Buckets con prefijo de empresa (`<companyId>/...`): el dueño sale del path, sin base.
 * 2. Buckets con paths heredados (documentos, remitos): el dueño se resuelve en la base
 *    por la fila que referencia ese path. Un archivo sin fila que lo referencie NO se sirve.
 *
 * Devuelve `null` cuando no se puede probar la pertenencia: la ruta responde 404.
 */

/** Carpetas del bucket `document-files` que cuelgan de un equipamiento. */
const OTHER_EQUIPMENT_FOLDERS: Record<string, true> = {
  'other-equipment-pictures': true,
  'other-equipment-blueprints': true,
  'other-equipment-certifications': true,
};

/** Empresa de un archivo de equipamiento: `other-equipment-<tipo>/<equipoId>/<archivo>`. */
async function otherEquipmentCompany(path: string): Promise<string | null> {
  const [folder, equipmentId] = path.split('/');
  if (!folder || !OTHER_EQUIPMENT_FOLDERS[folder] || !equipmentId) return null;
  const equipment = await prisma.other_equipment.findUnique({
    where: { id: equipmentId },
    select: { company_id: true },
  });
  return equipment?.company_id ?? null;
}

/** Empresa de un documento, buscando el `document_path` en las tres tablas de documentos. */
async function documentCompany(path: string): Promise<string | null> {
  const [employee, equipment, company] = await Promise.all([
    prisma.documents_employees.findFirst({
      where: { document_path: path },
      select: { employees: { select: { company_id: true } } },
    }),
    prisma.documents_equipment.findFirst({
      where: { document_path: path },
      select: { vehicles: { select: { company_id: true } } },
    }),
    prisma.documents_company.findFirst({ where: { document_path: path }, select: { applies: true } }),
  ]);
  return employee?.employees?.company_id ?? equipment?.vehicles?.company_id ?? company?.applies ?? null;
}

/** Empresa de un remito: la del parte diario del que cuelga su línea. */
async function remitDocumentCompany(path: string): Promise<string | null> {
  const document = await prisma.remito_documents.findFirst({
    where: { document_path: path },
    select: { remitos: { select: { dailyreportrows: { select: { dailyreport: { select: { company_id: true } } } } } } },
  });
  return document?.remitos?.dailyreportrows?.dailyreport?.company_id ?? null;
}

/**
 * Empresa dueña de `bucket/path`, o `null` si no se puede probar.
 * `path` ya tiene que venir validado con `isSafeStorageKey`.
 *
 * `contract-documents` y `document-files-expired` no están: sus archivos no se sirven por
 * la ruta proxy (sólo por URL firmada desde una action que ya verificó el perímetro), así
 * que el default es negar.
 */
export async function resolveStorageObjectCompany(bucket: StorageBucket, path: string): Promise<string | null> {
  if (isCompanyPrefixedBucket(bucket)) return companyIdFromKey(path);

  switch (bucket) {
    case 'document-files':
      return (await otherEquipmentCompany(path)) ?? (await documentCompany(path));
    case 'daily-reports':
      return remitDocumentCompany(path);
    default:
      return null;
  }
}
