'use server';

import { Logger } from '@/lib/logger';
import { taskAppClient } from '@/shared/lib/taskapp/client';
import type { Ticket } from '@/shared/lib/taskapp/types';
import { getReporterEmail } from './getReporterEmail';
import { getSupportTicketById } from './support-tickets';

const logger = new Logger('features/Ayuda/support-approval');

async function assertCanApprove(ticketId: number): Promise<{ approverEmail: string; ticket: Ticket }> {
  const reporter = await getReporterEmail();
  if (!reporter) throw new Error('No hay usuario autenticado');

  const ticket = await getSupportTicketById(ticketId);
  if (!ticket) throw new Error('No tenés acceso a este ticket');

  if (ticket.approver_email !== reporter.email) {
    logger.warn('Usuario no es approver', {
      data: { ticketId, user: reporter.email, approver: ticket.approver_email },
    });
    throw new Error('No sos el aprobador asignado a este ticket');
  }

  if (ticket.status?.slug !== 'valued') {
    throw new Error('El ticket no está en estado "Valuado"');
  }

  return { approverEmail: reporter.email, ticket };
}

export async function approveSupportTicket(ticketId: number): Promise<Ticket> {
  const { approverEmail } = await assertCanApprove(ticketId);
  logger.info('Aprobando ticket', { data: { ticketId, approverEmail } });
  try {
    return await taskAppClient.approveTicket(ticketId, approverEmail);
  } catch (error) {
    logger.error('Error aprobando ticket', { data: { ticketId, error } });
    throw new Error('No pudimos registrar la aprobación. Probá de nuevo.');
  }
}

export async function rejectSupportTicket(ticketId: number): Promise<Ticket> {
  const { approverEmail } = await assertCanApprove(ticketId);
  logger.info('Rechazando ticket', { data: { ticketId, approverEmail } });
  try {
    return await taskAppClient.rejectTicket(ticketId, approverEmail);
  } catch (error) {
    logger.error('Error rechazando ticket', { data: { ticketId, error } });
    throw new Error('No pudimos registrar el rechazo. Probá de nuevo.');
  }
}
