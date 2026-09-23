import 'server-only';

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@/lib/logger';
import { s3Client, s3PresignClient } from '@/shared/lib/s3';
import { buildStorageFileUrl } from '@/shared/lib/storage-url';

/**
 * Operaciones de storage (MinIO/S3) desde el servidor. Módulo server-only (NO es 'use server'):
 * ninguna función es un endpoint. Las Server Actions que las usan verifican antes que el
 * archivo pertenezca a la empresa activa.
 *
 * Reemplaza a Supabase Storage conservando las firmas previas, más `storageList` y
 * `storageMove` que antes se hacían con el cliente de Supabase a mano.
 */
const logger = new Logger('shared/lib/storage');

/** Bucket con los archivos de documentos de empleados/equipos/empresa. */
export const DOCUMENT_FILES_BUCKET = 'document-files';
/** Bucket donde se archivan los documentos vencidos al renovarlos. */
export const DOCUMENT_FILES_EXPIRED_BUCKET = 'document-files-expired';

export type StorageResult<T> = { ok: true; data: T } | { ok: false; error: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** `true` si el objeto existe. Cualquier error que no sea 404 se propaga. */
async function objectExists(bucket: string, path: string): Promise<boolean> {
  try {
    await s3Client().send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
    return true;
  } catch (error) {
    // S3 devuelve `NotFound` (HeadObject no trae cuerpo) o `NoSuchKey`.
    const name = (error as { name?: string })?.name;
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) return false;
    throw error;
  }
}

async function toBytes(file: File | Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * Sube `file` a `bucket/path`.
 *
 * `upsert: false` (el default) rechaza el archivo si ya existe: S3 pisa siempre, así que la
 * exclusividad se resuelve con un `HeadObject` previo. Conserva el comportamiento y el
 * mensaje que devolvía Supabase, del que dependen los reintentos del llamador.
 */
export async function storageUpload(
  bucket: string,
  path: string,
  file: File | Blob,
  options: { upsert?: boolean; cacheControl?: string } = {}
): Promise<StorageResult<{ path: string }>> {
  try {
    if (!options.upsert && (await objectExists(bucket, path))) {
      return { ok: false, error: 'The resource already exists' };
    }
    const contentType = file instanceof File && file.type ? file.type : ((file as Blob).type ?? undefined);
    await s3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: await toBytes(file),
        CacheControl: options.cacheControl ?? '3600',
        ...(contentType ? { ContentType: contentType } : {}),
      })
    );
    return { ok: true, data: { path } };
  } catch (error) {
    const message = errorMessage(error, 'No se pudo subir el archivo');
    logger.error('Error al subir archivo al storage', { data: { bucket, path, message } });
    return { ok: false, error: message };
  }
}

/** Borra los objetos indicados. Borrar algo inexistente no es error (igual que en S3). */
export async function storageRemove(bucket: string, paths: string[]): Promise<StorageResult<null>> {
  if (paths.length === 0) return { ok: true, data: null };
  try {
    // Uno por uno en vez de `DeleteObjects`: los lotes acá son de 1–3 archivos y el batch
    // exige un checksum del cuerpo que no todas las versiones de MinIO aceptan.
    await Promise.all(paths.map((path) => s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))));
    return { ok: true, data: null };
  } catch (error) {
    const message = errorMessage(error, 'No se pudieron eliminar los archivos');
    logger.error('Error al eliminar archivos del storage', { data: { bucket, paths, message } });
    return { ok: false, error: message };
  }
}

export async function storageDownload(bucket: string, path: string): Promise<StorageResult<Blob>> {
  try {
    const response = await s3Client().send(new GetObjectCommand({ Bucket: bucket, Key: path }));
    if (!response.Body) return { ok: false, error: 'Archivo no encontrado' };
    const bytes = await response.Body.transformToByteArray();
    return { ok: true, data: new Blob([bytes as BlobPart], { type: response.ContentType ?? 'application/octet-stream' }) };
  } catch (error) {
    const message = errorMessage(error, 'Archivo no encontrado');
    logger.error('Error al descargar archivo del storage', { data: { bucket, path, message } });
    return { ok: false, error: message };
  }
}

/** Entrada de `storageList`: el NOMBRE del hijo inmediato de `prefix`, sin la ruta. */
export type StorageEntry = { name: string };

/**
 * Hijos inmediatos de `prefix` dentro del bucket (equivalente al `list()` de Supabase):
 * devuelve sólo el último segmento, sin recursión.
 */
