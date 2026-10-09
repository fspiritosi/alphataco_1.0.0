import { PRICE_SCALE, QUANTITY_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { formatMoney, formatUnitCost } from '@/features/Warehouses/lib/format';
import { VAT_RATES, VAT_RATE_LABELS, isVatRateId, type VoucherKind, type VoucherLetter } from '@/shared/lib/arca/catalogs';
import type { purchase_order_status } from '@/generated/prisma/enums';
import type { ExpectedLetter } from './invoice-letter';
import { comparePrices } from './order-totals';
import { formatQuantityWithUnit } from './quantity-format';

/**
 * Control de un comprobante de proveedor (spec Compras etapa 4 §3.3). Puro: recibe todo ya leido
 * (el servidor lockea las OC, lee lo recibido y lo facturado por otros comprobantes y llama aca).
 * Los errores impiden guardar; las observaciones dejan el comprobante OBSERVED.
 */

export type InvoiceObservationCode = 'LETTER' | 'VAT' | 'PRICE' | 'VAT_RATE' | 'QUANTITY' | 'ARCA';

export type InvoiceObservation = { code: InvoiceObservationCode; message: string; lineId?: string };

export type InvoiceControlLine =
  | {
      kind: 'order';
      /** Identifica la fila del comprobante (para resaltarla). */
      lineId: string;
      orderLineId: string;
      label: string;
      orderNumber: string;
      supplierMatches: boolean;
      orderStatus: purchase_order_status;
      quantity: string;
      unitPrice: string;
      vatRateId: number | null;
      orderPrice: string;
      orderVatRateId: number;
      /** Facturado neto de la linea de OC en los OTROS comprobantes vigentes no rechazados. */
      invoicedOthers: string;
      /** Recibido en recepciones vigentes. */
      received: string;
      unit: string | null;
    }
  | { kind: 'expense'; lineId: string; label: string };

export type InvoiceControlInput = {
  kind: VoucherKind;
  letter: VoucherLetter;
  expectedLetter: ExpectedLetter;
  vatDifferences: readonly { vatRateId: number; informed: string; computed: string }[];
  lines: readonly InvoiceControlLine[];
};

const NOT_APPROVED: purchase_order_status[] = ['DRAFT', 'PENDING_APPROVAL'];

const ZERO = BigInt(0);

function quantity(value: string): bigint {
  return parseScaled(value, QUANTITY_SCALE) ?? ZERO;
}

const qty = (value: bigint, unit: string | null) => formatQuantityWithUnit(formatScaled(value, QUANTITY_SCALE), unit);

const rateLabel = (id: number | null) => (id !== null && isVatRateId(id) ? VAT_RATE_LABELS[id] : 'sin alícuota');

/** Precio final (neto + IVA) a 4 decimales: lo que cobra un monotributista contra una OC con IVA. */
export function grossPrice(netPrice: string, vatRateId: number): string {
  const price = parseScaled(netPrice, PRICE_SCALE) ?? ZERO;
  const rate = isVatRateId(vatRateId) ? (parseScaled(VAT_RATES[vatRateId], 2) ?? ZERO) : ZERO;
  const scaled = price * (BigInt(10000) + rate);
  const half = BigInt(5000);
  return formatScaled((scaled + half) / BigInt(10000), PRICE_SCALE);
}

export function controlSupplierInvoice(input: InvoiceControlInput): {
  errors: string[];
  observations: InvoiceObservation[];
} {
  const errors: string[] = [];
  const observations: InvoiceObservation[] = [];

  if (!input.expectedLetter.ok) {
    observations.push({ code: 'LETTER', message: input.expectedLetter.error });
  } else if (input.expectedLetter.letter !== input.letter) {
    observations.push({ code: 'LETTER', message: `Se cargó una ${input.letter}. ${input.expectedLetter.reason}` });
  }

  for (const diff of input.vatDifferences) {
    observations.push({
      code: 'VAT',
      message: `IVA ${rateLabel(diff.vatRateId)}: informado ${formatMoney(diff.informed)}, calculado ${formatMoney(diff.computed)}`,
    });
  }

  const orderLines = input.lines.filter((l): l is Extract<InvoiceControlLine, { kind: 'order' }> => l.kind === 'order');
  const statusErrors = new Set<string>();

  for (const line of orderLines) {
    if (!line.supplierMatches) {
      errors.push(`${line.label}: la ${line.orderNumber} es de otro proveedor`);
      continue;
    }
    if (line.orderStatus === 'CANCELLED') {
      statusErrors.add(`La ${line.orderNumber} está anulada`);
      continue;
    }
    if (NOT_APPROVED.includes(line.orderStatus)) {
      statusErrors.add(`La ${line.orderNumber} no está aprobada`);
      continue;
    }
    const expectedPrice = input.letter === 'C' ? grossPrice(line.orderPrice, line.orderVatRateId) : line.orderPrice;
    if (comparePrices(line.unitPrice, expectedPrice) !== 0) {
      observations.push({
        code: 'PRICE',
        lineId: line.lineId,
        message: `${line.label}: precio ${formatUnitCost(line.unitPrice)}, en la ${line.orderNumber} ${formatUnitCost(expectedPrice)}`,
      });
    }
    if (input.letter !== 'C' && line.vatRateId !== line.orderVatRateId) {
      observations.push({
        code: 'VAT_RATE',
        lineId: line.lineId,
        message: `${line.label}: alícuota ${rateLabel(line.vatRateId)}, en la ${line.orderNumber} ${rateLabel(line.orderVatRateId)}`,
      });
    }
  }
  errors.push(...statusErrors);

  // Cantidad: por linea de OC, sumando las filas del comprobante que la apuntan.
  const groups = new Map<string, Extract<InvoiceControlLine, { kind: 'order' }>[]>();
  for (const line of orderLines) {
    if (!line.supplierMatches || line.orderStatus === 'CANCELLED' || NOT_APPROVED.includes(line.orderStatus)) continue;
    groups.set(line.orderLineId, [...(groups.get(line.orderLineId) ?? []), line]);
  }
  for (const lines of groups.values()) {
    const first = lines[0]!;
    const own = lines.reduce((acc, l) => acc + quantity(l.quantity), ZERO);
    const others = quantity(first.invoicedOthers);
    if (input.kind === 'credit_note') {
      if (own > others) {
        errors.push(
          `${first.label}: la nota de crédito acredita ${qty(own, first.unit)} y en la ${first.orderNumber} hay ${qty(others, first.unit)} facturadas`
        );
      }
      continue;
    }
    const invoiced = others + own;
    const received = quantity(first.received);
    if (invoiced > received) {
      observations.push({
        code: 'QUANTITY',
        lineId: first.lineId,
        message: `${first.label}: facturado ${qty(invoiced, first.unit)}, recibido ${qty(received, first.unit)} en la ${first.orderNumber}`,
      });
    }
  }

  return { errors, observations };
}
