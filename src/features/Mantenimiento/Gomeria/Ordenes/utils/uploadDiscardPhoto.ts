import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';

const logger = new Logger('features/Mantenimiento/Gomeria/Ordenes/uploadDiscardPhoto');

const BUCKET = 'tire-discards';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}

/**
 * Uploads a discard photo to Supabase Storage and returns the public URL.
 */
export async function uploadDiscardPhoto(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo supera el tamaño máximo permitido (10 MB)');
  }

  const supabase = supabaseBrowser();
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const path = `${timestamp}_${safeName}`;

  logger.debug('Uploading discard photo', { data: { path, size: file.size } });

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    logger.error('Error uploading discard photo', { data: { error } });
    throw new Error(`Error al subir la foto: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrlData.publicUrl;
}
