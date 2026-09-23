'use server';

import { Logger } from '@/lib/logger';
import { isClientUploadBucket } from '@/shared/lib/storage-buckets';
import { buildStorageFileUrl } from '@/shared/lib/storage-url';
import { storageUpload } from '@/shared/lib/storage';
import { getActiveCompanyId } from '@/shared/lib/tenant';

/**
 * Subida de una imagen desde el navegador (el archivo viaja en un FormData a esta action).
 *
 * Es un ENDPOINT: todo lo que recibe viene del cliente y no se le cree nada.
 * Antes tomaba el bucket y el path tal cual y los pasaba al storage, así que cualquiera con
 * sesión podía escribir en cualquier bucket y en cualquier carpeta —incluso pisar el logo o
 * un documento de otra empresa—. Ahora:
 *
 * - el bucket tiene que estar en `CLIENT_UPLOAD_BUCKETS` (los únicos que se suben desde el
 *   navegador); los documentos, remitos y contratos se suben desde actions que arman el
 *   path ellas mismas;
 * - la carpeta la pone el servidor: la key final es `<empresa activa>/<nombre saneado>`, y
 *   el nombre que manda el cliente se reduce a un nombre de archivo (sin barras ni `..`);
 * - se devuelve la URL ya armada, para que el llamador no la construya a mano.
 */
const logger = new Logger('shared/storage');

export type StorageUploadResult = { ok: true; path: string; url: string } | { ok: false; error: string };

/** Nombre de archivo seguro: sin rutas, sin tildes, sin espacios y sin `..`. */
function toFileName(name: string): string {
  const base = name.split('/').pop()?.split('\\').pop() ?? '';
  const clean = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '');
  return clean || `archivo-${Date.now()}`;
}

/**
 * Sube `file` al bucket indicado, dentro de la carpeta de la empresa activa.
 * Devuelve la key guardada y su URL estable, o el mensaje de error del storage (sin lanzar,
 * para que el llamador lo traduzca con `handleSupabaseError`).
 */
export async function uploadToStorage(
  bucket: string,
  fileName: string,
  file: File,
  options: { upsert?: boolean; cacheControl?: string } = {}
): Promise<StorageUploadResult> {
  if (!isClientUploadBucket(bucket)) {
    logger.warn('Subida rechazada: bucket no habilitado para el cliente', { data: { bucket } });
    return { ok: false, error: 'No se puede subir a ese destino' };
  }

  let companyId: string;
  try {
    companyId = await getActiveCompanyId();
  } catch {
    return { ok: false, error: 'No hay empresa activa' };
  }

  const path = `${companyId}/${toFileName(fileName)}`;
  const uploaded = await storageUpload(bucket, path, file, options);
  if (!uploaded.ok) {
    logger.error('Error al subir archivo al storage', { data: { bucket, path, message: uploaded.error } });
    return { ok: false, error: uploaded.error };
  }
  return { ok: true, path: uploaded.data.path, url: buildStorageFileUrl(bucket, uploaded.data.path) };
}
