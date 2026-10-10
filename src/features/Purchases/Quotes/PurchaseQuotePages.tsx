import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { OrderableRequestLineOption } from '../actions/orders.server';
import type { PurchaseQuoteDetail } from '../actions/quotes.server';
import { PurchaseQuoteDetailView } from './components/PurchaseQuoteDetailView';
import { PurchaseQuoteForm } from './components/PurchaseQuoteForm';

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

const BACK_TO_LIST = { href: '/dashboard/purchases?tab=cotizaciones', label: 'Cotizaciones' };

export function NewPurchaseQuotePage() {
  return (
    <Shell title="Nuevo pedido de cotización" back={BACK_TO_LIST}>
      <PurchaseQuoteForm
        mode={{ kind: 'create' }}
        defaultValues={{ supplierId: '', requestLineIds: [], notes: '' }}
        initialSupplierLabel={null}
        initialLines={{}}
      />
    </Shell>
  );
}

export function EditPurchaseQuotePage({ quote }: { quote: PurchaseQuoteDetail }) {
  // Las lineas del borrador, con la cantidad pedida como referencia (el servidor recalcula lo que falta).
  const lines: Record<string, OrderableRequestLineOption> = Object.fromEntries(
    quote.lines.map((line) => [
      line.requestLineId,
      {
        requestLineId: line.requestLineId,
        requestId: line.request.id,
        requestNumber: line.request.number,
        position: line.requestPosition,
        itemLabel: line.itemLabel,
        unitAbbr: line.unitAbbr,
        requested: line.quantity,
        remaining: line.quantity,
        suggestedSupplierId: null,
      },
    ])
  );
  return (
    <Shell title={`Editar ${quote.number}`} back={{ href: `/dashboard/purchases/quotes/${quote.id}`, label: quote.number }}>
      <PurchaseQuoteForm
        mode={{ kind: 'edit', quoteId: quote.id, number: quote.number }}
        defaultValues={quote.form}
        initialSupplierLabel={quote.supplier.name}
        initialLines={lines}
      />
    </Shell>
  );
}

export function PurchaseQuotePage({ quote }: { quote: PurchaseQuoteDetail }) {
  return (
    <Shell back={BACK_TO_LIST}>
      <PurchaseQuoteDetailView quote={quote} />
    </Shell>
  );
}
