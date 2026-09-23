'use server';

import type { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import {
  DOCUMENT_FILES_BUCKET,
  DOCUMENT_FILES_EXPIRED_BUCKET,
  storageDownload,
  storageRemove,
  storageDownloadUrls,
  storageUpload,
} from '@/shared/lib/storage';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { buildRenewedDocumentName, buildReplacedDocumentName } from '../lib/document-file-names';
import {
  filterOwnedDocumentPaths,
  findScopedDocument,
  isDocumentResourceKind,
  type DocumentResourceKind,
} from '../lib/document-scope';

/**
 * Operaciones sobre el ARCHIVO de un documento ya cargado (descargar, eliminar, reemplazar,
 * renovar). Antes: el cliente tocaba el storage y las tablas por PostgREST directamente.
 * Ahora todo pasa por acá: el archivo se verifica contra la empresa activa (perímetro sin RLS),
 * el storage se toca en el servidor y las filas se escriben con Prisma dentro de
 * `withActor` (triggers de status/logs).
 */
const logger = new Logger('Documentacion/document-files');

export type DocumentFileResult = { ok: true } | { ok: false; error: string };

async function requireActor(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sesión requerida');
  return userId;
}

function fileExtension(file: File): string {
  const ext = file.name.split('.').pop();
  if (!ext || ext === file.name) throw new Error('El archivo no tiene extensión');
  return ext;
}

// ============================================================================
// DESCARGA
// ============================================================================

/**
 * URLs para descargar documentos desde el navegador.
 * Sólo se resuelven paths de documentos de la empresa activa; el resto se omite del resultado.
 */
export async function getDocumentDownloadUrls(paths: string[]): Promise<{ path: string; url: string }[]> {
  const companyId = await getActiveCompanyId();
  const owned = await filterOwnedDocumentPaths(prisma, paths, companyId);
  const allowed = paths.filter((p) => owned.has(p));
  if (allowed.length !== new Set(paths).size) {
    logger.warn('Se pidieron descargas de paths ajenos a la empresa activa', {
      data: { requested: paths.length, allowed: allowed.length },
    });
  }
  if (allowed.length === 0) return [];
  const result = await storageDownloadUrls(DOCUMENT_FILES_BUCKET, allowed);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

// ============================================================================
// ELIMINAR
// ============================================================================

/**
 * Borra el archivo del storage y vuelve a `pendiente` TODAS las filas que lo referencian
 * (un documento multirecurso comparte el mismo archivo entre recursos), acotado a la empresa activa.
 */
export async function deleteDocumentFile(input: { id: string; resource: string }): Promise<DocumentFileResult> {
  try {
    if (!isDocumentResourceKind(input.resource)) return { ok: false, error: 'Tipo de recurso inválido' };
    const companyId = await getActiveCompanyId();
    const actor = await requireActor();
    const doc = await findScopedDocument(prisma, input.resource, input.id, companyId);
    if (!doc) return { ok: false, error: 'Documento no encontrado' };
    if (!doc.document_path) return { ok: false, error: 'El documento no tiene archivo cargado' };
    const path = doc.document_path;

    const removed = await storageRemove(DOCUMENT_FILES_BUCKET, [path]);
    if (!removed.ok) return { ok: false, error: 'No se pudo eliminar el archivo del storage' };

    const reset = { validity: null, document_path: null, state: 'pendiente' as const, period: null };
    await withActor(actor, async (tx) => {
      switch (input.resource) {
        case 'employee':
          await tx.documents_employees.updateMany({
            where: { document_path: path, employees: { company_id: companyId } },
            data: reset,
          });
          break;
        case 'vehicle':
          await tx.documents_equipment.updateMany({
            where: { document_path: path, vehicles: { company_id: companyId } },
            data: reset,
          });
          break;
        case 'company':
          await tx.documents_company.updateMany({
            where: { document_path: path, applies: companyId },
            data: { ...reset, user_id: null },
          });
          break;
      }
    });
    return { ok: true };
  } catch (error) {
    logger.error('Error al eliminar el documento', { data: { error, input } });
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo eliminar el documento' };
  }
}

// ============================================================================
// REEMPLAZAR / RENOVAR
// ============================================================================

interface FileMutationInput {
  kind: DocumentResourceKind;
  id: string;
  file: File;
  validity: Date | undefined;
  period: string | undefined;
}

/** Lee y valida el FormData común a reemplazar y renovar. */
function parseFileMutation(formData: FormData): FileMutationInput | { error: string } {
  const file = formData.get('file');
  const id = formData.get('id');
  const resource = formData.get('resource');
  const validityRaw = formData.get('validity');
  const periodRaw = formData.get('period');
  if (!(file instanceof File) || file.size === 0) return { error: 'El documento es requerido' };
  if (typeof id !== 'string' || !id) return { error: 'Documento inválido' };
  if (!isDocumentResourceKind(resource)) return { error: 'Tipo de recurso inválido' };
  let validity: Date | undefined;
  if (typeof validityRaw === 'string' && validityRaw) {
    validity = new Date(validityRaw);
    if (Number.isNaN(validity.getTime())) return { error: 'Fecha de vencimiento inválida' };
  }
  const period = typeof periodRaw === 'string' && periodRaw ? periodRaw : undefined;
  return { kind: resource, id, file, validity, period };
}

type DocumentUpdateData = {
  document_path: string;
  created_at: Date;
  state: 'presentado';
  validity?: Date | null;
  period?: string;
  archived_at?: null;
};

/** `validity` es `DateTime` en empleados/equipos y `String` en empresa. */
async function updateDocumentRow(
  tx: Prisma.TransactionClient,
  kind: DocumentResourceKind,
  where: { id: string } | { document_path: string },
  companyId: string,
  data: DocumentUpdateData
) {
  switch (kind) {
    case 'employee':
      return tx.documents_employees.updateMany({ where: { ...where, employees: { company_id: companyId } }, data });
    case 'vehicle':
      return tx.documents_equipment.updateMany({ where: { ...where, vehicles: { company_id: companyId } }, data });
    case 'company': {
      // documents_company: `validity` es texto y no tiene `archived_at`.
      const { validity, archived_at: _ignored, ...rest } = data;
      return tx.documents_company.updateMany({
        where: { ...where, applies: companyId },
        data: { ...rest, ...(validity !== undefined ? { validity: validity ? validity.toISOString() : null } : {}) },
      });
    }
  }
}

/**
 * Reemplaza el archivo de un documento (mismo registro): borra el anterior, sube el nuevo y deja
 * la fila en `presentado` (des-archivada, ticket 411). FormData: `id`, `resource`, `file`,
 * `validity?` (ISO), `period?` (YYYY-MM).
 */
export async function replaceDocumentFile(formData: FormData): Promise<DocumentFileResult> {
  try {
    const parsed = parseFileMutation(formData);
    if ('error' in parsed) return { ok: false, error: parsed.error };
    const companyId = await getActiveCompanyId();
    const actor = await requireActor();
    const doc = await findScopedDocument(prisma, parsed.kind, parsed.id, companyId);
    if (!doc) return { ok: false, error: 'Documento no encontrado' };
    if (!doc.document_path) return { ok: false, error: 'El documento no tiene archivo cargado' };

    const newPath = buildReplacedDocumentName(doc.document_path, fileExtension(parsed.file), parsed.validity);

    if (newPath !== doc.document_path) {
      const removed = await storageRemove(DOCUMENT_FILES_BUCKET, [doc.document_path]);
      if (!removed.ok) return { ok: false, error: 'No se pudo eliminar el archivo anterior' };
    }
    const uploaded = await storageUpload(DOCUMENT_FILES_BUCKET, newPath, parsed.file, { upsert: true });
    if (!uploaded.ok) return { ok: false, error: 'No se pudo subir el nuevo archivo' };

    await withActor(actor, (tx) =>
      updateDocumentRow(tx, parsed.kind, { id: parsed.id }, companyId, {
        document_path: uploaded.data.path,
        validity: parsed.validity ?? null,
        ...(parsed.period ? { period: parsed.period } : {}),
        created_at: new Date(),
        // Al reemplazar, el estado vuelve a 'presentado' (pendiente de aprobación): un documento
        // 'vencido' no debe quedar pegado en ese estado con una validez nueva.
        state: 'presentado',
        // 411: si la fila estaba archivada ("ya no aplica"), subir un archivo la reactiva.
        archived_at: null,
      })
    );
    return { ok: true };
  } catch (error) {
    logger.error('Error al reemplazar el documento', { data: { error } });
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo reemplazar el documento' };
  }
}

/**
 * Renueva un documento: el archivo vigente pasa al bucket de vencidos (historial) y el nuevo
 * queda como vigente con versión/fecha/período nuevos. Para los mensuales sólo se sube el nuevo
 * período (el anterior sigue siendo válido para su mes). FormData igual que `replaceDocumentFile`.
 */
export async function renewDocumentFile(formData: FormData): Promise<DocumentFileResult> {
  try {
    const parsed = parseFileMutation(formData);
    if ('error' in parsed) return { ok: false, error: parsed.error };
    const companyId = await getActiveCompanyId();
    const actor = await requireActor();
    const doc = await findScopedDocument(prisma, parsed.kind, parsed.id, companyId);
    if (!doc) return { ok: false, error: 'Documento no encontrado' };
    if (!doc.document_path) return { ok: false, error: 'El documento no tiene archivo cargado' };
    const currentPath = doc.document_path;

    const docType = doc.id_document_types
      ? await prisma.document_types.findUnique({ where: { id: doc.id_document_types }, select: { is_it_montlhy: true } })
      : null;
    const monthly = docType?.is_it_montlhy === true;

    const newPath = buildRenewedDocumentName(currentPath, fileExtension(parsed.file), {
      validity: parsed.validity,
      period: parsed.period,
    });

    if (monthly) {
      const uploaded = await storageUpload(DOCUMENT_FILES_BUCKET, newPath, parsed.file, { upsert: true });
      if (!uploaded.ok) return { ok: false, error: 'No se pudo subir el nuevo archivo' };
      await withActor(actor, (tx) =>
        updateDocumentRow(tx, parsed.kind, { document_path: currentPath }, companyId, {
          document_path: uploaded.data.path,
          ...(parsed.period ? { period: parsed.period } : {}),
          created_at: new Date(),
          state: 'presentado',
        })
      );
      return { ok: true };
    }

    // Archivar el vigente en el bucket de vencidos antes de borrarlo del bucket principal.
    const current = await storageDownload(DOCUMENT_FILES_BUCKET, currentPath);
    if (!current.ok) return { ok: false, error: 'No se pudo leer el archivo vigente' };
    const archived = await storageUpload(DOCUMENT_FILES_EXPIRED_BUCKET, currentPath, current.data, { upsert: true });
    if (!archived.ok) return { ok: false, error: 'No se pudo archivar el documento vencido' };
    const removed = await storageRemove(DOCUMENT_FILES_BUCKET, [currentPath]);
    if (!removed.ok) return { ok: false, error: 'No se pudo eliminar el archivo vigente' };
    const uploaded = await storageUpload(DOCUMENT_FILES_BUCKET, newPath, parsed.file, { upsert: true });
    if (!uploaded.ok) return { ok: false, error: 'No se pudo subir el nuevo archivo' };

    await withActor(actor, (tx) =>
      updateDocumentRow(tx, parsed.kind, { id: parsed.id }, companyId, {
        document_path: uploaded.data.path,
        validity: parsed.validity ?? null,
        created_at: new Date(),
        state: 'presentado',
      })
    );
    return { ok: true };
  } catch (error) {
    logger.error('Error al renovar el documento', { data: { error } });
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo renovar el documento' };
  }
}
