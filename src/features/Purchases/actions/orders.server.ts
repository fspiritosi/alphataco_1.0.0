'use server';

import { revalidatePath } from 'next/cache';
import { QUANTITY_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { fail, ok, type ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { checkPermissionServer } from '@/features/Permissions';
import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { getServerAuthProfile } from '@/shared/actions/auth.actions';
import { sendPurchaseOrderDecisionEmail, sendSupplierDocumentEmail } from '@/shared/lib/mail/templates/purchases';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { NO_PERMISSION, UUID_RE, firstIssue, toPurchaseActionError } from '../lib/action-errors';
import { nextPurchaseDocumentNumber } from '../lib/document-number';
import {
  findOrderableRequestLines,
  lockRequestsForLines,
  orderedByLine,
  recomputeRequestProgress,
  remainingOf,
  requestLineLabel,
} from '../lib/order-progress';
import { canApplyPurchaseOrderAction, purchaseOrderStatusAfter, type PurchaseOrderStatus } from '../lib/order-state-machine';
import { expiredSupplierDocuments, lockPurchaseOrder, validatePurchaseOrderInput, type ValidatedOrderLine } from '../lib/orders';
import { PurchaseError } from '../lib/purchase-errors';
import { lockPurchaseQuote } from '../lib/quotes';
import { dateColumn } from '../lib/requests';
import { ORDERABLE_REQUEST_STATUSES, type PurchaseRequestStatus } from '../lib/request-state-machine';
import { mailNotSentMessage, supplierRecipients } from '../lib/supplier-send';
import { renderPurchaseOrderPdf } from '../pdf/render-purchase-pdf.server';
import { purchaseOrderFormSchema, toPurchaseOrderInput, type PurchaseOrderFormValues, type PurchaseOrderInput } from '../schemas/orders';
import { requiredReasonSchema } from '../schemas/requests';
import { sendDocumentSchema, type SendDocumentValues } from '../schemas/send';

const logger = new Logger('features/Purchases/orders');

const PURCHASES_PATH = '/dashboard/purchases';
const SESSION_EXPIRED = 'Tu sesión expiró. Volvé a ingresar.';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** La OC toca solicitudes y cotizaciones: se revalida todo el modulo. */
function revalidate() {
  revalidatePath(PURCHASES_PATH, 'layout');
}

async function writeOrderLines(tx: Tx, orderId: string, lines: ValidatedOrderLine[]) {
  await tx.purchase_order_lines.createMany({
    data: lines.map((line, i) => ({ ...line, order_id: orderId, position: i + 1 })),
  });
}

/** Si todas las lineas con precio cotizado salen de UNA cotizacion, la OC queda vinculada a ella. */
async function quoteIdOf(tx: Tx, lines: readonly { quote_line_id: string | null }[]): Promise<string | null> {
  const quoteLineIds = [...new Set(lines.flatMap((line) => (line.quote_line_id ? [line.quote_line_id] : [])))];
  if (quoteLineIds.length === 0) return null;
  const quotes = await tx.purchase_quote_lines.findMany({
    where: { id: { in: quoteLineIds } },
    select: { quote_id: true },
    distinct: ['quote_id'],
  });
  return quotes.length === 1 ? quotes[0].quote_id : null;
}

async function requestIdsOfOrder(tx: Tx, orderId: string): Promise<string[]> {
  const lines = await tx.purchase_order_lines.findMany({
    where: { order_id: orderId },
    select: { request_line: { select: { request_id: true } } },
  });
  return [...new Set(lines.map((line) => line.request_line.request_id))];
}

async function inputFromStoredOrder(tx: Tx, orderId: string): Promise<PurchaseOrderInput> {
  const order = await tx.purchase_orders.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      supplier_id: true,
      delivery_date: true,
      delivery_place: true,
      payment_term_days: true,
      notes: true,
      lines: {
        orderBy: { position: 'asc' },
        select: { request_line_id: true, quote_line_id: true, quantity: true, unit_price: true, vat_rate_id: true },
      },
    },
  });
  return {
    supplierId: order.supplier_id,
    deliveryDate: order.delivery_date ? order.delivery_date.toISOString().slice(0, 10) : null,
    deliveryPlace: order.delivery_place,
    paymentTermDays: order.payment_term_days,
    notes: order.notes,
    lines: order.lines.map((line) => ({
      requestLineId: line.request_line_id,
      quoteLineId: line.quote_line_id,
      quantity: line.quantity.toString(),
      unitPrice: line.unit_price.toString(),
      vatRateId: line.vat_rate_id,
    })),
  };
}

