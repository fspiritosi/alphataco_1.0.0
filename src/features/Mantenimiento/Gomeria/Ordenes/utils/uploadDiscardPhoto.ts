'use server';

import { sanitizeFileName } from '@/features/Mantenimiento/shared/utils/repair-images';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { storagePublicUrl, storageUpload } from '@/shared/lib/storage'; // P3: storage
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Mantenimiento/Gomeria/Ordenes/uploadDiscardPhoto');

const BUCKET = 'tire-discards';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Sube la foto de descarte/reparación de una cubierta y devuelve su URL pública.
 *
 * Server Action: el navegador ya no habla con el storage. La carpeta se arma en el
 * servidor como `<empresa>/<vehículo>/...`; la empresa sale del vehículo y se verifica
 * contra la empresa activa antes de escribir.
 */
export async function uploadDiscardPhoto(file: File, vehicleId: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo supera el tamaño máximo permitido (10 MB)');
  }

  const companyId = await getActiveCompanyId();

  const vehicle = await prisma.vehicles.findFirst({
    where: { id: vehicleId, company_id: companyId },
    select: { id: true },
  });
  if (!vehicle) throw new Error('El equipo no pertenece a la empresa activa');

  const path = `${companyId}/${vehicleId}/${Date.now()}_${sanitizeFileName(file.name)}`;

  logger.debug('Subiendo foto de descarte', { data: { path, size: file.size } });

  const result = await storageUpload(BUCKET, path, file); // P3: storage

  if (!result.ok) {
    logger.error('Error al subir la foto de descarte', { data: { error: result.error, path } });
    throw new Error(`Error al subir la foto: ${result.error}`);
  }

  return storagePublicUrl(BUCKET, path); // P3: storage
}
