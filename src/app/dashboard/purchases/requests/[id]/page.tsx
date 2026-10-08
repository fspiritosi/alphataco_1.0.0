import { Button } from '@/components/ui/button';
import { getPurchaseRequestDetail } from '@/features/Purchases/actions/requests.server';
import { PurchaseRequestDetailView } from '@/features/Purchases/Requests/components/PurchaseRequestDetailView';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

// Una sola lectura para la pagina y el titulo.
const getRequest = cache(getPurchaseRequestDetail);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const request = await getRequest((await params).id);
  return { title: request ? `${request.number} | Compras` : 'Solicitud | Compras' };
}

export default async function PurchaseRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const request = await getRequest((await params).id);
  if (!request) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/purchases?tab=solicitudes">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Solicitudes
        </Link>
      </Button>
      <PurchaseRequestDetailView request={request} />
    </div>
  );
}
