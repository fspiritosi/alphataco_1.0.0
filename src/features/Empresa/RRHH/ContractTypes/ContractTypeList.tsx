import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _ContractTypeDataTable from './_ContractTypeDataTable';
import { getContractTypesPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONTRACT_TYPE_TABLE_ID = 'contract-types';

// ============================================================================
// TYPES
// ============================================================================

interface ContractTypeListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function ContractTypeList({ searchParams, permissions }: ContractTypeListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, CONTRACT_TYPE_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  const [{ data, total }, preferences] = await Promise.all([
    getContractTypesPaginated(tableParams),
    getTablePreferences(CONTRACT_TYPE_TABLE_ID),
  ]);

  return (
    <_ContractTypeDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={CONTRACT_TYPE_TABLE_ID}
      permissionsMap={permissions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
