'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('shared/errors');

/**
 * Registra en `handle_errors` un mensaje de error sin traducción conocida, para revisarlo
 * después (lo dispara `translateErrorMessage` desde el cliente, fire-and-forget).
 */
export async function logHandledError(message: string, path: string): Promise<void> {
  try {
    await prisma.handle_errors.create({ data: { menssage: message, path } });
  } catch (error) {
    logger.error('No se pudo registrar el error en handle_errors', { data: { error, message } });
  }
}