/** Alta de una OC ya validada (la usan el alta directa y la que sale de una cotizacion). */
async function insertPurchaseOrder(
  tx: Tx,
  companyId: string,
  profileId: string,
  input: PurchaseOrderInput,
  options: { submit: boolean; quoteId?: string | null }
) {
  const validated = await validatePurchaseOrderInput(tx, companyId, input);
  const number = await nextPurchaseDocumentNumber(tx, companyId, 'order');
  const order = await tx.purchase_orders.create({
    data: {
      company_id: companyId,
      number,
      supplier_id: validated.supplier.id,
      quote_id: options.quoteId !== undefined ? options.quoteId : await quoteIdOf(tx, validated.lines),
      status: options.submit ? 'PENDING_APPROVAL' : 'DRAFT',
      created_by: profileId,
      delivery_date: dateColumn(input.deliveryDate),
      delivery_place: input.deliveryPlace,
      // Sin plazo en el formulario: el de la ficha del proveedor.
      payment_term_days: input.paymentTermDays ?? validated.supplier.paymentTermDays,
      notes: input.notes,
      subtotal: new Prisma.Decimal(validated.totals.subtotal),
      vat_total: new Prisma.Decimal(validated.totals.vatTotal),
      total: new Prisma.Decimal(validated.totals.total),
      submitted_at: options.submit ? new Date() : null,
    },
    select: { id: true, number: true },
  });
  await writeOrderLines(tx, order.id, validated.lines);
  await recomputeRequestProgress(tx, validated.requestIds);
  return order;
}

/** Crea una OC directa (lineas de una o varias solicitudes), como borrador o pendiente de aprobacion. */
export async function createPurchaseOrder(
  values: PurchaseOrderFormValues,
  options: { submit: boolean }
): Promise<ActionResult<{ id: string; number: string }>> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'create'))) return fail(NO_PERMISSION);
  // Enviar a aprobacion es del permiso Editar (spec §3), tambien desde el alta.
  if (options.submit && !(await checkPermissionServer('compras', 'ordenes', 'update'))) return fail(NO_PERMISSION);
  const parsed = purchaseOrderFormSchema.safeParse(values);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();

  try {
    const created = await prisma.$transaction((tx) =>
      insertPurchaseOrder(tx, companyId, profile.id, toPurchaseOrderInput(parsed.data), { submit: options.submit })
    );
    logger.info('Orden de compra creada', { data: { number: created.number, submit: options.submit } });
    revalidate();
    return ok(created);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'crear la orden de compra');
  }
}

/**
 * Borrador de OC desde una cotizacion respondida: copia las lineas con precio por lo que FALTA de
 * cada linea de solicitud (como mucho, lo cotizado). Omite las ya pedidas completas.
 */
