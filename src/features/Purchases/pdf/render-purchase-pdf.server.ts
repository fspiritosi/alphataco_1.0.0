import 'server-only';

import { Logger } from '@/lib/logger';
import { toDateOnly } from '@/shared/lib/date-only';
import { prisma } from '@/shared/lib/prisma';
import { storageDownload } from '@/shared/lib/storage';
import { isSafeStorageKey, parseStorageFileUrl } from '@/shared/lib/storage-url';
import moment from 'moment';
import { PurchaseError } from '../lib/purchase-errors';
import { PurchaseOrderPdfDocument, PurchaseQuotePdfDocument, type PdfLogo, type ReactPdf } from './PurchasePdfDocuments';
import { buildOrderPdfData, buildQuotePdfData, type PurchasePdfSource } from './purchase-pdf-data';

const logger = new Logger('features/Purchases/pdf');

/** Ver `render-invoice-pdf.server.ts`: react-pdf se resuelve desde node_modules, fuera del bundle. */
function loadReactPdf(): Promise<ReactPdf> {
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@react-pdf/renderer');
}

export type RenderedPdf = { filename: string; content: Uint8Array };

const COMPANY_SELECT = {
  company_name: true,
  company_cuit: true,
  address: true,
  company_logo: true,
  cities: { select: { name: true } },
  provinces: { select: { name: true } },
} as const;

const SUPPLIER_SELECT = {
  name: true,
  cuit: true,
  vat_condition_id: true,
  street: true,
  city: true,
  province: true,
} as const;

const REQUEST_LINE_SELECT = {
  description: true,
  material: { select: { code: true, name: true } },
  unit: { select: { abbreviation: true } },
} as const;

/**
 * Logo de la empresa leido directo de MinIO (la URL guardada apunta al proxy `/api/files`, que
 * pide sesion). Si no se puede leer, el PDF sale sin logo: nunca se cae por eso.
 */
async function loadCompanyLogo(logoUrl: string | null): Promise<PdfLogo> {
  if (!logoUrl) return null;
  const parsed = parseStorageFileUrl(logoUrl);
  if (!parsed || !isSafeStorageKey(parsed.path)) return null;
  const extension = parsed.path.split('.').pop()?.toLowerCase();
  const format = extension === 'png' ? 'png' : extension === 'jpg' || extension === 'jpeg' ? 'jpg' : null;
  if (!format) return null;
  const downloaded = await storageDownload(parsed.bucket, parsed.path);
  if (!downloaded.ok) {
    logger.warn('No se pudo leer el logo de la empresa: el PDF sale sin logo', { data: { path: parsed.path } });
    return null;
  }
  return { data: Buffer.from(await downloaded.data.arrayBuffer()), format };
}

type CompanyRow = {
  company_name: string;
  company_cuit: string;
  address: string;
  cities: { name: string } | null;
  provinces: { name: string } | null;
};

function companySource(company: CompanyRow): PurchasePdfSource['company'] {
  return {
    name: company.company_name,
    cuit: company.company_cuit,
    address: company.address,
    city: company.cities?.name ?? null,
    province: company.provinces?.name ?? null,
  };
}

type SupplierRow = { name: string; cuit: bigint; vat_condition_id: number; street: string | null; city: string | null; province: string | null };

function supplierSource(supplier: SupplierRow): PurchasePdfSource['supplier'] {
  return {
    name: supplier.name,
    cuit: supplier.cuit.toString(),
    vatConditionId: supplier.vat_condition_id,
    street: supplier.street,
    city: supplier.city,
    province: supplier.province,
  };
}

const dateOnly = (value: Date) => moment(value).format('YYYY-MM-DD');

