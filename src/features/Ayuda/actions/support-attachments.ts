'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import { getReporterEmail } from './getReporterEmail';

const logger = new Logger('features/Ayuda/support-attachments');

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = /^(image\/.+|application\/pdf)$/;

export async function uploadSupportTicketAttachment(formData: FormData): Promise<{ key: string }> {
  const reporter = await getReporterEmail();
  if (!reporter) throw new Error('No hay usuario autenticado');

  const raw = formData.get('file');
  if (!(raw instanceof File)) {
    throw new Error('Archivo inválido');
  }

  if (raw.size === 0) {
    throw new Error('El archivo está vacío');
  }
  if (raw.size > MAX_BYTES) {
    throw new Error('El archivo supera los 10 MB');
  }
  if (!ALLOWED_TYPES.test(raw.type)) {
    throw new Error('Formato no permitido. Solo imagen o PDF.');
  }

  try {
    return await taskAppClient.uploadFile(raw);
  } catch (error) {
    if (error instanceof TaskAppError && error.code === 'config') {
      throw new Error('El servicio de soporte no está configurado');
    }
    logger.error('Error subiendo adjunto', { data: { name: raw.name, size: raw.size, error } });
    throw new Error('No pudimos subir el archivo. Probá de nuevo.');
  }
}