export async function createPurchaseOrderFromQuote(
  quoteId: string
): Promise<ActionResult<{ id: string; number: string; skipped: number }>> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'create'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(quoteId)) return fail('La cotización no existe');
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const quote = await lockPurchaseQuote(tx, companyId, quoteId, 'order');
      const priced = await tx.purchase_quote_lines.findMany({
        where: { quote_id: quote.id, not_quoted: false, unit_price: { not: null } },
        select: { id: true, request_line_id: true, quantity: true, unit_price: true, vat_rate_id: true },
      });
      const locked = await lockRequestsForLines(
        tx,
        companyId,
        priced.map((line) => line.request_line_id)
      );
      const ordered = await orderedByLine(
        tx,
        priced.map((line) => line.request_line_id)
      );
      const orderable: readonly PurchaseRequestStatus[] = ORDERABLE_REQUEST_STATUSES;

      const lines: PurchaseOrderInput['lines'] = [];
      for (const line of priced) {
        const requestLine = locked.get(line.request_line_id);
        if (!requestLine || !orderable.includes(requestLine.requestStatus)) continue;
        const remaining = parseScaled(remainingOf(requestLine.requested, ordered.get(line.request_line_id) ?? '0'), QUANTITY_SCALE) ?? BigInt(0);
        const quoted = parseScaled(line.quantity.toString(), QUANTITY_SCALE) ?? BigInt(0);
        const quantity = remaining < quoted ? remaining : quoted;
        if (quantity <= BigInt(0)) continue;
        lines.push({
          requestLineId: line.request_line_id,
          quoteLineId: line.id,
          quantity: formatScaled(quantity, QUANTITY_SCALE),
          unitPrice: line.unit_price!.toString(),
          vatRateId: line.vat_rate_id!,
        });
      }
      if (lines.length === 0) throw new PurchaseError('No queda nada por pedir de esta cotización');

      const order = await insertPurchaseOrder(
        tx,
        companyId,
        profile.id,
        { supplierId: quote.supplierId, deliveryDate: null, deliveryPlace: null, paymentTermDays: null, notes: null, lines },
        { submit: false, quoteId: quote.id }
      );
      return { ...order, skipped: priced.length - lines.length };
    });
    logger.info('Orden de compra creada desde cotización', { data: { number: created.number, quoteId } });
    revalidate();
    return ok(created);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'generar la orden de compra');
  }
}

/** Edita un borrador: reescribe las lineas y recalcula el avance de las solicitudes viejas y nuevas. */
export async function updatePurchaseOrderDraft(id: string, values: PurchaseOrderFormValues): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'update'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const parsed = purchaseOrderFormSchema.safeParse(values);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const companyId = await getActiveCompanyId();

  try {
    await prisma.$transaction(async (tx) => {
      await lockPurchaseOrder(tx, companyId, id, 'edit');
      const previousRequestIds = await requestIdsOfOrder(tx, id);
      const input = toPurchaseOrderInput(parsed.data);
      // Se lockean JUNTAS, en orden por id, las solicitudes que el borrador deja y las que suma:
      // lockear solo las nuevas y despues recalcular las viejas permitia leer un avance viejo y
      // cruzar locks con otra edicion (deadlock).
      const previousLines = await tx.purchase_order_lines.findMany({ where: { order_id: id }, select: { request_line_id: true } });
      await lockRequestsForLines(tx, companyId, [
        ...previousLines.map((line) => line.request_line_id),
        ...input.lines.map((line) => line.requestLineId),
      ]);
      const validated = await validatePurchaseOrderInput(tx, companyId, input, { orderId: id });
      await tx.purchase_order_lines.deleteMany({ where: { order_id: id } });
      await writeOrderLines(tx, id, validated.lines);
      await tx.purchase_orders.update({
        where: { id },
        data: {
          supplier_id: validated.supplier.id,
          quote_id: await quoteIdOf(tx, validated.lines),
          delivery_date: dateColumn(input.deliveryDate),
          delivery_place: input.deliveryPlace,
          // Vacio: el de la ficha del proveedor (igual que en el alta).
          payment_term_days: input.paymentTermDays ?? validated.supplier.paymentTermDays,
          notes: input.notes,
          subtotal: new Prisma.Decimal(validated.totals.subtotal),
          vat_total: new Prisma.Decimal(validated.totals.vatTotal),
          total: new Prisma.Decimal(validated.totals.total),
        },
      });
      await recomputeRequestProgress(tx, [...previousRequestIds, ...validated.requestIds]);
    });
    revalidate();
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'guardar la orden de compra');
  }
}

/** Envia el borrador a aprobacion, revalidando todo (proveedor, faltantes, estado de las solicitudes). */
export async function submitPurchaseOrder(id: string): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'update'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const companyId = await getActiveCompanyId();
  try {
    await prisma.$transaction(async (tx) => {
      await lockPurchaseOrder(tx, companyId, id, 'submit');
      await validatePurchaseOrderInput(tx, companyId, await inputFromStoredOrder(tx, id), { orderId: id });
      await tx.purchase_orders.update({
        where: { id },
        data: { status: purchaseOrderStatusAfter('submit'), submitted_at: new Date() },
      });
    });
    revalidate();
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'enviar la orden a aprobación');
  }
}

