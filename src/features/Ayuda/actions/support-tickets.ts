'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import { TaskAppError } from '@/shared/lib/taskapp/errors';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { buildTitleWithCategory } from '../constants/categories';
import type { CreateSupportTicketInput } from '../types';
import { getReporterEmail } from './getReporterEmail';

const logger = new Logger('features/Ayuda/support-tickets');

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<Ticket> {
  const reporter = await getReporterEmail();
  if (!reporter) {
    logger.warn('createSupportTicket sin usuario autenticado');
    throw new Error('No hay usuario autenticado');
  }

  logger.info('Creando ticket de soporte', {
    data: { category: input.category, priority: input.priority, email: reporter.email },
  });

  try {
    return await taskAppClient.createTicket({
      title: buildTitleWithCategory(input.category, input.title),
      description: input.description,
      reporter_email: reporter.email,
      reporter_name: reporter.name ?? undefined,
      priority: input.priority,
      attachments: input.attachmentKeys ?? [],
    });
  } catch (error) {
    if (error instanceof TaskAppError && error.code === 'config') {
      throw new Error('El servicio de soporte no está configurado');
    }
    logger.error('Error creando ticket', { data: { error } });
    throw new Error('No pudimos enviar tu reporte. Probá de nuevo en unos minutos.');
  }
}

export async function getMySupportTickets(): Promise<Ticket[]> {
  const reporter = await getReporterEmail();
  if (!reporter) return [];

  try {
    return await taskAppClient.listTicketsByReporter(reporter.email);
  } catch (error) {
    logger.error('Error listando tickets propios', { data: { error } });
    return [];
  }
}

/**
 * Retorna el ticket si el usuario logueado es reporter o approver.
 * Si no tiene acceso o el ticket no existe → null (sin throw, para que la UI
 * muestre un estado "no encontrado").
 */
export async function getSupportTicketById(id: number): Promise<Ticket | null> {
  const reporter = await getReporterEmail();
  if (!reporter) {
    logger.warn('getSupportTicketById sin usuario autenticado', { data: { id } });
    return null;
  }

  let ticket: Ticket;
  try {
    ticket = await taskAppClient.getTicketById(id);
  } catch (error) {
    logger.error('Error obteniendo ticket', { data: { id, error } });
    return null;
  }

  const isReporter = ticket.reporter_email === reporter.email;
  const isApprover = ticket.approver_email === reporter.email;
  if (!isReporter && !isApprover) {
    logger.warn('Acceso denegado al ticket', {
      data: { id, user: reporter.email, reporter: ticket.reporter_email, approver: ticket.approver_email },
    });
    return null;
  }

  return ticket;
}