export async function renderPurchaseQuotePdf(quoteId: string, companyId: string): Promise<RenderedPdf> {
  const quote = await prisma.purchase_quotes.findFirst({
    where: { id: quoteId, company_id: companyId },
    select: {
      number: true,
      created_at: true,
      notes: true,
      company: { select: COMPANY_SELECT },
      supplier: { select: SUPPLIER_SELECT },
      lines: {
        select: { quantity: true, request_line: { select: { ...REQUEST_LINE_SELECT, position: true, request: { select: { number: true } } } } },
      },
    },
  });
  if (!quote) throw new PurchaseError('La cotización no existe');

  const lines = [...quote.lines].sort(
    (a, b) =>
      a.request_line.request.number.localeCompare(b.request_line.request.number) || a.request_line.position - b.request_line.position
  );
  const data = buildQuotePdfData({
    number: quote.number,
    date: dateOnly(quote.created_at),
    company: companySource(quote.company),
    supplier: supplierSource(quote.supplier),
    lines: lines.map((line) => ({
      code: line.request_line.material?.code ?? null,
      name: line.request_line.material?.name ?? null,
      description: line.request_line.description,
      quantity: line.quantity.toString(),
      unitAbbr: line.request_line.unit.abbreviation,
      unitPrice: null,
      vatRateId: null,
      netTotal: null,
      vatAmount: null,
    })),
    totals: null,
    deliveryDate: null,
    deliveryPlace: null,
    paymentTermDays: null,
    notes: quote.notes,
    status: null,
    approvedAt: null,
  });

  const [rp, logo] = await Promise.all([loadReactPdf(), loadCompanyLogo(quote.company.company_logo)]);
  const buffer = await rp.renderToBuffer(PurchaseQuotePdfDocument(rp, data, logo));
  return { filename: `${quote.number}.pdf`, content: new Uint8Array(buffer) };
}

export async function renderPurchaseOrderPdf(orderId: string, companyId: string): Promise<RenderedPdf> {
  const order = await prisma.purchase_orders.findFirst({
    where: { id: orderId, company_id: companyId },
    select: {
      number: true,
      status: true,
      created_at: true,
      approved_at: true,
      delivery_date: true,
      delivery_place: true,
      payment_term_days: true,
      notes: true,
      subtotal: true,
      vat_total: true,
      total: true,
      company: { select: COMPANY_SELECT },
      supplier: { select: SUPPLIER_SELECT },
      lines: {
        orderBy: { position: 'asc' },
        select: {
          quantity: true,
          unit_price: true,
          vat_rate_id: true,
          net_total: true,
          vat_amount: true,
          request_line: { select: REQUEST_LINE_SELECT },
        },
      },
    },
  });
  if (!order) throw new PurchaseError('La orden de compra no existe');

  const data = buildOrderPdfData({
    number: order.number,
    // La OC vale desde que se aprueba: esa es su fecha. Antes, la de alta.
    date: dateOnly(order.approved_at ?? order.created_at),
    company: companySource(order.company),
    supplier: supplierSource(order.supplier),
    lines: order.lines.map((line) => ({
      code: line.request_line.material?.code ?? null,
      name: line.request_line.material?.name ?? null,
      description: line.request_line.description,
      quantity: line.quantity.toString(),
      unitAbbr: line.request_line.unit.abbreviation,
      unitPrice: line.unit_price.toString(),
      vatRateId: line.vat_rate_id,
      netTotal: line.net_total.toFixed(2),
      vatAmount: line.vat_amount.toFixed(2),
    })),
    totals: { subtotal: order.subtotal.toFixed(2), vatTotal: order.vat_total.toFixed(2), total: order.total.toFixed(2) },
    deliveryDate: toDateOnly(order.delivery_date),
    deliveryPlace: order.delivery_place,
    paymentTermDays: order.payment_term_days,
    notes: order.notes,
    status: order.status,
    approvedAt: order.approved_at?.toISOString() ?? null,
  });

  const [rp, logo] = await Promise.all([loadReactPdf(), loadCompanyLogo(order.company.company_logo)]);
  const buffer = await rp.renderToBuffer(PurchaseOrderPdfDocument(rp, data, logo));
  return { filename: `${order.number}.pdf`, content: new Uint8Array(buffer) };
}