/** Aviso a quien creo la OC, DESPUES de confirmar la decision: si el mail falla, la decision queda. */
async function notifyOrderDecision(orderId: string, approved: boolean, notes: string | null) {
  try {
    const order = await prisma.purchase_orders.findUniqueOrThrow({
      where: { id: orderId },
      select: { number: true, creator: { select: { email: true, fullname: true } } },
    });
    if (!order.creator.email) return;
    await sendPurchaseOrderDecisionEmail({
      to: order.creator.email,
      name: order.creator.fullname,
      number: order.number,
      approved,
      notes,
      orderId,
    });
  } catch (error) {
    logger.error('No se pudo avisar la decision de la orden de compra', { data: { error, orderId } });
  }
}

export async function approvePurchaseOrder(id: string): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'approve'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();
  try {
    await prisma.$transaction(async (tx) => {
      await lockPurchaseOrder(tx, companyId, id, 'approve');
      await tx.purchase_orders.update({
        where: { id },
        data: { status: purchaseOrderStatusAfter('approve'), approved_by: profile.id, approved_at: new Date(), rejection_notes: null },
      });
    });
  } catch (error) {
    return toPurchaseActionError(error, logger, 'aprobar la orden de compra');
  }
  await notifyOrderDecision(id, true, null);
  revalidate();
  return ok(null);
}

/** Rechazar devuelve la OC a borrador con el motivo; cada rechazo queda en el historial. */
export async function rejectPurchaseOrder(id: string, reason: string): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'approve'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const motive = requiredReasonSchema.safeParse(reason);
  if (!motive.success) return fail(firstIssue(motive.error));
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();
  try {
    await prisma.$transaction(async (tx) => {
      await lockPurchaseOrder(tx, companyId, id, 'reject');
      const now = new Date();
      await tx.purchase_orders.update({
        where: { id },
        data: { status: purchaseOrderStatusAfter('reject'), rejection_notes: motive.data, rejected_by: profile.id, rejected_at: now },
      });
      await tx.purchase_order_rejections.create({
        data: { order_id: id, rejected_by: profile.id, rejected_at: now, reason: motive.data },
      });
    });
  } catch (error) {
    return toPurchaseActionError(error, logger, 'rechazar la orden de compra');
  }
  await notifyOrderDecision(id, false, motive.data);
  revalidate();
  return ok(null);
}

/** Anula la OC (con motivo) y libera lo que pedia: las solicitudes vuelven a tener faltante. */
export async function cancelPurchaseOrder(id: string, reason: string): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'update'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const motive = requiredReasonSchema.safeParse(reason);
  if (!motive.success) return fail(firstIssue(motive.error));
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();
  try {
    await prisma.$transaction(async (tx) => {
      await lockPurchaseOrder(tx, companyId, id, 'cancel');
      const requestIds = await requestIdsOfOrder(tx, id);
      // Mismo orden de locks que al crear: primero las solicitudes, despues se escribe.
      await lockRequestsForLines(
        tx,
        companyId,
        (await tx.purchase_order_lines.findMany({ where: { order_id: id }, select: { request_line_id: true } })).map(
          (line) => line.request_line_id
        )
      );
      await tx.purchase_orders.update({
        where: { id },
        data: { status: purchaseOrderStatusAfter('cancel'), cancelled_by: profile.id, cancelled_at: new Date(), cancel_reason: motive.data },
      });
      await recomputeRequestProgress(tx, requestIds);
    });
    revalidate();
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'anular la orden de compra');
  }
}

/**
 * Envia la OC aprobada al proveedor con el PDF adjunto. El envio ES la accion: solo si el mail
 * salio queda ENVIADA. El lock NO cruza el SMTP (una transaccion abierta esperando al servidor de
 * correo bloquearia la OC): se valida, se envia y recien despues se escribe, revalidando el estado.
 */
