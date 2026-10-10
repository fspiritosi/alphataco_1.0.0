import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney, formatQuantity } from '@/features/Warehouses/lib/format';
import { DESTINATION_TYPE_LABELS } from '@/features/Warehouses/lib/labels';
import moment from 'moment';
import Link from 'next/link';
import type { RequestQuoteComparison } from '../../actions/quotes.server';
import type { PurchaseRequestDetail } from '../../actions/requests.server';
import { HistoryCard } from '../../components/HistoryCard';
import { PurchaseOrderStatusBadge } from '../../Orders/components/PurchaseOrderStatusBadge';
import { QuoteComparison } from './QuoteComparison';
import { PurchaseRequestActions } from './PurchaseRequestActions';
import { PurchaseRequestStatusBadge } from './PurchaseRequestStatusBadge';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
/** Estados en los que se muestra el avance por linea (pedido en OC y falta). */
const WITH_PROGRESS = new Set(['APPROVED', 'PARTIALLY_ORDERED', 'ORDERED', 'CLOSED']);

/**
 * Detalle de la solicitud: cabecera, lineas (con lo pedido en OC y lo que falta), cotizaciones,
 * ordenes de compra e historial, con las acciones que correspondan.
 */
export function PurchaseRequestDetailView({
  request,
  comparison,
}: {
  request: PurchaseRequestDetail;
  comparison: RequestQuoteComparison | null;
}) {
  const showProgress = WITH_PROGRESS.has(request.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{request.number}</h1>
        <PurchaseRequestStatusBadge status={request.status} />
        <div className="ml-auto">
          <PurchaseRequestActions request={request} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Pedida por">{request.requester ?? '—'}</Field>
            <Field label={request.destinationType ? `Se imputa a (${DESTINATION_TYPE_LABELS[request.destinationType]})` : 'Se imputa a'}>
              {request.destinationType ? (request.destination ?? '—') : 'Para stock'}
            </Field>
            <Field label="Se necesita para">
              {request.neededBy ? moment(request.neededBy, 'YYYY-MM-DD').format('DD/MM/YYYY') : 'Sin fecha'}
            </Field>
            {request.materialRequest && (
              <Field label="Pedido de Almacenes">
                <Link href={`/dashboard/warehouse/requests/${request.materialRequest.id}`} className="font-mono underline">
                  {request.materialRequest.number}
                </Link>
              </Field>
            )}
            {request.notes && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Para qué se necesita">
                  <span className="whitespace-pre-wrap">{request.notes}</span>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Material o descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                {showProgress && <TableHead className="text-right">Pedido en OC</TableHead>}
                {showProgress && <TableHead className="text-right">Falta</TableHead>}
                <TableHead>Proveedor sugerido</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.lines.map((line, i) => (
                <TableRow key={line.id}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    {line.material ? (
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">{line.material.code}</span> {line.material.name}
                      </span>
                    ) : (
                      <span>{line.description}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(line.quantity)} {line.unit}
                  </TableCell>
                  {showProgress && (
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(line.ordered)} {line.unit}
                    </TableCell>
                  )}
                  {showProgress && (
                    <TableCell className="text-right tabular-nums">
                      {Number(line.remaining) > 0 ? `${formatQuantity(line.remaining)} ${line.unit}` : '—'}
                    </TableCell>
                  )}
                  <TableCell>
                    {line.suggestedSupplier ? (
                      <Link href={`/dashboard/purchases/suppliers/${line.suggestedSupplier.id}`} className="hover:underline">
                        {line.suggestedSupplier.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{line.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {comparison && showProgress && <QuoteComparison comparison={comparison} />}

      {request.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Órdenes de compra</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {request.orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <Link href={`/dashboard/purchases/orders/${order.id}`} className="font-mono underline">
                    {order.number}
                  </Link>
                  <PurchaseOrderStatusBadge status={order.status} />
                  <span>{order.supplierName}</span>
                  <span className="ml-auto tabular-nums">{formatMoney(order.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <HistoryCard history={request.history} />
    </div>
  );
}
