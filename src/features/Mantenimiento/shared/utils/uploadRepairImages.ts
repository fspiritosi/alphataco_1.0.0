import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';

const logger = new Logger('features/Mantenimiento/uploadRepairImages');

/** Bucket ya existente en el proyecto, usado por el flujo anterior de solicitudes de reparación */
const BUCKET = 'repair-images';
export const MAX_REPAIR_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}

/**
 * Sube las fotos de una reparación y devuelve sus URLs públicas.
 *
 * Se agrupan por equipo para que el bucket quede navegable y no se pisen nombres
 * entre pedidos distintos del mismo día.
 */
export async function uploadRepairImages(files: File[], equipmentId: string): Promise<string[]> {
  if (files.length === 0) return [];

  const supabase = supabaseBrowser();

  // El tamaño se valida antes de subir nada: si un archivo no entra, no tiene
  // sentido haber subido los anteriores. (El formulario ya lo valida al elegir
  // el archivo; esto es la red de seguridad del lado de la subida.)
  const tooBig = files.find((file) => file.size > MAX_REPAIR_IMAGE_SIZE);
  if (tooBig) {
    throw new Error(`La imagen "${tooBig.name}" supera el tamaño máximo permitido (10 MB)`);
  }

  // En paralelo: son pocas fotos por reparación y el flujo por QR se usa desde
  // el celular en obra, donde encadenar round trips se nota.
  //
  // El path lleva el indice ademas del timestamp: dentro de un `Promise.all` todas
  // las subidas se crean en el mismo tick, asi que `Date.now()` devuelve el MISMO
  // valor para todas. Dos archivos con igual nombre (dos capturas de pantalla, la
  // misma foto elegida dos veces) generaban el mismo path y, con `upsert: false`,
  // la segunda fallaba y se perdia el lote entero.
  const batchStamp = Date.now();

  return Promise.all(
    files.map(async (file, index) => {
      const path = `${equipmentId}/${batchStamp}_${index}_${sanitizeFileName(file.name)}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        logger.error('Error al subir imagen de reparación', { data: { error, path } });
        throw new Error(`Error al subir la imagen "${file.name}": ${error.message}`);
      }

      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    })
  );
}