export async function sendPurchaseOrder(id: string, values: SendDocumentValues): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'update'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const parsed = sendDocumentSchema.safeParse(values);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();

  try {
    const order = await prisma.purchase_orders.findFirst({
      where: { id, company_id: companyId },
      select: { number: true, status: true, company: { select: { company_name: true } }, supplier: { select: { name: true } } },
    });
    if (!order) return fail('La orden de compra no existe');
    if (!canApplyPurchaseOrderAction(order.status, 'send')) {
      return fail(`La orden ${order.number} no está aprobada: no se puede enviar`);
    }

    const pdf = await renderPurchaseOrderPdf(id, companyId);
    const sent = await sendSupplierDocumentEmail({
      kind: 'order',
      to: parsed.data.to,
      number: order.number,
      companyName: order.company.company_name,
      supplierName: order.supplier.name,
      message: parsed.data.message || null,
      attachment: pdf,
    });
    if (!sent) return fail(mailNotSentMessage('la orden sigue aprobada'));

    const marked = await prisma.$transaction(async (tx) => {
      try {
        await lockPurchaseOrder(tx, companyId, id, 'send');
      } catch (error) {
        // Otro usuario la envio o anulo mientras salia el mail: el mail ya salio, no se pisa nada.
        logger.warn('La orden cambio de estado mientras se enviaba el mail', { data: { error, id } });
        return false;
      }
      await tx.purchase_orders.update({
        where: { id },
        data: { status: purchaseOrderStatusAfter('send'), sent_at: new Date(), sent_to: parsed.data.to, sent_by: profile.id },
      });
      return true;
    });
    revalidate();
    if (!marked) {
      return fail(`El mail salió, pero la orden ${order.number} cambió de estado mientras se enviaba: revisala antes de volver a mandarla.`);
    }
    logger.info('Orden de compra enviada al proveedor', { data: { number: order.number, to: parsed.data.to } });
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'enviar la orden de compra');
  }
}

/** Registra que la OC se le hizo llegar al proveedor por otro medio (sin mail). */
export async function markPurchaseOrderSent(id: string): Promise<ActionResult> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'update'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const profile = await getServerAuthProfile();
  if (!profile) return fail(SESSION_EXPIRED);
  const companyId = await getActiveCompanyId();
  try {
    await prisma.$transaction(async (tx) => {
      await lockPurchaseOrder(tx, companyId, id, 'markSent');
      await tx.purchase_orders.update({
        where: { id },
        data: { status: purchaseOrderStatusAfter('markSent'), sent_at: new Date(), sent_to: [], sent_by: profile.id },
      });
    });
    revalidate();
    return ok(null);
  } catch (error) {
    return toPurchaseActionError(error, logger, 'marcar la orden como enviada');
  }
}

/** PDF de la OC en cualquier estado (con marca de agua hasta que se aprueba). */
export async function getPurchaseOrderPdf(id: string): Promise<ActionResult<{ filename: string; base64: string }>> {
  if (!(await checkPermissionServer('compras', 'ordenes', 'view'))) return fail(NO_PERMISSION);
  if (!UUID_RE.test(id)) return fail('La orden de compra no existe');
  const companyId = await getActiveCompanyId();
  try {
    const pdf = await renderPurchaseOrderPdf(id, companyId);
    return ok({ filename: pdf.filename, base64: Buffer.from(pdf.content).toString('base64') });
  } catch (error) {
    return toPurchaseActionError(error, logger, 'generar el PDF');
  }
}

async function canPickRequestLines(): Promise<boolean> {
  const allowed = await Promise.all([
    checkPermissionServer('compras', 'ordenes', 'create'),
    checkPermissionServer('compras', 'cotizaciones', 'create'),
  ]);
  return allowed.some(Boolean);
}

/** Lineas de solicitud con faltante, para los selectores de la OC y del pedido de cotizacion. */
export async function searchOrderableRequestLines(query: string, options: { requestId?: string } = {}) {
  if (!(await canPickRequestLines())) return { items: [], total: 0 };
  if (options.requestId && !UUID_RE.test(options.requestId)) return { items: [], total: 0 };
  const companyId = await getActiveCompanyId();
  return findOrderableRequestLines(prisma, companyId, { term: query, requestId: options.requestId });
}

