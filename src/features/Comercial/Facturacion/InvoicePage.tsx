import { getUserPermissionsMapServer } from '@/features/Permissions';
import { Lock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getInvoiceForEditor } from './actions/invoices.server';
import { InvoiceDetail } from './components/detail/InvoiceDetail';
import { InvoiceEditor } from './components/editor/InvoiceEditor';
import type { InvoicePermissions } from './components/editor/InvoiceDraftForm';
import { isEditable } from './lib/invoice-state-machine';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Un comprobante por request, aunque lo pidan `generateMetadata` y la página (`React.cache`).
 * Un id que no es UUID no llega a la base.
 */
export const loadInvoicePageData = cache(async (id: string) => (UUID_RE.test(id) ? getInvoiceForEditor(id) : null));

/** `document.title`: "Factura A 00003-00000124 · Facturación" o "Factura A · Borrador · Facturación". */
export async function invoicePageTitle(id: string): Promise<string> {
  const data = await loadInvoicePageData(id);
  if (!data) return 'Comprobante no encontrado · Facturación';
  const { invoice } = data;
  if (invoice.number === null) {
    return `${invoice.cbteLabel} · ${invoice.status === 'rechazada' ? 'Rechazada' : 'Borrador'} · Facturación`;
  }
  return `${invoice.cbteLabel} ${invoice.voucherNumber} · Facturación`;
}

/**
 * `/dashboard/comercial/facturacion/[id]`: un solo lugar por comprobante. Borrador o rechazado →
 * editor; enviado a ARCA (emitiendo, pendiente, autorizado) → detalle. Datos y permisos en paralelo.
 */
export async function InvoicePage({ id, result }: { id: string; result: string | null }) {
  const [data, permissionsMap] = await Promise.all([loadInvoicePageData(id), getUserPermissionsMapServer()]);
  if (!data) notFound();

  const can = (action: string) => permissionsMap[`comercial:facturacion:${action}`] === true;
  if (!can('view')) {
    return (
      <div className="flex items-start gap-3 py-8 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>No tenés permiso para ver comprobantes de Facturación.</p>
      </div>
    );
  }

  const permissions: InvoicePermissions = {
    canCreate: can('create'),
    canDelete: can('delete'),
    canApprove: can('approve'),
    canViewPrices: can('view_prices'),
  };

  if (isEditable(data.invoice.status)) {
    return <InvoiceEditor data={data} permissions={permissions} result={result} />;
  }
  return <InvoiceDetail data={data} permissions={permissions} result={result} />;
}
