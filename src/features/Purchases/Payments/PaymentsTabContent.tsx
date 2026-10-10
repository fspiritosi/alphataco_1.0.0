import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { NoPermission } from '../fallback/NoPermission';
import { DueInvoicesList } from './DueInvoicesList/DueInvoicesList';
import { DueInvoicesTableSkeleton } from './DueInvoicesList/fallback/DueInvoicesTableSkeleton';
import { PaymentOrdersList } from './PaymentOrdersList/PaymentOrdersList';
import { PaymentOrdersTableSkeleton } from './PaymentOrdersList/fallback/PaymentOrdersTableSkeleton';

/** Pagos (spec Compras etapa 5 §5): vencimientos de los comprobantes y ordenes de pago. */
export default async function PaymentsTabContent({
  searchParams,
  permissions,
}: {
  searchParams: DataTableSearchParams;
  permissions: Record<string, boolean>;
}) {
  if (permissions['compras:pagos:view'] !== true) return <NoPermission />;
  const canCreate = permissions['compras:pagos:create'] === true;

  return (
    <Tabs defaultValue="vencimientos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
          <TabsTrigger value="ordenes">Órdenes de pago</TabsTrigger>
        </TabsList>
        {canCreate && (
          <Button asChild variant="brand" size="sm">
            <Link href="/dashboard/purchases/payments/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva orden de pago
            </Link>
          </Button>
        )}
      </div>
      <TabsContent value="vencimientos">
        <Suspense fallback={<DueInvoicesTableSkeleton />}>
          <DueInvoicesList searchParams={searchParams} canCreate={canCreate} />
        </Suspense>
      </TabsContent>
      <TabsContent value="ordenes">
        <Suspense fallback={<PaymentOrdersTableSkeleton />}>
          <PaymentOrdersList searchParams={searchParams} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
