'use server';

import { getFiscalDataOverview } from '@/features/Empresa/General/FiscalData/actions/fiscal-data.server';
import { errorMessage, fail, ok, type ActionResult } from '@/features/Empresa/Clientes/lib/action-result';
import { checkPermissionServer } from '@/features/Permissions';
import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { ARCA_CURRENCY_BY_ISO, isSupportedCurrency, isVatRateId, DEFAULT_VAT_RATE_ID } from '@/shared/lib/arca/catalogs';
import { argentinaDateOnly } from '@/shared/lib/arca/dates';
import { fromDateOnly, toDateOnly } from '@/shared/lib/date-only';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import moment from 'moment';
import { revalidatePath } from 'next/cache';
import { creditableRemaining, loadIssuer } from '../lib/invoice-context.server';
import {
  compareAmounts,
  computeInvoiceTotals,
  formatScaled,
  lineNet,
  parseScaled,
  PRICE_SCALE,
  QUANTITY_SCALE,
  sumAmounts,
  sumQuantities,
} from '../lib/invoice-math';
import { isDeletable, isEditable } from '../lib/invoice-state-machine';
import { cbteLabel, cbteTypeOf, kindOf, letterOf, resolveLetter } from '../lib/invoice-type';
import {
  adjustmentSchema,
  invoiceDraftSchema,
  manualInvoiceSchema,
  type AdjustmentInput,
  type InvoiceDraftInput,
  type ManualInvoiceInput,
} from '../schemas/invoice';

const logger = new Logger('features/Comercial/Facturacion/drafts');

const COMERCIAL_PATH = '/dashboard/comercial';

async function denyUnless(action: 'create' | 'delete'): Promise<string | null> {
  const allowed = await checkPermissionServer('comercial', 'facturacion', action);
  return allowed ? null : 'No tenés permiso para esta acción en Facturación';
}

type LineRow = {
  position: number;
  description: string;
  quantity: string;
  unit_price: string;
  net_amount: string;
  vat_rate_id: number | null;
  service_item_id: string | null;
  certification_id: string | null;
};

/** Escribe líneas, desglose de IVA y totales de un borrador (dentro de una transacción). */
async function writeLinesAndTotals(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  letter: 'A' | 'B' | 'C',
  lines: LineRow[]
) {
  // En C no se discrimina IVA: la línea no lleva alícuota.
  const normalized = lines.map((l) => ({ ...l, vat_rate_id: letter === 'C' ? null : l.vat_rate_id }));
  const totals = computeInvoiceTotals(
    normalized.map((l) => ({ netAmount: l.net_amount, vatRateId: l.vat_rate_id })),
    letter
  );

  await tx.invoice_lines.deleteMany({ where: { invoice_id: invoiceId } });
  await tx.invoice_vat.deleteMany({ where: { invoice_id: invoiceId } });
  if (normalized.length > 0) {
    await tx.invoice_lines.createMany({ data: normalized.map((l) => ({ ...l, invoice_id: invoiceId })) });
  }
  if (totals.vatBreakdown.length > 0) {
    await tx.invoice_vat.createMany({
      data: totals.vatBreakdown.map((v) => ({
        invoice_id: invoiceId,
        vat_rate_id: v.vatRateId,
        base_amount: v.base,
        vat_amount: v.amount,
      })),
    });
  }
  await tx.invoices.update({
    where: { id: invoiceId },
    data: {
      net_taxed: totals.netTaxed,
      net_untaxed: totals.netUntaxed,
      exempt_amount: totals.exempt,
      other_taxes: totals.otherTaxes,
      vat_total: totals.vatTotal,
      total: totals.total,
    },
  });
  return totals;
}

/** Contexto común para crear un borrador: emisor, ambiente y punto de venta por defecto. */
async function draftContext(companyId: string) {
  const [issuer, overview, salesPoint] = await Promise.all([
    loadIssuer(companyId),
    getFiscalDataOverview(),
    prisma.sales_points.findFirst({
      where: { company_id: companyId, is_active: true },
      select: { id: true },
      orderBy: { number: 'asc' },
    }),
  ]);
  if (!issuer.profile) return { error: 'Primero completá los datos fiscales de la empresa (Configuración → Datos fiscales).' } as const;
  if (!salesPoint) return { error: 'Primero cargá un punto de venta (Configuración → Datos fiscales).' } as const;
  return { issuer, profile: issuer.profile, environment: overview.environment, salesPointId: salesPoint.id } as const;
}

