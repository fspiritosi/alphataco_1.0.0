import 'server-only';

import type { Prisma } from '@/generated/prisma/client';

export type ResourceTable = 'employees' | 'vehicles';

type Tx = Pick<Prisma.TransactionClient, '$executeRaw'>;

/**
 * Mantiene `employees.allocated_to` / `vehicles.allocated_to` (uuid[]) igual a la pivote
 * `contractor_employee` / `contractor_equipment`: agrega el id del cliente a los recursos de
 * alta y lo quita de los de baja. Idempotente (no duplica ni falla si ya estaba/no estaba).
 */
export async function syncAllocatedTo(
  tx: Tx,
  table: ResourceTable,
  customerId: string,
  toAdd: readonly string[],
  toRemove: readonly string[]
): Promise<void> {
  if (toAdd.length > 0) {
    if (table === 'employees') {
      await tx.$executeRaw`
        UPDATE public.employees
        SET allocated_to = array_append(coalesce(allocated_to, '{}'::uuid[]), ${customerId}::uuid)
        WHERE id = ANY(${[...toAdd]}::uuid[]) AND NOT (${customerId}::uuid = ANY(coalesce(allocated_to, '{}'::uuid[])))`;
    } else {
      await tx.$executeRaw`
        UPDATE public.vehicles
        SET allocated_to = array_append(coalesce(allocated_to, '{}'::uuid[]), ${customerId}::uuid)
        WHERE id = ANY(${[...toAdd]}::uuid[]) AND NOT (${customerId}::uuid = ANY(coalesce(allocated_to, '{}'::uuid[])))`;
    }
  }
  if (toRemove.length > 0) {
    if (table === 'employees') {
      await tx.$executeRaw`
        UPDATE public.employees
        SET allocated_to = array_remove(allocated_to, ${customerId}::uuid)
        WHERE id = ANY(${[...toRemove]}::uuid[]) AND ${customerId}::uuid = ANY(coalesce(allocated_to, '{}'::uuid[]))`;
    } else {
      await tx.$executeRaw`
        UPDATE public.vehicles
        SET allocated_to = array_remove(allocated_to, ${customerId}::uuid)
        WHERE id = ANY(${[...toRemove]}::uuid[]) AND ${customerId}::uuid = ANY(coalesce(allocated_to, '{}'::uuid[]))`;
    }
  }
}
