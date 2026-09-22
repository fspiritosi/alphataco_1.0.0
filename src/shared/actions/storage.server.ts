'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P3: storage

/**
 * Subidas a Supabase Storage desde el servidor (el archivo viaja en un FormData).
 * P3: storage — se reemplaza por MinIO; los llamadores (`uploadDocumentFile`, `useImageUpload`)
 * conservan su firma.
 */
const logger = new Logger('shared/storage');

/** Bucket con los archivos de documentos de empleados/equipos/empresa. */
export const DOCUMENT_FILES_BUCKET = 'document-files';

export type StorageUploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Sube `file` a `bucket` en `path`. `upsert` pisa el archivo existente.
 * Devuelve el path guardado o el mensaje de error del storage (sin lanzar, para que el
 * llamador lo traduzca con `handleSupabaseError`).
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
  options: { upsert?: boolean; cacheControl?: string } = {}
): Promise<StorageUploadResult> {
  const supabase = await supabaseServer(); // P3: storage
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: options.cacheControl ?? '3600',
    upsert: options.upsert ?? false,
    contentType: file.type,
  });

  if (error) {
    logger.error('Error al subir archivo al storage', { data: { bucket, path, message: error.message } });
    return { ok: false, error: error.message };
  }
  return { ok: true, path: data.path };
}