function plusDays(dateOnly: string, days: number): string {
  return moment.utc(dateOnly).add(days, 'days').format('YYYY-MM-DD');
}

/**
 * Borrador desde certificaciones confirmadas: mismo cliente, misma moneda, ninguna ya reservada
 * en este ambiente. Cada certificación aporta una línea por ítem y precio, cuyo neto es la SUMA de
 * los importes ya redondeados de la certificación (lo que el cliente aprobó), no cantidad × precio.
 */
export async function createInvoiceDraftFromCertifications(certificationIds: string[]): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnless('create');
  if (denied) return fail(denied);
  if (certificationIds.length === 0) return fail('Elegí al menos una certificación');

  const companyId = await getActiveCompanyId();
  try {
    const ctx = await draftContext(companyId);
    if ('error' in ctx) return fail(ctx.error ?? 'Configuración incompleta');

    const certifications = await prisma.certifications.findMany({
      where: { id: { in: certificationIds }, company_id: companyId },
      select: {
        id: true,
        number: true,
        status: true,
        currency: true,
        customer_id: true,
        period_from: true,
        period_to: true,
        total: true,
        customers: { select: { name: true, cuit: true, vat_condition_id: true } },
        invoice_certifications: {
          where: { environment: ctx.environment, released_at: null },
          select: { invoice: { select: { id: true, cbte_type: true, status: true, created_at: true } } },
        },
        lines: {
          select: {
            quantity: true,
            unit_price: true,
            amount: true,
            service_items: { select: { id: true, item_name: true, vat_rate_id: true } },
          },
        },
      },
      orderBy: { period_from: 'asc' },
    });
    if (certifications.length !== certificationIds.length) return fail('Alguna certificación no existe');

    const notConfirmed = certifications.find((c) => c.status !== 'confirmada');
    if (notConfirmed) return fail(`La certificación ${notConfirmed.number} no está confirmada.`);
    const reserved = certifications.find((c) => c.invoice_certifications.length > 0);
    if (reserved) {
      const other = reserved.invoice_certifications[0].invoice;
      return fail(
        `La certificación ${reserved.number} ya está en ${other.status === 'borrador' ? 'el borrador de ' : ''}${cbteLabel(other.cbte_type)} ` +
          `creado el ${moment(other.created_at).format('DD/MM/YYYY')}. Abrilo o descartalo antes.`
      );
    }
    const customers = new Set(certifications.map((c) => c.customer_id));
    if (customers.size > 1) return fail('Las certificaciones tienen que ser del mismo cliente.');
    const currencies = new Set(certifications.map((c) => c.currency));
    if (currencies.size > 1) return fail('Las certificaciones tienen que estar en la misma moneda.');
    const currency = certifications[0].currency;
    if (!isSupportedCurrency(currency)) return fail(`La moneda ${currency} no se puede facturar.`);

    const customer = certifications[0].customers;
    const letter = resolveLetter(ctx.profile.tax_condition, customer.vat_condition_id, customer.name);
    if (!letter.ok) return fail(letter.error);

    // Una línea por certificación + ítem + precio unitario.
    const lines: LineRow[] = [];
    for (const cert of certifications) {
      const groups = new Map<string, { item: (typeof cert.lines)[number]['service_items']; unitPrice: string; quantities: string[]; amounts: string[] }>();
      for (const line of cert.lines) {
        const unitPrice = line.unit_price.toString();
        const key = `${line.service_items.id}|${unitPrice}`;
        const group = groups.get(key) ?? { item: line.service_items, unitPrice, quantities: [], amounts: [] };
        group.quantities.push(line.quantity.toFixed(4));
        group.amounts.push(line.amount.toFixed(2));
        groups.set(key, group);
      }
      const period = `${moment.utc(cert.period_from).format('DD/MM')}–${moment.utc(cert.period_to).format('DD/MM/YYYY')}`;
      for (const group of groups.values()) {
        const quantity = sumQuantities(group.quantities);
        lines.push({
          position: lines.length + 1,
          description: `${group.item.item_name} — ${cert.number} (${period})`,
          quantity,
          unit_price: group.unitPrice,
          net_amount: sumAmounts(group.amounts),
          vat_rate_id: isVatRateId(group.item.vat_rate_id) ? group.item.vat_rate_id : DEFAULT_VAT_RATE_ID,
          service_item_id: group.item.id,
          certification_id: cert.id,
        });
      }
    }

    const today = argentinaDateOnly(new Date());
    const serviceFrom = toDateOnly(certifications[0].period_from);
    const serviceTo = certifications.map((c) => toDateOnly(c.period_to) ?? '').sort().at(-1) ?? null;
    const userId = await getSessionUserId();

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoices.create({
        data: {
          company_id: companyId,
          environment: ctx.environment,
          sales_point_id: ctx.salesPointId,
          customer_id: certifications[0].customer_id,
          cbte_type: cbteTypeOf(letter.letter, 'invoice'),
          concept: 2,
          issue_date: fromDateOnly(today)!,
          service_from: fromDateOnly(serviceFrom),
          service_to: fromDateOnly(serviceTo),
          payment_due_date: fromDateOnly(plusDays(today, 30)),
          currency,
          arca_currency_id: ARCA_CURRENCY_BY_ISO[currency],
          receiver_doc_number: customer.cuit,
          receiver_vat_condition_id: customer.vat_condition_id!,
          created_by: userId,
        },
        select: { id: true },
      });
      await writeLinesAndTotals(tx, invoice.id, letter.letter, lines);
      await tx.invoice_certifications.createMany({
        data: certifications.map((c) => ({
          invoice_id: invoice.id,
          certification_id: c.id,
          environment: ctx.environment,
          amount: c.total,
        })),
      });
      return invoice;
    });

    logger.info('Borrador de factura creado desde certificaciones', {
      data: { id: created.id, certifications: certificationIds.length },
    });
    revalidatePath(COMERCIAL_PATH);
    return ok(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return fail('Otra factura tomó alguna de estas certificaciones al mismo tiempo. Actualizá y probá de nuevo.');
    }
    logger.error('Error al crear el borrador desde certificaciones', { data: { error, certificationIds } });
    return fail(errorMessage(error, 'Error al crear el borrador'));
  }
}

