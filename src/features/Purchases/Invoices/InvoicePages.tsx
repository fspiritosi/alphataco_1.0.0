import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SupplierInvoiceDetail, SupplierInvoiceFormData } from '../actions/invoices.server';
import type { SupplierInvoiceFormValues } from '../schemas/invoices';
import { SupplierInvoiceDetailView } from './components/SupplierInvoiceDetailView';
import { SupplierInvoiceForm } from './components/SupplierInvoiceForm';

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

const LIST = { href: '/dashboard/purchases?tab=facturas', label: 'Facturas' };

export function NewSupplierInvoicePage({ data }: { data: SupplierInvoiceFormData }) {
  return (
    <Shell title="Cargar comprobante" back={LIST}>
      <SupplierInvoiceForm mode={{ kind: 'create' }} initialData={data} />
    </Shell>
  );
}

export function EditSupplierInvoicePage({
  invoiceId,
  label,
  values,
  data,
}: {
  invoiceId: string;
  label: string;
  values: SupplierInvoiceFormValues;
  data: SupplierInvoiceFormData;
}) {
  return (
    <Shell title={`Editar ${label}`} back={{ href: `/dashboard/purchases/invoices/${invoiceId}`, label }}>
      <SupplierInvoiceForm
        mode={{ kind: 'edit', invoiceId, label }}
        initialValues={values}
        initialData={data}
        initialSupplierLabel={data.supplier?.name ?? null}
      />
    </Shell>
  );
}

export function SupplierInvoicePage({ invoice }: { invoice: SupplierInvoiceDetail }) {
  return (
    <Shell back={LIST}>
      <SupplierInvoiceDetailView invoice={invoice} />
    </Shell>
  );
}
