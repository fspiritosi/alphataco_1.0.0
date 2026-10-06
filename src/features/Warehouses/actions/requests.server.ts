'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import { checkPermissionServer } from '@/features/Permissions';
import { fail, ok, type ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { Logger } from '@/lib/logger';
import { getServerAuthProfile } from '@/shared/actions/auth.actions';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { toActionError } from '../lib/action-errors';
import { dateColumnToYmd } from '../lib/batch-expiry';
import { DESTINATION_SELECT, destinationLabel } from '../lib/labels';
import { canApplyRequestAction, type MaterialRequestStatus, type RequestAction } from '../lib/request-state-machine';
import { nextMaterialRequestNumber } from '../lib/request-numbering';
import { deliveredByLine, lockRequest } from '../lib/requests';
import { registerRequestDelivery, validateExitDestination } from '../lib/stock-engine';
import { StockError } from '../lib/stock-errors';
import {
  closeRequestSchema,
  deliverRequestSchema,
  materialRequestSchema,
  rejectRequestSchema,
  toRequestDeliveryInput,
  type CloseRequestFormValues,
  type DeliverRequestFormValues,
  type MaterialRequestFormValues,
  type RejectRequestFormValues,
} from '../schemas/requests';
import { normalizeDecimal, toDestinationInput } from '../schemas/stock-movement';

const logger = new Logger('features/Warehouses/requests');

const WAREHOUSE_PATH = '/dashboard/warehouse';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 5_000 };

const SESSION_EXPIRED = 'Tu sesión expiró. Volvé a ingresar.';

/** Alta de un pedido en `PENDING_APPROVAL`. */
export async function createMaterialRequestAction(
  values: MaterialRequestFormValues
): Promise<ActionResult<{ id: string; number: string }>> {
  if (!(await checkPermissionServer('almacenes', 'pedidos', 'create'))) {
    return fail('No tenés permiso para hacer pedidos de materiales');
  }
  const parsed = materialRequestSchema.safeParse(values);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();
  const destination = toDestinationInput(parsed.data);

  try {
    const created = await withActor(
      profile.credentialId,
      async (tx) => {
        const materialIds = [...new Set(parsed.data.lines.map((l) => l.materialId))];
        const materials = await tx.materials.findMany({
          where: { id: { in: materialIds }, company_id: companyId },
          select: { id: true, name: true, is_active: true, tracking_type: true },
        });
        const byId = new Map(materials.map((m) => [m.id, m]));
        for (const line of parsed.data.lines) {
          const material = byId.get(line.materialId);
          if (!material) throw new StockError('NOT_FOUND', 'Uno de los materiales no existe en la empresa');
          if (!material.is_active) throw new StockError('INACTIVE_MATERIAL', `${material.name} está inactivo`);
          if (material.tracking_type === 'SERIAL' && !Number.isInteger(Number(normalizeDecimal(line.quantity)))) {
            throw new StockError('INVALID_INPUT', `${material.name} se entrega por unidad: la cantidad tiene que ser entera`);
          }
        }
        await validateExitDestination(tx, companyId, destination);

        const number = await nextMaterialRequestNumber(tx, companyId);
        return tx.material_requests.create({
          data: {
            company_id: companyId,
            number,
            requested_by: profile.id,
            destination_type: destination.destinationType!,
            employee_id: destination.employeeId,
            vehicle_id: destination.vehicleId,
            other_equipment_id: destination.otherEquipmentId,
            maintenance_order_id: destination.maintenanceOrderId,
            customer_id: destination.customerId,
            customer_service_id: destination.customerServiceId,
            notes: parsed.data.notes || null,
            lines: {
              create: parsed.data.lines.map((l) => ({ material_id: l.materialId, quantity: normalizeDecimal(l.quantity) })),
            },
          },
          select: { id: true, number: true },
        });
      },
      prisma,
      TRANSACTION_OPTIONS
    );
    logger.info('Pedido creado', { data: created });
    revalidatePath(WAREHOUSE_PATH);
    return ok(created);
  } catch (error) {
    return toActionError(error, logger, 'crear el pedido');
  }
}

/**
 * Cambio de estado sin stock (aprobar, rechazar, cancelar, cerrar): lockea el pedido, valida la
 * transicion con la maquina de estados y escribe. Lockear evita que una entrega y un cierre (o
 * dos aprobadores) se pisen.
 */
