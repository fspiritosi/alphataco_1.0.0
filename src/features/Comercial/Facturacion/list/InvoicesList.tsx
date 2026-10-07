import { checkPermissionServer } from '@/features/Permissions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _InvoicesDataTable from './_InvoicesDataTable';
import { getInvoicesPaginated } from './actions.server';

const TABLE_ID = 'invoices';

export async function InvoicesList({ searchParams }: { searchParams: DataTableSearchParams }) {
  // Solo los params de esta tabla (quita el prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  // Facets lazy: no se cargan en SSR
  const [{ data, total }, preferences, canViewPrices] = await Promise.all([
    getInvoicesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
    checkPermissionServer('comercial', 'facturacion', 'view_prices'),
  ]);

  return (
    // Sin Card propia: FacturacionTabContent ya envuelve la tab en una Card (evita Card anidada).
    <div>
        <_InvoicesDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          canViewPrices={canViewPrices}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
    </div>
  );
}
