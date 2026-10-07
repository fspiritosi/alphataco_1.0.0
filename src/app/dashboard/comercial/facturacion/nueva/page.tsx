import { NewInvoicePage, type NewInvoiceOrigin } from '@/features/Comercial/Facturacion/NewInvoicePage';

export const metadata = { title: 'Nueva factura · Facturación' };

export default async function NewInvoiceRoute({ searchParams }: { searchParams: Promise<{ origen?: string }> }) {
  const { origen } = await searchParams;
  const origin: NewInvoiceOrigin = origen === 'certificaciones' || origen === 'manual' ? origen : null;
  return <NewInvoicePage origin={origin} />;
}
