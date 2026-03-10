import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getCompanyDocsPaginated } from '../actions.server';
import _CompanyDocsMensualesDataTable from './_CompanyDocsMensualesDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const MENSUALES_TABLE_ID = 'company-docs-mensuales';

// ============================================================================
// SERVER COMPONENT
// ============================================================================

interface Props {
  searchParams: DataTableSearchParams;
}

export default async function CompanyDocsMensualesList({ searchParams }: Props) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, MENSUALES_TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getCompanyDocsPaginated(tableParams, true),
    getTablePreferences(MENSUALES_TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_CompanyDocsMensualesDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={MENSUALES_TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