/** Borrador manual: cliente y moneda; las líneas se cargan en el editor. */
export async function createManualInvoiceDraft(input: ManualInvoiceInput): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnless('create');
  if (denied) return fail(denied);
  const parsed = manualInvoiceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');

  const companyId = await getActiveCompanyId();
  try {
    const ctx = await draftContext(companyId);
    if ('error' in ctx) return fail(ctx.error ?? 'Configuración incompleta');

    const customer = await prisma.customers.findFirst({
      where: { id: parsed.data.customerId, company_id: companyId },
      select: { name: true, cuit: true, vat_condition_id: true },
    });
    if (!customer) return fail('Cliente no encontrado');
    const letter = resolveLetter(ctx.profile.tax_condition, customer.vat_condition_id, customer.name);
    if (!letter.ok) return fail(letter.error);

    const currency = parsed.data.currency as keyof typeof ARCA_CURRENCY_BY_ISO;
    const today = argentinaDateOnly(new Date());
    const userId = await getSessionUserId();
    const created = await prisma.invoices.create({
      data: {
        company_id: companyId,
        environment: ctx.environment,
        sales_point_id: ctx.salesPointId,
        customer_id: parsed.data.customerId,
        cbte_type: cbteTypeOf(letter.letter, 'invoice'),
        concept: 2,
        issue_date: fromDateOnly(today)!,
        service_from: fromDateOnly(moment.utc(today).startOf('month').format('YYYY-MM-DD')),
        service_to: fromDateOnly(today),
        payment_due_date: fromDateOnly(plusDays(today, 30)),
        currency,
        arca_currency_id: ARCA_CURRENCY_BY_ISO[currency],
        receiver_doc_number: customer.cuit,
        receiver_vat_condition_id: customer.vat_condition_id!,
        created_by: userId,
      },
      select: { id: true },
    });

    logger.info('Borrador de factura manual creado', { data: { id: created.id } });
    revalidatePath(COMERCIAL_PATH);
    return ok(created);
  } catch (error) {
    logger.error('Error al crear el borrador manual', { data: { error } });
    return fail(errorMessage(error, 'Error al crear el borrador'));
  }
}

