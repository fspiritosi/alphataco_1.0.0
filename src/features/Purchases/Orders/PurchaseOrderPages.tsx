import { Button } from '@/components/ui/button';
import { DEFAULT_VAT_RATE_ID } from '@/shared/lib/arca/catalogs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getSupplierPurchaseContext, searchOrderableRequestLines, type PurchaseOrderDetail } from '../actions/orders.server';
import { emptyPurchaseOrderLine, type PurchaseOrderFormValues } from '../schemas/orders';
import { PurchaseOrderDetailView } from './components/PurchaseOrderDetailView';
import { trimDecimals } from '../lib/quantity-format';
import { PurchaseOrderForm, type LineOptions } from './components/PurchaseOrderForm';

function Shell({ title, back, children }: { title?: string; back: { href: string; label: string }; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={back.href}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {back.label}
        </Link>
      </Button>
      {title && <h1 className="text-2xl font-semibold">{title}</h1>}
      {children}
    </div>
  );
}

const BACK_TO_LIST = { href: '/dashboard/purchases?tab=ordenes', label: 'Órdenes de compra' };

/** El proveedor sugerido mas repetido entre las lineas, para precargar la OC desde una solicitud. */
function mostSuggested(ids: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const id of ids) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Alta de una OC: en blanco, o con las lineas con faltante de una solicitud (`?fromRequest=`). */
export async function NewPurchaseOrderPage({ fromRequest }: { fromRequest?: string }) {
  const empty: PurchaseOrderFormValues = {
    supplierId: '',
    deliveryDate: '',
    deliveryPlace: '',
    paymentTermDays: '',
    notes: '',
    lines: [emptyPurchaseOrderLine()],
  };
  if (!fromRequest) {
    return (
      <Shell title="Nueva orden de compra" back={BACK_TO_LIST}>
        <PurchaseOrderForm mode={{ kind: 'create' }} defaultValues={empty} initialSupplierLabel={null} initialLineOptions={{}} />
      </Shell>
    );
  }

  const { items } = await searchOrderableRequestLines('', { requestId: fromRequest });
  const supplierId = mostSuggested(items.map((item) => item.suggestedSupplierId));
  const supplier = supplierId ? await getSupplierPurchaseContext(supplierId) : null;
  const usableSupplier = supplier?.isActive ? supplier : null;
  const defaultValues: PurchaseOrderFormValues = {
    ...empty,
    supplierId: usableSupplier?.id ?? '',
    lines:
      items.length > 0
        ? items.map((item) => ({
            requestLineId: item.requestLineId,
            quoteLineId: '',
            quantity: trimDecimals(item.remaining),
            unitPrice: '',
            vatRateId: DEFAULT_VAT_RATE_ID,
          }))
        : [emptyPurchaseOrderLine()],
  };
  const lineOptions: LineOptions = Object.fromEntries(items.map((item) => [item.requestLineId, item]));

  return (
    <Shell title="Nueva orden de compra" back={{ href: `/dashboard/purchases/requests/${fromRequest}`, label: 'Volver a la solicitud' }}>
      <PurchaseOrderForm
        mode={{ kind: 'create' }}
        defaultValues={defaultValues}
        initialSupplierLabel={usableSupplier?.name ?? null}
        initialLineOptions={lineOptions}
      />
    </Shell>
  );
}

export function EditPurchaseOrderPage({ order }: { order: PurchaseOrderDetail }) {
  const lineOptions: LineOptions = Object.fromEntries(order.lineOptions.map((option) => [option.requestLineId, option]));
  return (
    <Shell title={`Editar ${order.number}`} back={{ href: `/dashboard/purchases/orders/${order.id}`, label: order.number }}>
      <PurchaseOrderForm
        mode={{ kind: 'edit', orderId: order.id, number: order.number }}
        defaultValues={order.form}
        initialSupplierLabel={order.supplier.name}
        initialLineOptions={lineOptions}
      />
    </Shell>
  );
}

export function PurchaseOrderPage({ order }: { order: PurchaseOrderDetail }) {
  return (
    <Shell back={BACK_TO_LIST}>
      <PurchaseOrderDetailView order={order} />
    </Shell>
  );
}
