import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCuit } from '@/features/Purchases/lib/supplier-ids';
import { formatMoney, formatQuantity, formatUnitCost } from '@/features/Warehouses/lib/format';
import { VAT_RATE_LABELS, isVatRateId } from '@/shared/lib/arca/catalogs';
import moment from 'moment';
import Link from 'next/link';
import type { PurchaseOrderDetail } from '../../actions/orders.server';
import { ExpiredSupplierDocumentsAlert } from '../../components/ExpiredSupplierDocumentsAlert';
import { HistoryCard } from '../../components/HistoryCard';
import { PurchaseOrderActions } from './PurchaseOrderActions';
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** Detalle de la OC: cabecera, condiciones, lineas con su solicitud de origen, totales e historial. */
export function PurchaseOrderDetailView({ order }: { order: PurchaseOrderDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{order.number}</h1>
        <PurchaseOrderStatusBadge status={order.status} />
        <div className="ml-auto">
          <PurchaseOrderActions order={order} />
        </div>
      </div>

      {order.rejectionNotes && (
        <Alert variant="destructive">
          <AlertTitle>Rechazada: hay que corregirla</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{order.rejectionNotes}</AlertDescription>
        </Alert>
      )}
      {order.status !== 'CANCELLED' && order.status !== 'SENT' && (
        <ExpiredSupplierDocumentsAlert supplierId={order.supplier.id} documents={order.expiredDocuments} />
      )}

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Proveedor">
              <Link href={`/dashboard/purchases/suppliers/${order.supplier.id}`} className="hover:underline">
                {order.supplier.name}
              </Link>
              <span className="block text-xs text-muted-foreground tabular-nums">{formatCuit(order.supplier.cuit)}</span>
            </Field>
            <Field label="Fecha de entrega">
              {order.deliveryDate ? moment(order.deliveryDate, 'YYYY-MM-DD').format('DD/MM/YYYY') : 'Sin fecha'}
            </Field>
            <Field label="Lugar de entrega">{order.deliveryPlace ?? '—'}</Field>
            <Field label="Plazo de pago">
              {order.paymentTermDays === null ? 'Sin plazo' : order.paymentTermDays === 0 ? 'Contado' : `${order.paymentTermDays} días`}
            </Field>
            <Field label="Creada por">{order.creator ?? '—'}</Field>
            {order.quote && (
              <Field label="Cotización">
                <Link href={`/dashboard/purchases/quotes/${order.quote.id}`} className="font-mono underline">
                  {order.quote.number}
                </Link>
              </Field>
            )}
            {order.notes && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Observaciones">
                  <span className="whitespace-pre-wrap">{order.notes}</span>
                </Field>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qué se compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Solicitud</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Unitario neto</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line, i) => (
                  <TableRow key={line.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>{line.itemLabel}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/purchases/requests/${line.request.id}`} className="font-mono text-xs underline">
                        {line.request.number}
                      </Link>
                      <span className="text-xs text-muted-foreground"> · línea {line.requestPosition}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(line.quantity)} {line.unitAbbr}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUnitCost(line.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{isVatRateId(line.vatRateId) ? VAT_RATE_LABELS[line.vatRateId] : ''}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(line.netTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-1 text-sm tabular-nums">
            <dt className="text-muted-foreground">Subtotal neto</dt>
            <dd className="text-right">{formatMoney(order.totals.subtotal)}</dd>
            <dt className="text-muted-foreground">IVA</dt>
            <dd className="text-right">{formatMoney(order.totals.vatTotal)}</dd>
            <dt className="font-medium">Total</dt>
            <dd className="text-right font-medium">{formatMoney(order.totals.total)}</dd>
          </dl>
        </CardContent>
      </Card>

      <HistoryCard history={order.history} />
    </div>
  );
}
