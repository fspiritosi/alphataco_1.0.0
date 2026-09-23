'use server';

import { getVehicleCompanyId } from '@/features/Mantenimiento/Gomeria/shared/perimeter';
import { assertValidImageFile, sanitizeFileName } from '@/features/Mantenimiento/shared/utils/repair-images';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { storagePublicUrl, storageUpload } from '@/shared/lib/storage'; // P3: storage

const logger = new Logger('features/Mantenimiento/Gomeria/Ordenes/uploadDiscardPhoto');

const BUCKET = 'tire-discards';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Sube la foto de descarte/reparación de una cubierta y devuelve su URL pública.
 *
 * Server Action: el navegador ya no habla con el storage. La carpeta se arma en el
 * servidor como `<empresa>/<vehículo>/...` y la empresa sale del vehículo, no de la
 * sesión: el descarte también se registra desde el QR anónimo, donde el operario puede no
 * ser miembro de la empresa del equipo.
 */
export async function uploadDiscardPhoto(file: File, vehicleId: string): Promise<string> {
  // Tipo y tamaño se validan en el servidor: el `accept` del input no es una garantía.
  assertValidImageFile(file, MAX_FILE_SIZE);

  const companyId = await getVehicleCompanyId(prisma, vehicleId);

  const path = `${companyId}/${vehicleId}/${Date.now()}_${sanitizeFileName(file.name)}`;

  logger.debug('Subiendo foto de descarte', { data: { path, size: file.size } });

  const result = await storageUpload(BUCKET, path, file); // P3: storage

  if (!result.ok) {
    logger.error('Error al subir la foto de descarte', { data: { error: result.error, path } });
    throw new Error(`Error al subir la foto: ${result.error}`);
  }

  return storagePublicUrl(BUCKET, path); // P3: storage
}
