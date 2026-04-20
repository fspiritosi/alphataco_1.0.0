import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getRepairSolicitudesPaginated } from './actions.server';
import { _RepairSolicitudesDataTable } from './components/_RepairSolicitudesDataTable';

// ============================================================================
// CONSTANTS
// ============================================================================

export const TABLE_ID = 'repair-solicitudes';

// ============================================================================
// TYPES
// ============================================================================

interface RepairSolicitudesListProps {
  searchParams: Record<string, string | string[] | undefined>;
  /** Cuando true: muestra columna de acciones "Reparar equipo" (rol mecánico) */
  mechanic?: boolean;
  /** Cuando presente: filtra la tabla a un solo equipo (vista de detalle del equipo) */
  equipment_id?: string;
  /** Cuando true: usuario del módulo equipos con permiso update sobre created_solicitudes */
  canEdit?: boolean;
  /** Mapa de permisos del servidor para condicionar acciones */
  permissionsMap?: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function RepairSolicitudesList({
  searchParams,
  mechanic,
  equipment_id,
  canEdit,
  permissionsMap,
}: RepairSolicitudesListProps) {
  // Usar tableId diferenciado si hay filtro fijo de equipo (evita colisión de URL params)
  const tableId = equipment_id ? `repair-solicitudes-${equipment_id}` : TABLE_ID;

  // Extraer solo los params de esta tabla (quitar prefijo)
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

  const [{ data, total }, preferences] = await Promise.all([
    getRepairSolicitudesPaginated(tableParams, equipment_id),
    getTablePreferences(tableId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_RepairSolicitudesDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={tableId}
          mechanic={mechanic}
          equipment_id={equipment_id}
          canEdit={canEdit}
          permissionsMap={permissionsMap}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