export type OrderableRequestLineOption = Awaited<ReturnType<typeof searchOrderableRequestLines>>['items'][number];

/** Proveedor (contactos, plazo, documentos vencidos) para el formulario y los dialogos. */
export async function getSupplierPurchaseContext(supplierId: string) {
  if (!UUID_RE.test(supplierId)) return null;
  const allowed = await Promise.all([
    checkPermissionServer('compras', 'ordenes', 'view'),
    checkPermissionServer('compras', 'cotizaciones', 'view'),
  ]);
  if (!allowed.some(Boolean)) return null;
  const companyId = await getActiveCompanyId();
  const supplier = await prisma.suppliers.findFirst({
    where: { id: supplierId, company_id: companyId },
    select: { id: true, name: true, payment_term_days: true, is_active: true },
  });
  if (!supplier) return null;
  const [expiredDocuments, recipients] = await Promise.all([
    expiredSupplierDocuments(prisma, supplier.id),
    supplierRecipients(prisma, supplier.id),
  ]);
  return {
    id: supplier.id,
    name: supplier.name,
    isActive: supplier.is_active,
    paymentTermDays: supplier.payment_term_days,
    expiredDocuments,
    recipients,
  };
}

export type SupplierPurchaseContext = NonNullable<Awaited<ReturnType<typeof getSupplierPurchaseContext>>>;

const userName = (p: { fullname: string | null; email: string | null } | null) => (p ? (p.fullname ?? p.email ?? 'Usuario') : null);

