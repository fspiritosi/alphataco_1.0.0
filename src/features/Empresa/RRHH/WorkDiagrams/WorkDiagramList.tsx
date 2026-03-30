import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import _WorkDiagramDataTable from './_WorkDiagramDataTable';
import { getAllDiagramTypes, getWorkDiagramsPaginated } from './actions.server';

// ============================================================================
// CONSTANTS
// ============================================================================

export const WORK_DIAGRAM_TABLE_ID = 'work-diagrams';

// ============================================================================
// TYPES
// ============================================================================

interface WorkDiagramListProps {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function WorkDiagramList({ searchParams, permissions }: WorkDiagramListProps) {
  // Strip namespace prefix para aislar los params de esta tabla
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, WORK_DIAGRAM_TABLE_ID);

  // NO cargar facets en SSR — se cargan lazy (on-demand) en el cliente
  // diagram_types se carga aquí para poblar los selects del formulario
  const [{ data, total }, preferences, diagramTypes] = await Promise.all([
    getWorkDiagramsPaginated(tableParams),
    getTablePreferences(WORK_DIAGRAM_TABLE_ID),
    getAllDiagramTypes(),
  ]);

  return (
    <_WorkDiagramDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={WORK_DIAGRAM_TABLE_ID}
      permissionsMap={permissions}
      diagramTypes={diagramTypes}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
