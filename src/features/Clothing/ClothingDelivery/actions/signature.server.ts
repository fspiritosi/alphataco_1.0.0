'use server';

import { getClothingOperatorCompanyId } from '@/features/Clothing/actions/perimeter';
import { Logger } from '@/lib/logger';
import { storagePublicUrl, storageUpload } from '@/shared/lib/storage';

const logger = new Logger('features/Clothing/Delivery/signature');

const SIGNATURES_BUCKET = 'clothing-signatures';

/**
 * Sube la firma (imagen base64) al storage y devuelve su URL estable.
 *
 * Perímetro: la carpeta es la empresa del operario de la sesión; antes el `companyId`
 * llegaba del cliente y se podía escribir en la carpeta de cualquier empresa.
 */
export async function uploadSignatureImage(base64Data: string) {
  const companyId = await getClothingOperatorCompanyId();
  logger.debug('Uploading signature image');

  // Saca el prefijo del data URL si viene (ej. "data:image/png;base64,...")
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'image/png' });
  const fileName = `${companyId}/${Date.now()}-signature.png`;

  const uploaded = await storageUpload(SIGNATURES_BUCKET, fileName, blob);
  if (!uploaded.ok) {
    logger.error('Error uploading signature to storage', { data: { error: uploaded.error } });
    throw new Error(uploaded.error);
  }

  const url = await storagePublicUrl(SIGNATURES_BUCKET, uploaded.data.path);
  logger.info('Signature uploaded successfully', { data: { path: uploaded.data.path } });
  return { url };
}
