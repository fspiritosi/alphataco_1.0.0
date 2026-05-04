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
}

type PrismaLike = Prisma.TransactionClient | typeof prisma;

/**
 * Inserta una entrada en maintenance_activity_log.
 * Acepta el cliente prisma directo o un TransactionClient para usar dentro de prisma.$transaction.
 */
export async function logActivity(client: PrismaLike, entry: LogActivityInput): Promise<void> {
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
    },
  });
}
