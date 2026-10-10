import { Button } from '@/components/ui/button';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { NoPermission } from '../fallback/NoPermission';
import { InvoicesList } from './InvoicesList/InvoicesList';
import { InvoicesTableSkeleton } from './InvoicesList/fallback/InvoicesTableSkeleton';

/** Facturas, notas de débito y de crédito de proveedores (spec Compras etapa 4 §4). */
export default async function InvoicesTabContent({
  searchParams,
  permissions,
}: {
  searchParams: DataTableSearchParams;
  permissions: Record<string, boolean>;
}) {
  if (permissions['compras:facturas:view'] !== true) return <NoPermission />;

  return (
    <div className="space-y-4">
      {permissions['compras:facturas:create'] === true && (
        <div className="flex justify-end">
          <Button asChild variant="brand" size="sm">
            <Link href="/dashboard/purchases/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Cargar comprobante
            </Link>
          </Button>
        </div>
      )}
      <Suspense fallback={<InvoicesTableSkeleton />}>
        <InvoicesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
