import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _AptitudesDataTable from './_AptitudesDataTable';
import { getActiveCompanyPositions, getAptitudesTecnicasPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const APTITUDES_TABLE_ID = 'aptitudes-tecnicas';

// ============================================================================
// TYPES
// ============================================================================

interface AptitudesListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function AptitudesList({ searchParams, permissions }: AptitudesListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, APTITUDES_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  // Sí cargar puestos para el formulario (catálogo estático pequeño)
  const [{ data, total }, preferences, positions] = await Promise.all([
    getAptitudesTecnicasPaginated(tableParams),
    getTablePreferences(APTITUDES_TABLE_ID),
    getActiveCompanyPositions(),
  ]);

  return (
    <_AptitudesDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={APTITUDES_TABLE_ID}
      permissionsMap={permissions}
      positions={positions}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
