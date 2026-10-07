import { InvoicePage, invoicePageTitle } from '@/features/Comercial/Facturacion/InvoicePage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultado?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>) {
  const { id } = await params;
  return { title: await invoicePageTitle(id) };
}

export default async function InvoiceRoute({ params, searchParams }: Props) {
  const [{ id }, { resultado }] = await Promise.all([params, searchParams]);
  return <InvoicePage id={id} result={resultado ?? null} />;
}