/**
 * Guarda el borrador. Valida FORMATO, no completitud. Las líneas de certificaciones conservan
 * cantidad, precio e importe de la base (solo cambian descripción y alícuota); las manuales se
 * recalculan con la misma fórmula del editor. La letra se vuelve a derivar (puede haber cambiado
 * la condición del cliente) salvo en NC/ND, que heredan la del original.
 */
export async function saveInvoiceDraft(id: string, input: InvoiceDraftInput): Promise<ActionResult<{ total: string; cbteType: number }>> {
  const denied = await denyUnless('create');
  if (denied) return fail(denied);
  const parsed = invoiceDraftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  const data = parsed.data;

  const companyId = await getActiveCompanyId();
  try {
    const invoice = await prisma.invoices.findFirst({
      where: { id, company_id: companyId },
      select: {
        status: true,
        cbte_type: true,
        customer: { select: { name: true, cuit: true, vat_condition_id: true } },
        lines: { select: { id: true, quantity: true, unit_price: true, net_amount: true, certification_id: true, service_item_id: true } },
      },
    });
    if (!invoice) return fail('Comprobante no encontrado');
    if (!isEditable(invoice.status)) return fail('Este comprobante ya no se puede modificar');

    const salesPoint = await prisma.sales_points.findFirst({
      where: { id: data.salesPointId, company_id: companyId },
      select: { id: true },
    });
    if (!salesPoint) return fail('Punto de venta inválido');

    const kind = kindOf(invoice.cbte_type);
    let letter = letterOf(invoice.cbte_type);
    if (kind === 'invoice') {
      const issuer = await loadIssuer(companyId);
      const resolved = resolveLetter(issuer.profile?.tax_condition ?? null, invoice.customer.vat_condition_id, invoice.customer.name);
      if (!resolved.ok) return fail(resolved.error);
      letter = resolved.letter;
    }

    const existing = new Map(invoice.lines.map((l) => [l.id, l]));
    const requestedItems = data.lines.flatMap((l) => (l.serviceItemId ? [l.serviceItemId] : []));
    const allowedItems = new Set(
      requestedItems.length > 0
        ? (
            await prisma.service_items.findMany({
              where: { id: { in: requestedItems }, company_id: companyId },
              select: { id: true },
            })
          ).map((i) => i.id)
        : []
    );
    const keptCertLines = new Set<string>();
    const lines: LineRow[] = [];
    for (const [index, line] of data.lines.entries()) {
      const vatRateId = letter === 'C' ? null : line.vatRateId;
      if (letter !== 'C' && (vatRateId === null || !isVatRateId(vatRateId))) {
        return fail(`Línea ${index + 1}: elegí la alícuota de IVA.`);
      }
      const previous = line.id ? existing.get(line.id) : undefined;
      if (previous?.certification_id) {
        keptCertLines.add(previous.id);
        lines.push({
          position: index + 1,
          description: line.description,
          quantity: previous.quantity.toString(),
          unit_price: previous.unit_price.toString(),
          net_amount: previous.net_amount.toFixed(2),
          vat_rate_id: vatRateId,
          service_item_id: previous.service_item_id,
          certification_id: previous.certification_id,
        });
        continue;
      }
      const quantity = parseScaled(line.quantity || '0', QUANTITY_SCALE);
      const unitPrice = parseScaled(line.unitPrice || '0', PRICE_SCALE);
      if (quantity === null || unitPrice === null) {
        return fail(`Línea ${index + 1}: la cantidad o el precio no son números válidos (hasta 4 decimales).`);
      }
      if (quantity < BigInt(0) || unitPrice < BigInt(0)) return fail(`Línea ${index + 1}: la cantidad y el precio no pueden ser negativos.`);
      const quantityText = formatScaled(quantity, QUANTITY_SCALE);
      const unitPriceText = formatScaled(unitPrice, PRICE_SCALE);
      if (line.serviceItemId && !allowedItems.has(line.serviceItemId)) return fail(`Línea ${index + 1}: el ítem no es de esta empresa.`);
      lines.push({
        position: index + 1,
        description: line.description,
        quantity: quantityText,
        unit_price: unitPriceText,
        net_amount: lineNet(quantityText, unitPriceText)!,
        vat_rate_id: vatRateId,
        service_item_id: line.serviceItemId ?? null,
        certification_id: null,
      });
    }
    const droppedCertLine = invoice.lines.find((l) => l.certification_id && !keptCertLines.has(l.id));
    if (droppedCertLine) {
      return fail('Las líneas de certificaciones no se quitan sueltas: quitá la certificación completa.');
    }

    const totals = await prisma.$transaction(async (tx) => {
      const cbteType = cbteTypeOf(letter, kind);
      await tx.invoices.update({
        where: { id },
        data: {
          cbte_type: cbteType,
          sales_point_id: data.salesPointId,
          issue_date: fromDateOnly(data.issueDate)!,
          concept: data.concept,
          service_from: fromDateOnly(data.serviceFrom),
          service_to: fromDateOnly(data.serviceTo),
          payment_due_date: fromDateOnly(data.paymentDueDate),
          notes: data.notes || null,
          // Una factura toma los datos fiscales ACTUALES del cliente; NC/ND conservan los del original.
          ...(kind === 'invoice'
            ? { receiver_doc_number: invoice.customer.cuit, receiver_vat_condition_id: invoice.customer.vat_condition_id ?? undefined }
            : {}),
        },
      });
      const result = await writeLinesAndTotals(tx, id, letter, lines);
      return { total: result.total, cbteType };
    });

    revalidatePath(COMERCIAL_PATH);
    return ok(totals);
  } catch (error) {
    logger.error('Error al guardar el borrador', { data: { error, id } });
    return fail(errorMessage(error, 'Error al guardar el borrador'));
  }
}