async function decideRequest(
  requestId: string,
  action: Exclude<RequestAction, 'deliver'>,
  data: (profileId: string) => Prisma.material_requestsUpdateInput,
  options: { onlyRequester?: boolean } = {}
): Promise<ActionResult<{ number: string }>> {
  if (!UUID_RE.test(requestId)) return fail('El pedido no existe');
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();

  try {
    const number = await withActor(
      profile.credentialId,
      async (tx) => {
        const request = await lockRequest(tx, companyId, requestId);
        if (options.onlyRequester && request.requested_by !== profile.id) {
          throw new StockError('INVALID_STATE', 'Solo quien hizo el pedido puede cancelarlo');
        }
        if (!canApplyRequestAction(request.status, action)) {
          throw new StockError('INVALID_STATE', `${request.number} ya no está en un estado que lo permita`);
        }
        await tx.material_requests.update({ where: { id: request.id }, data: data(profile.id) });
        return request.number;
      },
      prisma,
      TRANSACTION_OPTIONS
    );
    logger.info('Pedido actualizado', { data: { number, action } });
    revalidatePath(WAREHOUSE_PATH);
    return ok({ number });
  } catch (error) {
    return toActionError(error, logger, 'actualizar el pedido');
  }
}

export async function approveRequestAction(requestId: string): Promise<ActionResult<{ number: string }>> {
  if (!(await checkPermissionServer('almacenes', 'pedidos', 'approve'))) return fail('No tenés permiso para aprobar pedidos');
  return decideRequest(requestId, 'approve', (profileId) => ({
    status: 'APPROVED',
    decider: { connect: { id: profileId } },
    decided_at: new Date(),
  }));
}

export async function rejectRequestAction(values: RejectRequestFormValues): Promise<ActionResult<{ number: string }>> {
  if (!(await checkPermissionServer('almacenes', 'pedidos', 'approve'))) return fail('No tenés permiso para rechazar pedidos');
  const parsed = rejectRequestSchema.safeParse(values);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  return decideRequest(parsed.data.requestId, 'reject', (profileId) => ({
    status: 'REJECTED',
    decider: { connect: { id: profileId } },
    decided_at: new Date(),
    decision_notes: parsed.data.notes,
  }));
}

/** Solo el solicitante, mientras el pedido espera aprobacion. */
export async function cancelRequestAction(requestId: string): Promise<ActionResult<{ number: string }>> {
  if (!(await checkPermissionServer('almacenes', 'pedidos', 'view'))) return fail('No tenés permiso para ver pedidos');
  return decideRequest(
    requestId,
    'cancel',
    (profileId) => ({ status: 'CANCELLED', closer: { connect: { id: profileId } }, closed_at: new Date() }),
    { onlyRequester: true }
  );
}

export async function closeRequestAction(values: CloseRequestFormValues): Promise<ActionResult<{ number: string }>> {
  if (!(await checkPermissionServer('almacenes', 'pedidos', 'update'))) return fail('No tenés permiso para cerrar pedidos');
  const parsed = closeRequestSchema.safeParse(values);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  return decideRequest(parsed.data.requestId, 'close', (profileId) => ({
    status: 'CLOSED',
    closer: { connect: { id: profileId } },
    closed_at: new Date(),
    close_notes: parsed.data.notes,
  }));
}

/** Entrega (total o parcial): una salida vinculada al pedido. */
export async function deliverRequestAction(
  values: DeliverRequestFormValues
): Promise<ActionResult<{ movementId: string; number: string; status: MaterialRequestStatus }>> {
  if (!(await checkPermissionServer('almacenes', 'pedidos', 'update'))) return fail('No tenés permiso para entregar pedidos');
  const parsed = deliverRequestSchema.safeParse(values);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();

  try {
    const result = await withActor(
      profile.credentialId,
      async (tx) => {
        const movement = await registerRequestDelivery(tx, companyId, profile.id, toRequestDeliveryInput(parsed.data));
        const request = await tx.material_requests.findUniqueOrThrow({
          where: { id: parsed.data.requestId },
          select: { status: true },
        });
        return { movementId: movement.id, number: movement.number, status: request.status };
      },
      prisma,
      TRANSACTION_OPTIONS
    );
    logger.info('Entrega registrada', { data: { request: parsed.data.requestId, movement: result.number } });
    revalidatePath(WAREHOUSE_PATH);
    return ok(result);
  } catch (error) {
    return toActionError(error, logger, 'registrar la entrega');
  }
}

/**
 * Detalle del pedido con lo pedido, entregado y pendiente por linea, sus entregas y que acciones
 * puede hacer el usuario. Sin `view_all_requests` solo ve sus propios pedidos; sin
 * `view_prices` el total estimado no sale del servidor.
 */
