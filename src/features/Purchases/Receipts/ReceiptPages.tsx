import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PurchaseReceiptDetail, ReceiptFormData } from '../actions/receipts.server';
import { PurchaseReceiptDetailView } from './components/PurchaseReceiptDetailView';
import { PurchaseReceiptForm } from './components/PurchaseReceiptForm';

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

export function NewPurchaseReceiptPage({ data }: { data: ReceiptFormData }) {
  const back = { href: `/dashboard/purchases/orders/${data.order.id}`, label: data.order.number };
  if (!data.order.canReceive) {
    return (
      <Shell title="Registrar recepción" back={back}>
        <Card>
          <CardContent className="pt-6 text-sm">
            La orden {data.order.number} no está enviada al proveedor ni recibida en parte: no se puede recibir.
          </CardContent>
        </Card>
      </Shell>
    );
  }
  return (
    <Shell title={`Registrar recepción de ${data.order.number}`} back={back}>
      <PurchaseReceiptForm data={data} />
    </Shell>
  );
}

export function PurchaseReceiptPage({ receipt }: { receipt: PurchaseReceiptDetail }) {
  return (
    <Shell back={{ href: '/dashboard/purchases?tab=recepciones', label: 'Recepciones' }}>
      <PurchaseReceiptDetailView receipt={receipt} />
    </Shell>
  );
}
