import { formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';
import { formatMoney } from '@/features/Warehouses/lib/format';
import type { withholding_status, withholding_tax } from '@/generated/prisma/enums';
import { cents, divRound, money } from './payment-totals';
import { trimDecimals } from './quantity-format';

/**
 * Motor de retenciones (spec Compras etapa 5 §3.2). Puro: recibe el regimen, la situacion del
 * proveedor, las bases de esta orden y (para Ganancias) lo acumulado en el mes, y devuelve la
 * retencion a practicar o `null`. Aritmetica en centavos; las alicuotas son porcentajes con hasta
 * 4 decimales.
 */

export type WithholdingRegime = {
  id: string;
  code: string;
  description: string;
  rateRegistered: string;
  rateUnregistered: string | null;
  monthlyExemptAmount: string;
  minimumWithholding: string;
  /** Escala (honorarios): tramos sobre el importe sujeto a retencion. */
  scale: { from: string; to: string | null; fixed: string; rate: string }[] | null;
  vatPercentage: string | null;
  isActive: boolean;
};

export type WithholdingProfile = {
  status: withholding_status;
  /** Alicuota de padron (IIBB). */
  rate: string | null;
  exclusion: { percentage: string; from: string; to: string } | null;
};

export type WithholdingInput = {
  tax: withholding_tax;
  /** Fecha de pago prevista (YYYY-MM-DD): vigencia de la exclusion. */
  date: string;
  regime: WithholdingRegime | null;
  profile: WithholdingProfile | null;
  netBase: string;
  vatBase: string;
  /** El proveedor es Responsable Inscripto en IVA (para la retencion de IVA). */
  supplierIsRegistered: boolean;
  /** Ganancias: bases y retenciones de las ordenes pagadas del mes en el mismo regimen. */
  month: { previousBase: string; previousWithheld: string };
};

export type WithholdingResult = {
  tax: withholding_tax;
  regimeId: string;
  base: string;
  /** Porcentaje aplicado (en escala, el efectivo). */
  rate: string;
  amount: string;
  detail: string;
  /** Porcentaje de exclusion aplicado (vigente a la fecha), para el certificado y los archivos. */
  exclusionPercentage: string | null;
};

const ZERO = BigInt(0);
const RATE_SCALE = 4;

const rate4 = (value: string | null | undefined) => (value ? (parseScaled(value, RATE_SCALE) ?? ZERO) : ZERO);
const rateText = (value: bigint) => trimDecimals(formatScaled(value, RATE_SCALE));
/** Porcentaje para los textos del detalle (coma decimal). */
const pctText = (value: bigint) => rateText(value).replace('.', ',');
/** centavos × porcentaje (4 decimales) → centavos. */
const percentOf = (amount: bigint, rate: bigint) => divRound(amount * rate, BigInt(1_000_000));
const $ = (value: bigint) => formatMoney(money(value));

function scaleTax(taxable: bigint, scale: NonNullable<WithholdingRegime['scale']>): bigint {
  const bracket = scale.find((b) => taxable > cents(b.from) && (b.to === null || taxable <= cents(b.to)));
  if (!bracket) return ZERO;
  return cents(bracket.fixed) + percentOf(taxable - cents(bracket.from), rate4(bracket.rate));
}

export function computeWithholding(input: WithholdingInput): WithholdingResult | null {
  const { regime, profile } = input;
  if (!regime || !regime.isActive || !profile || profile.status === 'EXEMPT') return null;

  let base: bigint;
  let amount: bigint;
  let rate: bigint;
  let detail: string;

  const exclusion = profile.exclusion;
  const exclusionPct = exclusion && exclusion.from <= input.date && input.date <= exclusion.to ? rate4(exclusion.percentage) : null;
  const exclusionText = () => ` − exclusión ${pctText(exclusionPct!)} % (vigente hasta ${exclusion!.to.split('-').reverse().join('/')})`;
  let exclusionApplied = false;

  if (input.tax === 'GANANCIAS') {
    base = cents(input.netBase);
    if (profile.status === 'NOT_REGISTERED') {
      rate = rate4(regime.rateUnregistered ?? regime.rateRegistered);
      amount = percentOf(base, rate);
      detail = `No inscripto: ${$(base)} × ${pctText(rate)} %`;
    } else {
      const accumulated = cents(input.month.previousBase) + base;
      const exempt = cents(regime.monthlyExemptAmount);
      const taxable = accumulated > exempt ? accumulated - exempt : ZERO;
      const previous = cents(input.month.previousWithheld);
      const tax = regime.scale?.length ? scaleTax(taxable, regime.scale) : percentOf(taxable, rate4(regime.rateRegistered));
      // La exclusion reduce el impuesto del acumulado; despues se descuenta lo ya retenido en el mes.
      const due = exclusionPct === null ? tax : tax - percentOf(tax, exclusionPct);
      exclusionApplied = exclusionPct !== null;
      amount = due - previous;
      rate = regime.scale?.length ? (base === ZERO ? ZERO : divRound(amount * BigInt(1_000_000), base)) : rate4(regime.rateRegistered);
      detail =
        `Acumulado del mes ${$(accumulated)} − mínimo no sujeto ${$(exempt)} = ${$(taxable)}` +
        (regime.scale?.length ? ' por escala' : ` × ${pctText(rate4(regime.rateRegistered))} %`) +
        ` = ${$(tax)}` +
        (exclusionPct !== null ? `${exclusionText()} = ${$(due)}` : '') +
        (previous > ZERO ? ` − retenido en el mes ${$(previous)}` : '');
    }
  } else if (input.tax === 'IVA') {
    if (!input.supplierIsRegistered || profile.status !== 'SUBJECT' || !regime.vatPercentage) return null;
    base = cents(input.vatBase);
    rate = rate4(regime.vatPercentage);
    amount = percentOf(base, rate);
    detail = `${pctText(rate)} % del IVA pagado (${$(base)})`;
  } else {
    // IIBB y SUSS: alicuota sobre la base neta. IIBB usa la del padron del proveedor si la tiene.
    base = cents(input.netBase);
    rate =
      input.tax === 'IIBB' && profile.rate
        ? rate4(profile.rate)
        : profile.status === 'NOT_REGISTERED' && regime.rateUnregistered
          ? rate4(regime.rateUnregistered)
          : rate4(regime.rateRegistered);
    amount = percentOf(base, rate);
    detail = `${$(base)} × ${pctText(rate)} %${input.tax === 'IIBB' && profile.rate ? ' (padrón)' : ''}`;
  }

  if (exclusionPct !== null && !exclusionApplied) {
    amount = amount - percentOf(amount, exclusionPct);
    detail += exclusionText();
  }

  if (amount <= ZERO || amount < cents(regime.minimumWithholding)) return null;
  return {
    tax: input.tax,
    regimeId: regime.id,
    base: money(base),
    rate: rateText(rate),
    amount: money(amount),
    detail: `${detail} = ${$(amount)}`,
    exclusionPercentage: exclusionPct === null ? null : rateText(exclusionPct),
  };
}