export async function getMaterialRequestDetail(id: string) {
  if (!UUID_RE.test(id)) return null;
  const [canView, canViewAll, canApprove, canUpdate, canViewPrices, profile] = await Promise.all([
    checkPermissionServer('almacenes', 'pedidos', 'view'),
    checkPermissionServer('almacenes', 'pedidos', 'view_all_requests'),
    checkPermissionServer('almacenes', 'pedidos', 'approve'),
    checkPermissionServer('almacenes', 'pedidos', 'update'),
    checkPermissionServer('almacenes', 'movimientos', 'view_prices'),
    getServerAuthProfile(),
  ]);
  if (!canView || !profile) return null;
  const companyId = await getActiveCompanyId();

  const request = await prisma.material_requests.findFirst({
    where: { id, company_id: companyId, ...(canViewAll ? {} : { requested_by: profile.id }) },
    select: {
      id: true,
      number: true,
      status: true,
      notes: true,
      created_at: true,
      decided_at: true,
      decision_notes: true,
      closed_at: true,
      close_notes: true,
      requested_by: true,
      requester: { select: { fullname: true, email: true } },
      decider: { select: { fullname: true, email: true } },
      closer: { select: { fullname: true, email: true } },
      ...DESTINATION_SELECT,
      lines: {
        select: {
          id: true,
          quantity: true,
          material: {
            select: {
              id: true,
              code: true,
              name: true,
              tracking_type: true,
              average_cost: true,
              unit: { select: { abbreviation: true } },
            },
          },
        },
        orderBy: [{ material: { name: 'asc' } }, { id: 'asc' }],
      },
      deliveries: {
        select: {
          id: true,
          number: true,
          occurred_on: true,
          reverses_movement_id: true,
          reversed_by: { select: { number: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { number: 'asc' },
      },
    },
  });
  if (!request) return null;

  const delivered = await deliveredByLine(prisma, request.id);
  const userName = (p: { fullname: string | null; email: string | null } | null) => (p ? (p.fullname ?? p.email ?? 'Usuario') : null);
  const isRequester = request.requested_by === profile.id;
  const status = request.status as MaterialRequestStatus;
  const estimated = request.lines.reduce(
    (acc, l) => acc.plus(new Prisma.Decimal(l.quantity).times(l.material.average_cost)),
    new Prisma.Decimal(0)
  );

  return {
    id: request.id,
    number: request.number,
    status,
    notes: request.notes,
    createdAt: request.created_at.toISOString(),
    requestedBy: userName(request.requester)!,
    destinationType: request.destination_type,
    destination: destinationLabel(request),
    decision: request.decided_at
      ? { by: userName(request.decider), at: request.decided_at.toISOString(), notes: request.decision_notes }
      : null,
    closing: request.closed_at
      ? { by: userName(request.closer), at: request.closed_at.toISOString(), notes: request.close_notes }
      : null,
    estimatedTotal: canViewPrices ? estimated.toFixed(2) : null,
    lines: request.lines.map((l) => {
      const done = delivered.get(l.id) ?? new Prisma.Decimal(0);
      const pending = Prisma.Decimal.max(new Prisma.Decimal(l.quantity).minus(done), 0);
      return {
        id: l.id,
        material: {
          id: l.material.id,
          code: l.material.code,
          name: l.material.name,
          trackingType: l.material.tracking_type,
          unit: l.material.unit.abbreviation,
        },
        requested: l.quantity.toString(),
        delivered: done.toString(),
        pending: pending.toString(),
      };
    }),
    deliveries: request.deliveries.map((d) => ({
      id: d.id,
      number: d.number,
      occurredOn: dateColumnToYmd(d.occurred_on),
      warehouse: d.warehouse.name,
      isReversal: d.reverses_movement_id !== null,
      reversedBy: d.reversed_by?.number ?? null,
    })),
    can: {
      approve: canApprove && canApplyRequestAction(status, 'approve'),
      reject: canApprove && canApplyRequestAction(status, 'reject'),
      cancel: isRequester && canApplyRequestAction(status, 'cancel'),
      deliver: canUpdate && canApplyRequestAction(status, 'deliver'),
      close: canUpdate && canApplyRequestAction(status, 'close'),
    },
  };
}

export type MaterialRequestDetail = NonNullable<Awaited<ReturnType<typeof getMaterialRequestDetail>>>;

/**
 * Costo promedio vigente de los materiales del pedido, para el total estimado del formulario.
 * Solo con `view_prices`: sin el permiso devuelve `null` y el costo no sale del servidor.
 */
export async function getRequestEstimateCosts(materialIds: string[]): Promise<Record<string, string> | null> {
  const [canCreate, canViewPrices] = await Promise.all([
    checkPermissionServer('almacenes', 'pedidos', 'create'),
    checkPermissionServer('almacenes', 'movimientos', 'view_prices'),
  ]);
  if (!canCreate || !canViewPrices) return null;
  const ids = materialIds.filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return {};
  const companyId = await getActiveCompanyId();
  const rows = await prisma.materials.findMany({
    where: { id: { in: ids }, company_id: companyId },
    select: { id: true, average_cost: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, r.average_cost.toFixed(4)]));
}
