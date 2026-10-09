import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney, formatQuantity, formatUnitCost } from '@/features/Warehouses/lib/format';
import { RECEIVER_VAT_CONDITIONS, isReceiverVatConditionId } from '@/shared/lib/arca/catalogs';
import { BadgeCheck, CircleX, Paperclip, ShieldAlert, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';
import Link from 'next/link';
import type { SupplierInvoiceDetail } from '../../actions/invoices.server';
import { HistoryCard } from '../../components/HistoryCard';
import { ARCA_CHECK_LABELS } from '../../lib/invoice-status';
import { SUPPLIER_INVOICE_TAX_LABELS } from '../../schemas/invoices';
import { SupplierInvoiceActions } from './SupplierInvoiceActions';
import { SupplierInvoiceStatusBadge } from './SupplierInvoiceStatusBadge';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const day = (value: string | null) => (value ? moment(value, 'YYYY-MM-DD').format('DD/MM/YYYY') : '—');
const period = (value: string) => {
  const text = moment(value, 'YYYY-MM').locale('es').format('MMMM YYYY');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const ARCA_ICONS = { APPROVED: ShieldCheck, REJECTED: ShieldX, UNAVAILABLE: ShieldAlert } as const;
const ARCA_CLASSES = {
  APPROVED: 'text-green-700 dark:text-green-400',
  REJECTED: 'text-red-700 dark:text-red-400',
  UNAVAILABLE: 'text-amber-700 dark:text-amber-400',
} as const;

/** Detalle del comprobante: datos, lineas con las diferencias resaltadas, IVA, tributos y estado. */
export function SupplierInvoiceDetailView({ invoice }: { invoice: SupplierInvoiceDetail }) {
  const vatCondition = isReceiverVatConditionId(invoice.supplier.vat_condition_id)
    ? RECEIVER_VAT_CONDITIONS[invoice.supplier.vat_condition_id].label
    : '—';
  const isCredit = invoice.kind === 'credit_note';
  const ArcaIcon = invoice.arcaCheck ? ARCA_ICONS[invoice.arcaCheck.result] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{invoice.label}</h1>
        <SupplierInvoiceStatusBadge status={invoice.status} />
        <div className="w-full sm:ml-auto sm:w-auto">
          <SupplierInvoiceActions invoice={invoice} />
        </div>
      </div>

      {invoice.status === 'OBSERVED' && invoice.observations.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>
            Observada: {invoice.observations.length} {invoice.observations.length === 1 ? 'diferencia' : 'diferencias'}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {invoice.observations.map((o, i) => (
                <li key={`${o.code}-${i}`}>{o.message}</li>
              ))}
            </ul>
            <p className="mt-2">Quien tenga permiso de aprobar la acepta (queda a pagar) o la rechaza.</p>
          </AlertDescription>
        </Alert>
      )}
      {invoice.resolution && (invoice.status === 'APPROVED' || invoice.status === 'REJECTED') && (
        <Alert variant={invoice.status === 'REJECTED' ? 'destructive' : 'default'}>
          {invoice.status === 'APPROVED' ? <BadgeCheck className="h-4 w-4" /> : <CircleX className="h-4 w-4" />}
          <AlertTitle>{invoice.status === 'APPROVED' ? 'Aprobada con diferencias' : 'Rechazada'}</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {invoice.resolution.comment}
            {invoice.observations.length > 0 && (
              <ul className="mt-2 list-disc pl-4 text-xs">
                {invoice.observations.map((o, i) => (
                  <li key={`${o.code}-${i}`}>{o.message}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
      {invoice.status === 'CANCELLED' && invoice.cancelReason && (
        <Alert variant="destructive">
          <AlertTitle>Anulada</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{invoice.cancelReason}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Proveedor">
              <Link href={`/dashboard/purchases/suppliers/${invoice.supplier.id}`} className="hover:underline">
                {invoice.supplier.name}
              </Link>
              <span className="block text-xs text-muted-foreground">
                CUIT {invoice.supplier.cuit} · {vatCondition}
              </span>
            </Field>
            <Field label="Fecha de emisión">{day(invoice.issueDate)}</Field>
            <Field label="Vencimiento del pago">{day(invoice.dueDate)}</Field>
            <Field label="Período IVA">{period(invoice.vatPeriod)}</Field>
            <Field label="CAE">
              {invoice.cae ?? '—'}
              {invoice.caeDueDate && <span className="block text-xs text-muted-foreground">vence {day(invoice.caeDueDate)}</span>}
            </Field>
            <Field label="Constatación en ARCA">
              {invoice.arcaCheck && ArcaIcon ? (
                <span className={`inline-flex items-center gap-1 ${ARCA_CLASSES[invoice.arcaCheck.result]}`}>
                  <ArcaIcon className="h-4 w-4" />
                  {ARCA_CHECK_LABELS[invoice.arcaCheck.result]}
                  {invoice.arcaCheck.at && <span className="text-muted-foreground"> · {moment(invoice.arcaCheck.at).format('DD/MM/YYYY HH:mm')}</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">{invoice.cae ? 'Sin constatar' : 'Sin CAE: no se puede constatar'}</span>
              )}
              {invoice.arcaCheck?.detail && <span className="block text-xs text-muted-foreground">{invoice.arcaCheck.detail}</span>}
            </Field>
            <Field label={isCredit ? 'Factura que corrige' : 'Notas vinculadas'}>
              {invoice.relatedInvoice ? (
                <Link href={`/dashboard/purchases/invoices/${invoice.relatedInvoice.id}`} className="underline">
                  {invoice.relatedInvoice.label}
                </Link>
              ) : invoice.relatedNotes.length > 0 ? (
                <span className="flex flex-col">
                  {invoice.relatedNotes.map((note) => (
                    <Link key={note.id} href={`/dashboard/purchases/invoices/${note.id}`} className="underline">
                      {note.label}
                      {note.status === 'CANCELLED' ? ' (anulada)' : ''}
                    </Link>
                  ))}
                </span>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Comprobante">
              {invoice.attachment ? (
                <a href={invoice.attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                  <Paperclip className="h-3.5 w-3.5" />
                  {invoice.attachment.name}
                </a>
              ) : (
                'Sin adjunto'
              )}
            </Field>
          </dl>
          {invoice.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Líneas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Alícuota</TableHead>
                  <TableHead className="text-right">{invoice.letter === 'C' ? 'Importe' : 'Neto'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line) => {
                  const flagged = line.observationCodes.length > 0;
                  const priceFlag = line.observationCodes.includes('PRICE');
                  const quantityFlag = line.observationCodes.includes('QUANTITY');
                  const rateFlag = line.observationCodes.includes('VAT_RATE');
                  return (
                    <TableRow key={line.id} className={flagged ? 'bg-amber-50 dark:bg-amber-950/30' : undefined}>
                      <TableCell>
                        <span className="block">{line.itemLabel}</span>
                        <span className="block text-xs text-muted-foreground">
                          {line.order ? (
                            <Link href={`/dashboard/purchases/orders/${line.order.id}`} className="font-mono underline">
                              {line.order.number}
                            </Link>
                          ) : (
                            `Gasto · ${line.expenseCategory?.name ?? 'sin concepto'}`
                          )}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${quantityFlag ? 'font-medium text-amber-800 dark:text-amber-300' : ''}`}>
                        {line.quantity ? `${formatQuantity(line.quantity)} ${line.unitAbbr ?? ''}` : '—'}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${priceFlag ? 'font-medium text-amber-800 dark:text-amber-300' : ''}`}>
                        {line.unitPrice ? formatUnitCost(line.unitPrice) : '—'}
                        {priceFlag && line.orderUnitPrice && (
                          <span className="block text-xs font-normal">OC {formatUnitCost(line.orderUnitPrice)}</span>
                        )}
                      </TableCell>
                      <TableCell className={rateFlag ? 'font-medium text-amber-800 dark:text-amber-300' : ''}>{line.vatRateLabel ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(line.netTotal)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="ml-auto grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
            <dt className="text-muted-foreground">{invoice.letter === 'C' ? 'Importe de las líneas' : 'Neto gravado'}</dt>
            <dd className="text-right">{formatMoney(invoice.amounts.netTaxed)}</dd>
            {invoice.vat.map((v) => (
              <div key={v.vatRateId} className="contents">
                <dt className="text-muted-foreground">
                  IVA {v.label} <span className="text-xs">sobre {formatMoney(v.base)}</span>
                </dt>
                <dd className="text-right">{formatMoney(v.amount)}</dd>
              </div>
            ))}
            {Number(invoice.amounts.netUntaxed) > 0 && (
              <>
                <dt className="text-muted-foreground">No gravado</dt>
                <dd className="text-right">{formatMoney(invoice.amounts.netUntaxed)}</dd>
              </>
            )}
            {Number(invoice.amounts.exempt) > 0 && (
              <>
                <dt className="text-muted-foreground">Exento</dt>
                <dd className="text-right">{formatMoney(invoice.amounts.exempt)}</dd>
              </>
            )}
            {invoice.taxes.map((t) => (
              <div key={t.id} className="contents">
                <dt className="text-muted-foreground">
                  {SUPPLIER_INVOICE_TAX_LABELS[t.kind]}
                  {t.province ? ` · ${t.province}` : ''}
                  {t.description ? ` · ${t.description}` : ''}
                </dt>
                <dd className="text-right">{formatMoney(t.amount)}</dd>
              </div>
            ))}
            <dt className="text-base font-semibold">Total</dt>
            <dd className="text-right text-base font-semibold">{formatMoney(invoice.amounts.total)}</dd>
          </dl>
        </CardContent>
      </Card>

      <HistoryCard history={invoice.history} />
    </div>
  );
}
