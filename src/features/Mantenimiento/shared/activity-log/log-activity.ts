import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { ActivityActionType } from './action-types';

export interface LogActivityInput {
  maintenanceRequestId?: string | null;
  maintenanceOrderId?: string | null;
  workOrderId?: string | null;
  actionType: ActivityActionType;
  performedBy: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown>;
  /** Empresa dueña del registro. Si se omite, se toma de la orden, la solicitud o la OT vinculada. */
  companyId?: string | null;
}

type PrismaLike = Prisma.TransactionClient | typeof prisma;

/**
 * Resuelve la empresa del log a partir de la entidad de mantenimiento a la que pertenece
 * (misma empresa que la orden / solicitud / OT vinculada).
 */
async function resolveActivityCompanyId(client: PrismaLike, entry: LogActivityInput): Promise<string> {
  if (entry.companyId) return entry.companyId;

  if (entry.maintenanceOrderId) {
    const order = await client.maintenance_orders.findUnique({
      where: { id: entry.maintenanceOrderId },
      select: { company_id: true },
    });
    if (order) return order.company_id;
  }

  if (entry.maintenanceRequestId) {
    const request = await client.maintenance_requests.findUnique({
      where: { id: entry.maintenanceRequestId },
      select: { company_id: true },
    });
    if (request) return request.company_id;
  }

  if (entry.workOrderId) {
    const workOrder = await client.work_orders.findUnique({
      where: { id: entry.workOrderId },
      select: { company_id: true },
    });
    if (workOrder) return workOrder.company_id;
  }

  throw new Error('No se pudo determinar la empresa para registrar la actividad de mantenimiento');
}

/**
 * Inserta una entrada en maintenance_activity_log.
 * Acepta el cliente prisma directo o un TransactionClient para usar dentro de prisma.$transaction.
 */
export async function logActivity(client: PrismaLike, entry: LogActivityInput): Promise<void> {
  const companyId = await resolveActivityCompanyId(client, entry);

  await client.maintenance_activity_log.create({
    data: {
      maintenance_request_id: entry.maintenanceRequestId ?? null,
      maintenance_order_id: entry.maintenanceOrderId ?? null,
      work_order_id: entry.workOrderId ?? null,
      action_type: entry.actionType,
      performed_by: entry.performedBy,
      previous_status: entry.previousStatus ?? null,
      new_status: entry.newStatus ?? null,
      notes: entry.notes ?? null,
      rejection_reason: entry.rejectionReason ?? null,
      metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      company_id: companyId,
    },
  });
}
