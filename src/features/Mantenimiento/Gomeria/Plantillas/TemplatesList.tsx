import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getTemplatesPaginated } from './actions/actions.server';
import _TemplatesDataTable from './components/_TemplatesDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_ID = 'tire-templates';

// ============================================================================
// TYPES
// ============================================================================

interface TemplatesListProps {
  searchParams: Record<string, string | string[] | undefined>;
  companyId: string;
  permissionsMap: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function TemplatesList({ searchParams, companyId, permissionsMap }: TemplatesListProps) {
  // Extract only the params for this table (strip namespace prefix)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  // Facets are loaded lazy (on-demand when each popover opens) — not in SSR
  const [{ data, total }, preferences] = await Promise.all([
    getTemplatesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_TemplatesDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          companyId={companyId}
          tableId={TABLE_ID}
          permissionsMap={permissionsMap}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
