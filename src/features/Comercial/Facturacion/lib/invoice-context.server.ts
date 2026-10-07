import 'server-only';
import { cbteTypesOfKind } from '@/shared/lib/arca/catalogs';
import { normalizeCompanyCuit } from '@/shared/lib/arca/server/session';
import { toDateOnly } from '@/shared/lib/date-only';
import { prisma } from '@/shared/lib/prisma';
import { amountOf, AMOUNT_SCALE, formatScaled } from './invoice-math';
import type { IssuerSnapshot, ReceiverSnapshot } from './snapshots';
import { receiverVatLabel } from './snapshots';

/**
 * Lecturas compartidas por las actions de Facturación (borradores, emisión, NC/ND). Server-only:
 * nada de esto viaja tal cual al cliente (ver `serializers.ts`).
 */

export const invoiceInclude = {
  lines: { orderBy: { position: 'asc' } },
  vat_breakdown: { orderBy: { vat_rate_id: 'asc' } },
  certifications: {
    include: {
      certification: {
        select: { id: true, number: true, period_from: true, period_to: true, total: true, currency: true, status: true },
      },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      cuit: true,
      vat_condition_id: true,
      fiscal_street: true,
      fiscal_city: true,
      fiscal_postal_code: true,
      fiscal_province: { select: { name: true } },
    },
  },
  sales_point: { select: { id: true, number: true, name: true, is_active: true } },
  associated_invoice: {
    select: {
      id: true,
      cbte_type: true,
      number: true,
      issue_date: true,
      total: true,
      cae: true,
      environment: true,
      sales_point: { select: { number: true } },
    },
  },
  adjustments: {
    select: { id: true, cbte_type: true, number: true, status: true, total: true, sales_point: { select: { number: true } } },
    orderBy: { created_at: 'asc' },
  },
} as const;

export async function loadInvoice(id: string, companyId: string) {
  return prisma.invoices.findFirst({ where: { id, company_id: companyId }, include: invoiceInclude });
}

export type LoadedInvoice = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>;

export async function loadIssuer(companyId: string) {
  const [company, profile] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { company_name: true, company_cuit: true } }),
    prisma.company_fiscal_profiles.findUnique({
      where: { company_id: companyId },
      include: { provinces: { select: { name: true } } },
    }),
  ]);
  if (!company) throw new Error('Empresa no encontrada');
  return { company, profile };
}

export type LoadedIssuer = Awaited<ReturnType<typeof loadIssuer>>;

export function buildIssuerSnapshot(issuer: LoadedIssuer): IssuerSnapshot | null {
  const { company, profile } = issuer;
  if (!profile) return null;
  return {
    name: company.company_name,
    cuit: normalizeCompanyCuit(company.company_cuit),
    taxCondition: profile.tax_condition,
    grossIncomeNumber: profile.gross_income_number,
    grossIncomeRegime: profile.gross_income_regime,
    activityStartDate: toDateOnly(profile.activity_start_date) ?? '',
    street: profile.fiscal_street,
    city: profile.fiscal_city,
    province: profile.provinces?.name ?? null,
    postalCode: profile.fiscal_postal_code,
  };
}

export function buildReceiverSnapshot(customer: LoadedInvoice['customer']): ReceiverSnapshot {
  return {
    name: customer.name,
    cuit: customer.cuit.toString(),
    vatConditionId: customer.vat_condition_id ?? 0,
    vatConditionLabel: receiverVatLabel(customer.vat_condition_id),
    street: customer.fiscal_street,
    city: customer.fiscal_city,
    province: customer.fiscal_province?.name ?? null,
    postalCode: customer.fiscal_postal_code,
  };
}

/**
 * Saldo acreditable de un comprobante: su total menos las NC que ya lo ajustan (autorizadas o en
 * vuelo: emitiendo/pendiente, que pueden quedar autorizadas). `excludeId` deja afuera a la NC que
 * se está validando.
 */
export async function creditableRemaining(originalId: string, excludeId?: string): Promise<{ total: string; remaining: string }> {
  const [original, notes] = await Promise.all([
    prisma.invoices.findUnique({ where: { id: originalId }, select: { total: true } }),
    prisma.invoices.findMany({
      where: {
        associated_invoice_id: originalId,
        cbte_type: { in: cbteTypesOfKind('credit_note') },
        status: { in: ['autorizada', 'emitiendo', 'pendiente'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { total: true },
    }),
  ]);
  if (!original) throw new Error('Comprobante original no encontrado');
  const credited = notes.reduce((acc, n) => acc + amountOf(n.total.toFixed(2)), BigInt(0));
  const total = amountOf(original.total.toFixed(2));
  return { total: formatScaled(total, AMOUNT_SCALE), remaining: formatScaled(total - credited, AMOUNT_SCALE) };
}