/** Quita una certificación del borrador junto con todas sus líneas, y la libera. */
export async function removeCertificationFromDraft(id: string, certificationId: string): Promise<ActionResult<{ total: string }>> {
  const denied = await denyUnless('create');
  if (denied) return fail(denied);
  const companyId = await getActiveCompanyId();
  try {
    const invoice = await prisma.invoices.findFirst({
      where: { id, company_id: companyId },
      select: {
        status: true,
        cbte_type: true,
        lines: { orderBy: { position: 'asc' } },
      },
    });
    if (!invoice) return fail('Comprobante no encontrado');
    if (!isEditable(invoice.status)) return fail('Este comprobante ya no se puede modificar');

    const remaining: LineRow[] = invoice.lines
      .filter((l) => l.certification_id !== certificationId)
      .map((l, index) => ({
        position: index + 1,
        description: l.description,
        quantity: l.quantity.toString(),
        unit_price: l.unit_price.toString(),
        net_amount: l.net_amount.toFixed(2),
        vat_rate_id: l.vat_rate_id,
        service_item_id: l.service_item_id,
        certification_id: l.certification_id,
      }));

    const totals = await prisma.$transaction(async (tx) => {
      await tx.invoice_certifications.deleteMany({ where: { invoice_id: id, certification_id: certificationId } });
      return writeLinesAndTotals(tx, id, letterOf(invoice.cbte_type), remaining);
    });
    revalidatePath(COMERCIAL_PATH);
    return ok({ total: totals.total });
  } catch (error) {
    logger.error('Error al quitar la certificación del borrador', { data: { error, id, certificationId } });
    return fail(errorMessage(error, 'Error al quitar la certificación'));
  }
}

/** Descarta un borrador (o un rechazado): sus certificaciones quedan libres para facturar. */
export async function deleteInvoiceDraft(id: string): Promise<ActionResult<{ releasedCertifications: number }>> {
  const denied = await denyUnless('delete');
  if (denied) return fail(denied);
  const companyId = await getActiveCompanyId();
  try {
    const invoice = await prisma.invoices.findFirst({
      where: { id, company_id: companyId },
      select: { status: true, _count: { select: { certifications: true } } },
    });
    if (!invoice) return fail('Comprobante no encontrado');
    if (!isDeletable(invoice.status)) return fail('Solo se descarta un borrador o un comprobante rechazado');

    await prisma.invoices.delete({ where: { id } });
    logger.info('Borrador de comprobante descartado', { data: { id } });
    revalidatePath(COMERCIAL_PATH);
    return ok({ releasedCertifications: invoice._count.certifications });
  } catch (error) {
    logger.error('Error al descartar el borrador', { data: { error, id } });
    return fail(errorMessage(error, 'Error al descartar el borrador'));
  }
}

