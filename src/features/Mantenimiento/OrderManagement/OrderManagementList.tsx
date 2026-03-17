import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { fetchAllTypesOfRepairs } from '@/features/Mantenimiento/TiposReparaciones/actions/actions';
import { DIAGNOSTICO_REPAIR_TYPE_ID } from '../utils/constants';
import {
  getActiveExternalWorkshops,
  getActiveWorkshopSectors,
} from './actions/actionsServer';
import { getOrderManagementPaginated } from './actions.server';
import { _OrderManagementDataTable } from './_OrderManagementDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'order-management';

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  searchParams: DataTableSearchParams;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function OrderManagementList({ searchParams }: Props) {
  const tableSearchParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  const [{ data, total }, preferences, sectorsData, repairTypesData, externalWorkshopsData] =
    await Promise.all([
      getOrderManagementPaginated(tableSearchParams),
      getTablePreferences(TABLE_ID),
      getActiveWorkshopSectors(),
      fetchAllTypesOfRepairs(),
      getActiveExternalWorkshops(),
    ]);

  const repairTypes = repairTypesData
    .filter((r) => r.id !== DIAGNOSTICO_REPAIR_TYPE_ID)
    .map((r) => ({ id: r.id, name: r.name }));

  return (
    <_OrderManagementDataTable
      data={data}
      totalRows={total}
      searchParams={tableSearchParams}
      tableId={TABLE_ID}
      sectors={sectorsData}
      repairTypes={repairTypes}
      externalWorkshops={externalWorkshopsData}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
