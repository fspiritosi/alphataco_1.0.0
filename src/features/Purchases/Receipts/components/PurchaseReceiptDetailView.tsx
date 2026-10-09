import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatQuantity } from '@/features/Warehouses/lib/format';
import { Paperclip, TriangleAlert } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import type { PurchaseReceiptDetail } from '../../actions/receipts.server';
import { HistoryCard } from '../../components/HistoryCard';
import { PurchaseOrderStatusBadge } from '../../Orders/components/PurchaseOrderStatusBadge';
import { PurchaseReceiptActions } from './PurchaseReceiptActions';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** Detalle de la recepcion: OC, deposito, remito, lineas, movimientos de stock y OC complementaria. */
export function PurchaseReceiptDetailView({ receipt }: { receipt: PurchaseReceiptDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{receipt.number}</h1>
        {receipt.cancelled ? <Badge variant="destructive">Anulada</Badge> : <Badge className="bg-green-600 text-white hover:bg-green-600/90">Vigente</Badge>}
        <div className="ml-auto">
          <PurchaseReceiptActions receipt={receipt} />
        </div>
      </div>

      {receipt.excessWithoutOrder && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Excedente sin OC</AlertTitle>
          <AlertDescription>
            La OC complementaria del excedente se anuló: lo recibido de más sigue en el depósito sin orden que lo respalde. Resolvelo con una
            devolución o un ajuste en Almacenes.
          </AlertDescription>
        </Alert>
      )}
      {receipt.cancelled && receipt.cancelReason && (
        <Alert variant="destructive">
          <AlertTitle>Anulada</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{receipt.cancelReason}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Orden de compra">
              <Link href={`/dashboard/purchases/orders/${receipt.order.id}`} className="font-mono underline">
                {receipt.order.number}
              </Link>
            </Field>
            <Field label="Proveedor">
              <Link href={`/dashboard/purchases/suppliers/${receipt.supplier.id}`} className="hover:underline">
                {receipt.supplier.name}
              </Link>
            </Field>
            <Field label="Fecha de recepción">{moment(receipt.receivedOn, 'YYYY-MM-DD').format('DD/MM/YYYY')}</Field>
            <Field label="Remito">
              {receipt.deliveryNote ?? '—'}
              {receipt.attachment && (
                <a href={receipt.attachment.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline">
                  <Paperclip className="h-3.5 w-3.5" />
                  {receipt.attachment.name}
                </a>
              )}
            </Field>
            <Field label="Depósito">{receipt.warehouse?.name ?? 'Sin depósito (solo servicios)'}</Field>
            <Field label="Entrada a Almacenes">
              {receipt.movement ? (
                <Link href={`/dashboard/warehouse/movements/${receipt.movement.id}`} className="font-mono underline">
                  {receipt.movement.number}
                </Link>
              ) : (
                '—'
              )}
              {receipt.reversal && (
                <span className="text-muted-foreground">
                  {' '}
                  · anulada por{' '}
                  <Link href={`/dashboard/warehouse/movements/${receipt.reversal.id}`} className="font-mono underline">
                    {receipt.reversal.number}
                  </Link>
                </span>
              )}
            </Field>
            {receipt.complements.length > 0 && (
              <Field label="OC complementaria (excedente)">
                <span className="flex flex-wrap items-center gap-2">
                  {receipt.complements.map((c) => (
                    <span key={c.id} className="flex items-center gap-1">
                      <Link href={`/dashboard/purchases/orders/${c.id}`} className="font-mono underline">
                        {c.number}
                      </Link>
                      <PurchaseOrderStatusBadge status={c.status} />
                    </span>
                  ))}
                </span>
              </Field>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qué llegó</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Solicitud</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Lote o series</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {line.itemLabel}
                      {line.isExcess && <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">excedente</span>}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/purchases/requests/${line.request.id}`} className="font-mono text-xs underline">
                        {line.request.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(line.quantity)} {line.unitAbbr}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {line.batchNumber
                        ? `Lote ${line.batchNumber}${line.batchExpiresOn ? ` · vence ${moment(line.batchExpiresOn, 'YYYY-MM-DD').format('DD/MM/YYYY')}` : ''}`
                        : line.serialNumbers.length > 0
                          ? line.serialNumbers.join(', ')
                          : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <HistoryCard history={receipt.history} />
    </div>
  );
}