/**
 * Borrador de nota de crédito o débito sobre un comprobante autorizado. Hereda cliente, letra,
 * moneda, cotización congelada, punto de venta, ambiente y período. NC total: copia las líneas y
 * el saldo completo (si ya hubo NC parciales, no se puede: queda una parcial por el saldo).
 */
export async function createAdjustmentDraft(input: AdjustmentInput): Promise<ActionResult<{ id: string }>> {
  const denied = await denyUnless('create');
  if (denied) return fail(denied);
  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  const { originalInvoiceId, kind, mode } = parsed.data;
  if (kind === 'debit_note' && mode === 'total') return fail('La nota de débito siempre se carga con líneas propias.');

  const companyId = await getActiveCompanyId();
  try {
    const original = await prisma.invoices.findFirst({
      where: { id: originalInvoiceId, company_id: companyId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (!original) return fail('Comprobante no encontrado');
    if (original.status !== 'autorizada') return fail('Solo se ajusta un comprobante autorizado');
    const originalKind = kindOf(original.cbte_type);
    if (originalKind === 'credit_note') return fail('Una nota de crédito no se ajusta con otra nota.');
    if (kind === 'credit_note' && originalKind !== 'invoice' && originalKind !== 'debit_note') {
      return fail('La nota de crédito tiene que ajustar una factura o una nota de débito.');
    }

    if (kind === 'credit_note') {
      const credit = await creditableRemaining(original.id);
      if (compareAmounts(credit.remaining, '0.00') <= 0) return fail('El comprobante ya está acreditado por completo.');
      if (mode === 'total' && credit.remaining !== credit.total) {
        return fail('Ya hay notas de crédito sobre este comprobante: cargá una parcial por el saldo.');
      }
    }

    const letter = letterOf(original.cbte_type);
    const today = argentinaDateOnly(new Date());
    const userId = await getSessionUserId();
    const firstRate = original.lines.find((l) => l.vat_rate_id !== null)?.vat_rate_id ?? (letter === 'C' ? null : DEFAULT_VAT_RATE_ID);

    const lines: LineRow[] =
      mode === 'total'
        ? original.lines.map((l) => ({
            position: l.position,
            description: l.description,
            quantity: l.quantity.toString(),
            unit_price: l.unit_price.toString(),
            net_amount: l.net_amount.toFixed(2),
            vat_rate_id: l.vat_rate_id,
            service_item_id: l.service_item_id,
            certification_id: null,
          }))
        : [
            {
              position: 1,
              description: kind === 'credit_note' ? 'Bonificación / ajuste' : 'Ajuste',
              quantity: '1',
              unit_price: '0',
              net_amount: '0.00',
              vat_rate_id: firstRate,
              service_item_id: null,
              certification_id: null,
            },
          ];

    const created = await prisma.$transaction(async (tx) => {
      const note = await tx.invoices.create({
        data: {
          company_id: companyId,
          environment: original.environment,
          sales_point_id: original.sales_point_id,
          customer_id: original.customer_id,
          cbte_type: cbteTypeOf(letter, kind),
          concept: original.concept,
          issue_date: fromDateOnly(today)!,
          service_from: original.service_from,
          service_to: original.service_to,
          payment_due_date: fromDateOnly(today),
          currency: original.currency,
          arca_currency_id: original.arca_currency_id,
          // La NC/ND usa la cotización del comprobante que ajusta.
          exchange_rate: original.exchange_rate,
          exchange_rate_date: original.exchange_rate_date,
          receiver_doc_type: original.receiver_doc_type,
          receiver_doc_number: original.receiver_doc_number,
          receiver_vat_condition_id: original.receiver_vat_condition_id,
          associated_invoice_id: original.id,
          created_by: userId,
        },
        select: { id: true },
      });
      await writeLinesAndTotals(tx, note.id, letter, lines);
      return note;
    });

    logger.info('Borrador de nota creado', { data: { id: created.id, originalInvoiceId, kind, mode } });
    revalidatePath(COMERCIAL_PATH);
    return ok(created);
  } catch (error) {
    logger.error('Error al crear la nota', { data: { error, originalInvoiceId, kind } });
    return fail(errorMessage(error, 'Error al crear la nota'));
  }
}
