import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getCompanyDocsPaginated } from '../actions.server';
import _CompanyDocsPermanentesDataTable from './_CompanyDocsPermanentesDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PERMANENTES_TABLE_ID = 'company-docs-permanentes';

// ============================================================================
// SERVER COMPONENT
// ============================================================================

interface Props {
  searchParams: DataTableSearchParams;
}

export default async function CompanyDocsPermanentesList({ searchParams }: Props) {
  // Extraer solo los params de esta tabla (quitar prefijo del namespace)
  const tableParams = stripPrefixFromSearchParams(searchParams, PERMANENTES_TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getCompanyDocsPaginated(tableParams, false),
    getTablePreferences(PERMANENTES_TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_CompanyDocsPermanentesDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={PERMANENTES_TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
