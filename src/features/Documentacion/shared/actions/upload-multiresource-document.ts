'use server';

import { prisma } from '@/shared/lib/prisma';
import { supabaseServer } from '@/lib/supabase/server';
import { Logger } from '@/lib/logger';

const logger = new Logger('Documentacion/uploadMultiResourceDocument');

type Result =
  | { ok: true; updated: number; created: number }
  | { ok: false; error: string };

/**
 * Sube un documento multirecurso a TODOS los recursos faltantes de forma atómica.
 * - Sube el archivo al storage (server-side).
 * - Persiste filas en una transacción Prisma: actualiza los `pendiente`, crea los ausentes,
 *   e IGNORA los que ya están `presentado` con archivo (no se pisan).
 * - Si la transacción falla, borra el archivo subido (compensación) → atomicidad efectiva.
 */
export async function uploadMultiResourceDocument(formData: FormData): Promise<Result> {
  const file = formData.get('file') as File | null;
  const resource = formData.get('resource') as 'empleado' | 'equipo' | null;
  const documentTypeId = formData.get('documentTypeId') as string | null;
  const sharedPath = formData.get('sharedPath') as string | null;
  const appliesRaw = formData.get('appliesIds') as string | null;
  const userId = (formData.get('userId') as string | null) || undefined;
  const validityRaw = (formData.get('validity') as string | null) || undefined;
  const period = (formData.get('period') as string | null) || undefined;
  // Solo aplica a equipos (documents_equipment.policy_number)
  const policyNumber = (formData.get('policyNumber') as string | null) || undefined;

  if (!file || !resource || !documentTypeId || !sharedPath || !appliesRaw) {
    return { ok: false, error: 'Faltan datos para subir el documento' };
  }

  let appliesIds: string[];
  try {
    appliesIds = JSON.parse(appliesRaw);
  } catch {
    return { ok: false, error: 'Lista de recursos inválida' };
  }
  if (!appliesIds.length) return { ok: false, error: 'No hay recursos para vincular' };

  const supabase = await supabaseServer();

  // 1. Subir el archivo al storage (upsert: documento compartido por varios recursos)
  const { error: uploadError } = await supabase.storage
    .from('document-files')
    .upload(sharedPath, file, { cacheControl: '0', upsert: true });
  if (uploadError) {
    logger.error('Error al subir archivo multirecurso al storage', { data: { uploadError } });
    return { ok: false, error: 'No se pudo subir el archivo al storage' };
  }

  const validity = validityRaw ? new Date(validityRaw) : null;

  try {
    if (resource === 'empleado') {
      const existing = await prisma.documents_employees.findMany({
        where: { applies: { in: appliesIds }, id_document_types: documentTypeId },
        select: { applies: true, state: true, document_path: true },
      });
      // Ya tienen el documento (presentado con archivo) → ignorar
      const alreadyDone = new Set(
        existing.filter((r) => r.state === 'presentado' && r.document_path).map((r) => r.applies)
      );
      // Tienen fila pero falta el archivo (pendiente / sin path) → actualizar
      const toUpdate = existing
        .filter((r) => !alreadyDone.has(r.applies) && r.applies != null)
        .map((r) => r.applies as string);
      // No tienen ninguna fila → crear
      const withRow = new Set(existing.map((r) => r.applies));
      const toCreate = appliesIds.filter((id) => !withRow.has(id));

      const ops = [];
      if (toUpdate.length) {
        ops.push(
          prisma.documents_employees.updateMany({
            where: { applies: { in: toUpdate }, id_document_types: documentTypeId },
            data: {
              state: 'presentado',
              document_path: sharedPath,
              validity,
              period,
              user_id: userId ?? null,
              // 411: si la fila estaba archivada ("ya no aplica"), subir un archivo la reactiva.
              archived_at: null,
              // Reflejar el momento real de la subida (estas filas existían como `pendiente`,
              // su created_at original era el de la alerta, no el de la carga del documento).
              created_at: new Date(),
            },
          })
        );
      }
      if (toCreate.length) {
        ops.push(
          prisma.documents_employees.createMany({
            data: toCreate.map((applies) => ({
              applies,
              id_document_types: documentTypeId,
              state: 'presentado' as const,
              document_path: sharedPath,
              validity,
              period,
              user_id: userId ?? null,
            })),
          })
        );
      }
      await prisma.$transaction(ops);
      return { ok: true, updated: toUpdate.length, created: toCreate.length };
    }

    // resource === 'equipo'
    const existing = await prisma.documents_equipment.findMany({
      where: { applies: { in: appliesIds }, id_document_types: documentTypeId },
      select: { applies: true, state: true, document_path: true },
    });
    const alreadyDone = new Set(
      existing.filter((r) => r.state === 'presentado' && r.document_path).map((r) => r.applies)
    );
    const toUpdate = existing
      .filter((r) => !alreadyDone.has(r.applies) && r.applies != null)
      .map((r) => r.applies as string);
    const withRow = new Set(existing.map((r) => r.applies));
    const toCreate = appliesIds.filter((id) => !withRow.has(id));

    const ops = [];
    if (toUpdate.length) {
      ops.push(
        prisma.documents_equipment.updateMany({
          where: { applies: { in: toUpdate }, id_document_types: documentTypeId },
          data: {
            state: 'presentado',
            document_path: sharedPath,
            validity,
            period,
            user_id: userId ?? null,
            policy_number: policyNumber ?? null,
            // 411: si la fila estaba archivada ("ya no aplica"), subir un archivo la reactiva.
            archived_at: null,
            // Reflejar el momento real de la subida (estas filas existían como `pendiente`,
            // su created_at original era el de la alerta, no el de la carga del documento).
            created_at: new Date(),
          },
        })
      );
    }
    if (toCreate.length) {
      ops.push(
        prisma.documents_equipment.createMany({
          data: toCreate.map((applies) => ({
            applies,
            id_document_types: documentTypeId,
            state: 'presentado' as const,
            document_path: sharedPath,
            validity,
            period,
            user_id: userId ?? null,
            policy_number: policyNumber ?? null,
          })),
        })
      );
    }
    await prisma.$transaction(ops);
    return { ok: true, updated: toUpdate.length, created: toCreate.length };
  } catch (error) {
    // Compensación: la BD falló → borrar el archivo subido para no dejar huérfanos
    logger.error('Error al persistir documentos multirecurso; revirtiendo storage', { data: { error } });
    await supabase.storage.from('document-files').remove([sharedPath]);
    return { ok: false, error: 'No se pudieron guardar los documentos. Se revirtió la subida.' };
  }
}