export async function storageList(bucket: string, prefix: string): Promise<StorageResult<StorageEntry[]>> {
  const normalized = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix;
  try {
    const entries: StorageEntry[] = [];
    let token: string | undefined;
    do {
      const response = await s3Client().send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: normalized || undefined,
          Delimiter: '/',
          ContinuationToken: token,
        })
      );
      for (const object of response.Contents ?? []) {
        if (!object.Key || object.Key === normalized) continue;
        entries.push({ name: object.Key.slice(normalized.length) });
      }
      token = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (token);
    return { ok: true, data: entries };
  } catch (error) {
    const message = errorMessage(error, 'No se pudo listar el bucket');
    logger.error('Error al listar el storage', { data: { bucket, prefix, message } });
    return { ok: false, error: message };
  }
}

/**
 * Mueve un objeto dentro del mismo bucket (copiar + borrar: S3 no tiene `move`).
 *
 * `overwrite: false` (el default) falla si el destino existe, con el mismo mensaje que
 * devolvía Supabase (`already exists`), del que depende el reintento de `movePreparteFile`.
 */
export async function storageMove(
  bucket: string,
  fromPath: string,
  toPath: string,
  options: { overwrite?: boolean } = {}
): Promise<StorageResult<{ path: string }>> {
  if (fromPath === toPath) return { ok: true, data: { path: toPath } };
  try {
    if (!options.overwrite && (await objectExists(bucket, toPath))) {
      return { ok: false, error: 'The resource already exists' };
    }
    await s3Client().send(
      new CopyObjectCommand({
        Bucket: bucket,
        // `CopySource` es `/<bucket>/<key>` y va URL-encodeado: las keys tienen espacios y tildes.
        CopySource: `/${bucket}/${encodeURIComponent(fromPath).replace(/%2F/g, '/')}`,
        Key: toPath,
      })
    );
    await s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: fromPath }));
    return { ok: true, data: { path: toPath } };
  } catch (error) {
    const message = errorMessage(error, 'No se pudo mover el archivo');
    logger.error('Error al mover un archivo del storage', { data: { bucket, fromPath, toPath, message } });
    return { ok: false, error: message };
  }
}

/**
 * URLs firmadas (una por path, mismo orden) para que el navegador descargue sin credenciales
 * de storage. Son EFÍMERAS: nunca se guardan en la base, se emiten en cada request desde una
 * action que ya verificó el perímetro.
 *
 * Se firman contra el endpoint público de MinIO (ver `s3PresignClient`) y se valida que el
 * objeto exista antes de firmar: S3 firma cualquier key, y el llamador espera que una URL
 * devuelta sea descargable.
 */
export async function storageSignedUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 60 * 5
): Promise<StorageResult<{ path: string; url: string }[]>> {
  if (paths.length === 0) return { ok: true, data: [] };
  try {
    const existing = await Promise.all(paths.map((path) => objectExists(bucket, path)));
    const missing = paths.filter((_, i) => !existing[i]);
    if (missing.length > 0) {
      logger.error('Algunas URLs no se pudieron firmar', { data: { bucket, failed: missing } });
      return { ok: false, error: 'Alguno de los archivos no existe en el storage' };
    }
    const client = s3PresignClient();
    const urls = await Promise.all(
      paths.map((path) =>
        getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: path }), { expiresIn: expiresInSeconds })
      )
    );
    return { ok: true, data: paths.map((path, i) => ({ path, url: urls[i] })) };
  } catch (error) {
    const message = errorMessage(error, 'No se pudieron generar los enlaces');
    logger.error('Error al firmar URLs del storage', { data: { bucket, count: paths.length, message } });
    return { ok: false, error: message };
  }
}

/**
 * URL ESTABLE de un archivo, para guardar en la base (logo de empresa, fotos de equipamiento,
 * imágenes de reparación, firmas de ropa...).
 *
 * Apunta a la ruta proxy `/api/files/...` de la app, que valida el perímetro de empresa y
 * hace stream desde MinIO. NO es una URL firmada a propósito: estas URLs quedan PERSISTIDAS
 * (`company.company_logo`, `other_equipment_certifications.file_url`,
 * `maintenance_order_items.images`, `tires.discard_photo`, `clothing_deliveries.signature_url`,
 * `preparte.preparteImage`, `profile.avatar`), así que una firma con vencimiento dejaría el
 * registro roto al caducar. Ver `storage-url.ts`.
 */
export async function storagePublicUrl(bucket: string, path: string): Promise<string> {
  return buildStorageFileUrl(bucket, path);
}
