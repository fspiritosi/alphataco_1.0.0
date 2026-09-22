'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { DailyReportDetailRow } from '../types';
import { getActionsColumn, getStatusColumns } from './status-columns';
import { getEmployeeColumns } from './employee-columns';
import { getResourceColumns } from './resource-columns';
import type { DeviationGetters, Permissions, RowActionHandlers } from './types';

export type { DeviationGetters, Permissions, RowActionHandlers } from './types';

// ============================================================================
// HIDDEN COLUMNS BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = ['start_time', 'end_time'];

// ============================================================================
// COLUMNS DEFINITION
//
// Dividido por grupo de columnas (era un único archivo de 1075 líneas):
// - resource-columns.tsx: selección + identidad del servicio (cliente/servicio/
//   ítem/sector/área/tipo de servicio) + equipo del cliente
// - employee-columns.tsx: roles de empleados (choferes/ayudantes) + empleados +
//   equipos asignados
// - status-columns.tsx: jornada/horarios/estado/descripción/remito/completados
//   + columna de acciones
// - badge-cells.tsx: celdas con badge + tooltip de desviaciones (compartidas
//   entre employee-columns y resource-columns)
// - row-actions-cell.tsx: botones de acción de la columna "actions"
// - helpers.ts: funciones puras (buildEmployeeLabel, buildRowDescription)
// - types.ts: tipos compartidos (Permissions, RowActionHandlers, DeviationGetters)
// ============================================================================

export function getColumns(
  permissions: Permissions,
  handlers: RowActionHandlers,
  reportDate: string,
  deviations: DeviationGetters
): ColumnDef<DailyReportDetailRow>[] {
  return [
    ...getResourceColumns(),
    ...getEmployeeColumns(deviations),
    ...getStatusColumns(),
    getActionsColumn(permissions, handlers, reportDate),
  ];
}
