import 'server-only';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P3: storage

/**
 * Operaciones de Supabase Storage desde el servidor. Módulo server-only (NO es 'use server'):
 * ninguna función es un endpoint. Las Server Actions que las usan verifican antes que el
 * archivo pertenezca a la empresa activa.
 *
 * P3: storage — se reemplaza por MinIO conservando estas firmas.
 */
const logger = new Logger('shared/lib/storage');

/** Bucket con los archivos de documentos de empleados/equipos/empresa. */
export const DOCUMENT_FILES_BUCKET = 'document-files';
/** Bucket donde se archivan los documentos vencidos al renovarlos. */
export const DOCUMENT_FILES_EXPIRED_BUCKET = 'document-files-expired';

export type StorageResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function storageUpload(
  bucket: string,
  path: string,
  file: File | Blob,
  options: { upsert?: boolean; cacheControl?: string } = {}
): Promise<StorageResult<{ path: string }>> {
  const supabase = await supabaseServer(); // P3: storage
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: options.cacheControl ?? '3600',
    upsert: options.upsert ?? false,
    ...(file instanceof File ? { contentType: file.type } : {}),
  });
  if (error) {
    logger.error('Error al subir archivo al storage', { data: { bucket, path, message: error.message } });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { path: data.path } };
}

export async function storageRemove(bucket: string, paths: string[]): Promise<StorageResult<null>> {
  if (paths.length === 0) return { ok: true, data: null };
  const supabase = await supabaseServer(); // P3: storage
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    logger.error('Error al eliminar archivos del storage', { data: { bucket, paths, message: error.message } });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: null };
}

export async function storageDownload(bucket: string, path: string): Promise<StorageResult<Blob>> {
  const supabase = await supabaseServer(); // P3: storage
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    logger.error('Error al descargar archivo del storage', { data: { bucket, path, message: error?.message } });
    return { ok: false, error: error?.message ?? 'Archivo no encontrado' };
  }
  return { ok: true, data };
}

/** URLs firmadas (una por path, mismo orden) para que el navegador descargue sin credenciales de storage. */
export async function storageSignedUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 60 * 5
): Promise<StorageResult<{ path: string; url: string }[]>> {
  if (paths.length === 0) return { ok: true, data: [] };
  const supabase = await supabaseServer(); // P3: storage
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  if (error || !data) {
    logger.error('Error al firmar URLs del storage', { data: { bucket, count: paths.length, message: error?.message } });
    return { ok: false, error: error?.message ?? 'No se pudieron generar los enlaces' };
  }
  const failed = data.filter((item) => !item.signedUrl);
  if (failed.length > 0) {
    logger.error('Algunas URLs no se pudieron firmar', { data: { bucket, failed: failed.map((f) => f.path) } });
    return { ok: false, error: 'Alguno de los archivos no existe en el storage' };
  }
  return { ok: true, data: data.map((item, i) => ({ path: paths[i], url: item.signedUrl })) };
}

/**
 * URL pública de un archivo de un bucket público (fotos/planos/certificaciones de
 * equipamientos, que se guardan como URL en la base). No consulta la red.
 */
export async function storagePublicUrl(bucket: string, path: string): Promise<string> {
  const supabase = await supabaseServer(); // P3: storage
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
