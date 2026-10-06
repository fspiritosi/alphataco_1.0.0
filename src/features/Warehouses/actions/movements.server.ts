'use server';

import { revalidatePath } from 'next/cache';
import { checkPermissionServer } from '@/features/Permissions';
import { fail, ok, type ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { Logger } from '@/lib/logger';
import { getServerAuthProfile } from '@/shared/actions/auth.actions';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { toActionError } from '../lib/action-errors';
import { DESTINATION_SELECT, destinationLabel } from '../lib/labels';
import { registerStockMovement, reverseStockMovement } from '../lib/stock-engine';
import { stockMovementSchema, toStockMovementInput, type StockMovementFormValues } from '../schemas/stock-movement';

const logger = new Logger('features/Warehouses/movements');

const WAREHOUSE_PATH = '/dashboard/warehouse';

/** Un id que no es uuid haria fallar la query de Prisma: se responde como "no existe". */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un movimiento con muchas lineas toma varios locks: mas margen que los 5 s por defecto. */
const TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 5_000 };

export interface MovementResult {
  id: string;
  number: string;
  lineCount: number;
  /** `null` si el usuario no tiene `view_prices`. */
  totalCost: string | null;
}

/** Registra entrada, salida, transferencia o ajuste. Los ajustes piden `adjust`; el resto `create`. */
export async function registerStockMovementAction(values: StockMovementFormValues): Promise<ActionResult<MovementResult>> {
  const parsed = stockMovementSchema.safeParse(values);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const action = parsed.data.type === 'ADJUSTMENT' ? 'adjust' : 'create';
  const [allowed, canViewPrices] = await Promise.all([
    checkPermissionServer('almacenes', 'movimientos', action),
    checkPermissionServer('almacenes', 'movimientos', 'view_prices'),
  ]);
  if (!allowed) {
    return fail(action === 'adjust' ? 'No tenés permiso para ajustar stock' : 'No tenés permiso para registrar movimientos');
  }

  const profile = await getServerAuthProfile();
  if (!profile) return fail('Tu sesión expiró. Volvé a ingresar.');
  const companyId = await getActiveCompanyId();

  try {
    const registered = await withActor(
      profile.credentialId,
      (tx) => registerStockMovement(tx, companyId, profile.id, toStockMovementInput(parsed.data)),
      prisma,
      TRANSACTION_OPTIONS
    );
    logger.info('Movimiento registrado', { data: { id: registered.id, number: registered.number } });
    revalidatePath(WAREHOUSE_PATH);
    return ok({
      id: registered.id,
      number: registered.number,
      lineCount: registered.lineCount,
      totalCost: canViewPrices ? registered.totalCost.toFixed(2) : null,
    });
  } catch (error) {
    return toActionError(error, logger, 'registrar el movimiento');
  }
}

/** Anula un movimiento con otro de efecto inverso. */
export async function reverseStockMovementAction(movementId: string, reason: string): Promise<ActionResult<MovementResult>> {
  const [allowed, canViewPrices] = await Promise.all([
    checkPermissionServer('almacenes', 'movimientos', 'reverse'),
    checkPermissionServer('almacenes', 'movimientos', 'view_prices'),
  ]);
  if (!allowed) return fail('No tenés permiso para anular movimientos');

  const profile = await getServerAuthProfile();
  if (!profile) return fail('Tu sesión expiró. Volvé a ingresar.');
  const companyId = await getActiveCompanyId();

  try {
    const reversal = await withActor(
      profile.credentialId,
      (tx) => reverseStockMovement(tx, companyId, profile.id, movementId, reason),
      prisma,
      TRANSACTION_OPTIONS
    );
    logger.info('Movimiento anulado', { data: { original: movementId, reversal: reversal.number } });
    revalidatePath(WAREHOUSE_PATH);
    return ok({
      id: reversal.id,
      number: reversal.number,
      lineCount: reversal.lineCount,
      totalCost: canViewPrices ? reversal.totalCost.toFixed(2) : null,
    });
  } catch (error) {
    return toActionError(error, logger, 'anular el movimiento');
  }
}

/**
 * Detalle de un movimiento. Sin `view_prices` los costos NO salen del servidor (no alcanza con
 * ocultarlos en pantalla).
 */
export async function getStockMovementDetail(id: string) {
  const [canView, canViewPrices, canReverse] = await Promise.all([
    checkPermissionServer('almacenes', 'movimientos', 'view'),
    checkPermissionServer('almacenes', 'movimientos', 'view_prices'),
    checkPermissionServer('almacenes', 'movimientos', 'reverse'),
  ]);
  if (!canView || !UUID_RE.test(id)) return null;
  const companyId = await getActiveCompanyId();

  const movement = await prisma.stock_movements.findFirst({
    where: { id, company_id: companyId },
    select: {
      id: true,
      number: true,
      type: true,
      occurred_on: true,
      created_at: true,
      reference: true,
      notes: true,
      total_cost: true,
      warehouse: { select: { id: true, code: true, name: true } },
      target_warehouse: { select: { id: true, code: true, name: true } },
      creator: { select: { fullname: true, email: true } },
      reverses: { select: { id: true, number: true } },
      reversed_by: { select: { id: true, number: true } },
      ...DESTINATION_SELECT,
      lines: {
        select: {
          id: true,
          quantity: true,
          direction: true,
          unit_cost: true,
          total_cost: true,
          material: { select: { id: true, code: true, name: true, unit: { select: { abbreviation: true } } } },
          batch: { select: { batch_number: true, expires_at: true } },
          unit: { select: { serial_number: true } },
        },
        orderBy: [{ material: { name: 'asc' } }, { id: 'asc' }],
      },
    },
  });
  if (!movement) return null;

  return {
    id: movement.id,
    number: movement.number,
    type: movement.type,
    occurredOn: movement.occurred_on.toISOString().slice(0, 10),
    createdAt: movement.created_at.toISOString(),
    reference: movement.reference,
    notes: movement.notes,
    warehouse: movement.warehouse,
    targetWarehouse: movement.target_warehouse,
    createdBy: movement.creator.fullname ?? movement.creator.email ?? 'Usuario',
    reverses: movement.reverses,
    reversedBy: movement.reversed_by,
    destinationType: movement.destination_type,
    destination: destinationLabel(movement),
    totalCost: canViewPrices ? movement.total_cost.toFixed(2) : null,
    canReverse: canReverse && !movement.reverses && !movement.reversed_by,
    lines: movement.lines.map((l) => ({
      id: l.id,
      material: { id: l.material.id, code: l.material.code, name: l.material.name, unit: l.material.unit.abbreviation },
      quantity: l.quantity.toString(),
      direction: l.direction,
      batch: l.batch
        ? { number: l.batch.batch_number, expiresAt: l.batch.expires_at?.toISOString().slice(0, 10) ?? null }
        : null,
      serialNumber: l.unit?.serial_number ?? null,
      unitCost: canViewPrices ? l.unit_cost.toFixed(4) : null,
      totalCost: canViewPrices ? l.total_cost.toFixed(2) : null,
    })),
  };
}

export type StockMovementDetail = NonNullable<Awaited<ReturnType<typeof getStockMovementDetail>>>;
