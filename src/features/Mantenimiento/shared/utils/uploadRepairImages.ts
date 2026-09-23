'use server';

import { getResourceCompanyId } from '@/features/Mantenimiento/shared/resource-company';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { storagePublicUrl, storageUpload } from '@/shared/lib/storage';
import { MAX_REPAIR_IMAGE_SIZE, REPAIR_IMAGES_BUCKET, assertValidImageFile, sanitizeFileName } from './repair-images';

const logger = new Logger('features/Mantenimiento/uploadRepairImages');

/**
 * Sube las fotos de una reparación y devuelve sus URLs estables (`/api/files/...`).
 *
 * Server Action: el navegador ya no habla con el storage. La carpeta se arma en el
 * servidor como `<empresa>/<equipo>/...`, y la empresa sale del propio equipo (nunca del
 * cliente) porque este flujo también corre desde el QR anónimo.
 */
export async function uploadRepairImages(files: File[], equipmentId: string): Promise<string[]> {
  if (files.length === 0) return [];

  // Tipo y tamaño se validan antes de subir nada: si un archivo no pasa, no tiene
  // sentido haber subido los anteriores. (El `accept` del formulario es cosmético; la
  // Server Action recibe cualquier archivo, así que la validación real va acá.)
  for (const file of files) {
    assertValidImageFile(file, MAX_REPAIR_IMAGE_SIZE);
  }

  const companyId = await getResourceCompanyId(prisma, 'vehicle', equipmentId);

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
      const path = `${companyId}/${equipmentId}/${batchStamp}_${index}_${sanitizeFileName(file.name)}`;

      const result = await storageUpload(REPAIR_IMAGES_BUCKET, path, file);

      if (!result.ok) {
        logger.error('Error al subir imagen de reparación', { data: { error: result.error, path } });
        throw new Error(`Error al subir la imagen "${file.name}": ${result.error}`);
      }

      return storagePublicUrl(REPAIR_IMAGES_BUCKET, path);
    })
  );
}