/** Detalle de la OC: cabecera, lineas con su solicitud de origen, historial y que se puede hacer. */
export async function getPurchaseOrderDetail(id: string) {
  if (!UUID_RE.test(id)) return null;
  const [canView, canUpdate, canApprove] = await Promise.all([
    checkPermissionServer('compras', 'ordenes', 'view'),
    checkPermissionServer('compras', 'ordenes', 'update'),
    checkPermissionServer('compras', 'ordenes', 'approve'),
  ]);
  if (!canView) return null;
  const companyId = await getActiveCompanyId();

  const order = await prisma.purchase_orders.findFirst({
    where: { id, company_id: companyId },
    select: {
      id: true,
      number: true,
      status: true,
      supplier_id: true,
      delivery_date: true,
      delivery_place: true,
      payment_term_days: true,
      notes: true,
      subtotal: true,
      vat_total: true,
      total: true,
      created_at: true,
      submitted_at: true,
      approved_at: true,
      rejection_notes: true,
      sent_at: true,
      sent_to: true,
      cancelled_at: true,
      cancel_reason: true,
      supplier: { select: { id: true, name: true, cuit: true } },
      quote: { select: { id: true, number: true } },
      creator: { select: { fullname: true, email: true } },
      approver: { select: { fullname: true, email: true } },
      sender: { select: { fullname: true, email: true } },
      canceller: { select: { fullname: true, email: true } },
      rejections: {
        orderBy: { rejected_at: 'asc' },
        select: { rejected_at: true, reason: true, rejecter: { select: { fullname: true, email: true } } },
      },
      lines: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          request_line_id: true,
          quote_line_id: true,
          quantity: true,
          unit_price: true,
          vat_rate_id: true,
          net_total: true,
          vat_amount: true,
          request_line: {
            select: {
              position: true,
              quantity: true,
              description: true,
              material: { select: { code: true, name: true } },
              unit: { select: { abbreviation: true } },
              request: { select: { id: true, number: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return null;

  const status = order.status as PurchaseOrderStatus;
  const requestLineIds = order.lines.map((line) => line.request_line_id);
  const [orderedOthers, expiredDocuments, recipients] = await Promise.all([
    orderedByLine(prisma, requestLineIds, { excludeOrderId: order.id }),
    expiredSupplierDocuments(prisma, order.supplier_id),
    supplierRecipients(prisma, order.supplier_id),
  ]);
  const at = (d: Date | null) => d?.toISOString() ?? null;

  const lines = order.lines.map((line) => {
    const requested = line.request_line.quantity.toString();
    // Faltante SIN contar esta OC: lo que se puede pedir en ella al editarla.
    const available = remainingOf(requested, orderedOthers.get(line.request_line_id) ?? '0');
    return {
      id: line.id,
      requestLineId: line.request_line_id,
      quoteLineId: line.quote_line_id,
      request: line.request_line.request,
      requestPosition: line.request_line.position,
      itemLabel: requestLineLabel({ ...line.request_line, code: line.request_line.material?.code ?? null, name: line.request_line.material?.name ?? null }),
      unitAbbr: line.request_line.unit.abbreviation,
      requested,
      available,
      quantity: line.quantity.toString(),
      unitPrice: line.unit_price.toString(),
      vatRateId: line.vat_rate_id,
      netTotal: line.net_total.toFixed(2),
      vatAmount: line.vat_amount.toFixed(2),
    };
  });

  return {
    id: order.id,
    number: order.number,
    status,
    supplier: { id: order.supplier.id, name: order.supplier.name, cuit: order.supplier.cuit.toString() },
    quote: order.quote,
    deliveryDate: order.delivery_date ? order.delivery_date.toISOString().slice(0, 10) : null,
    deliveryPlace: order.delivery_place,
    paymentTermDays: order.payment_term_days,
    notes: order.notes,
    totals: { subtotal: order.subtotal.toFixed(2), vatTotal: order.vat_total.toFixed(2), total: order.total.toFixed(2) },
    creator: userName(order.creator),
    rejectionNotes: status === 'DRAFT' ? order.rejection_notes : null,
    sentTo: order.sent_to,
    lines,
    expiredDocuments,
    recipients,
    form: {
      supplierId: order.supplier_id,
      deliveryDate: order.delivery_date ? order.delivery_date.toISOString().slice(0, 10) : '',
      deliveryPlace: order.delivery_place ?? '',
      paymentTermDays: order.payment_term_days === null ? '' : String(order.payment_term_days),
      notes: order.notes ?? '',
      lines: lines.map((line) => ({
        requestLineId: line.requestLineId,
        quoteLineId: line.quoteLineId ?? '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRateId: line.vatRateId,
      })),
    } satisfies PurchaseOrderFormValues,
    lineOptions: lines.map((line) => ({
      requestLineId: line.requestLineId,
      requestId: line.request.id,
      requestNumber: line.request.number,
      position: line.requestPosition,
      itemLabel: line.itemLabel,
      unitAbbr: line.unitAbbr,
      requested: line.requested,
      remaining: line.available,
      suggestedSupplierId: null,
    })),
    history: [
      { event: 'Creada', at: at(order.created_at), by: userName(order.creator), notes: null },
      ...(order.submitted_at ? [{ event: 'Enviada a aprobación', at: at(order.submitted_at), by: null, notes: null }] : []),
      ...order.rejections.map((rejection) => ({
        event: 'Rechazada',
        at: at(rejection.rejected_at),
        by: userName(rejection.rejecter),
        notes: rejection.reason,
      })),
      ...(order.approved_at ? [{ event: 'Aprobada', at: at(order.approved_at), by: userName(order.approver), notes: null }] : []),
      ...(order.sent_at
        ? [
            {
              event: order.sent_to.length > 0 ? `Enviada a ${order.sent_to.join(', ')}` : 'Marcada como enviada',
              at: at(order.sent_at),
              by: userName(order.sender),
              notes: null,
            },
          ]
        : []),
      ...(order.cancelled_at
        ? [{ event: 'Anulada', at: at(order.cancelled_at), by: userName(order.canceller), notes: order.cancel_reason }]
        : []),
    ].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? '')),
    can: {
      edit: canApplyPurchaseOrderAction(status, 'edit') && canUpdate,
      submit: canApplyPurchaseOrderAction(status, 'submit') && canUpdate,
      approve: canApplyPurchaseOrderAction(status, 'approve') && canApprove,
      send: canApplyPurchaseOrderAction(status, 'send') && canUpdate,
      cancel: canApplyPurchaseOrderAction(status, 'cancel') && canUpdate,
    },
  };
}

export type PurchaseOrderDetail = NonNullable<Awaited<ReturnType<typeof getPurchaseOrderDetail>>>;
