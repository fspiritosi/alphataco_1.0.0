'use server';

import { getClothingOperatorCompanyId } from '@/features/Clothing/actions/perimeter';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P3: storage

const logger = new Logger('features/Clothing/Delivery/signature');

/**
 * Sube la firma (imagen base64) al storage y devuelve su URL pública.
 *
 * Perímetro: la carpeta es la empresa del operario de la sesión; antes el `companyId`
 * llegaba del cliente y se podía escribir en la carpeta de cualquier empresa.
 */
export async function uploadSignatureImage(base64Data: string) {
  const companyId = await getClothingOperatorCompanyId();
  logger.debug('Uploading signature image');

  try {
    // Saca el prefijo del data URL si viene (ej. "data:image/png;base64,...")
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64, 'base64');
    const fileName = `${companyId}/${Date.now()}-signature.png`;

    const supabase = await supabaseServer(); // P3: storage

    const { error } = await supabase.storage.from('clothing-signatures').upload(fileName, buffer, { // P3: storage
      contentType: 'image/png',
      upsert: false,
    });

    if (error) {
      logger.error('Error uploading signature to storage', { data: { error } });
      throw new Error(error.message);
    }

    const { data: urlData } = supabase.storage.from('clothing-signatures').getPublicUrl(fileName); // P3: storage

    logger.info('Signature uploaded successfully', { data: { url: urlData.publicUrl } });
    return { url: urlData.publicUrl };
  } catch (error) {
    logger.error('Error uploading signature image', { data: { error } });
    throw error;
  }
}
