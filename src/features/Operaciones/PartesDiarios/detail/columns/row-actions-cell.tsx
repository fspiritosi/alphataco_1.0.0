'use client';

import { UserCog } from 'lucide-react';
import moment from 'moment';
import type { DailyReportDetailRow } from '../types';
import type { Permissions, RowActionHandlers } from './types';

// ============================================================================
// ROW ACTIONS CELL
// ============================================================================

export function RowActionsCell({
  row,
  permissions,
  handlers,
  reportDate,
}: {
  row: DailyReportDetailRow;
  permissions: Permissions;
  handlers: RowActionHandlers;
  reportDate: string;
}) {
  const isToday = moment(reportDate).isSame(moment(), 'day');
  const isFutureDate = moment(reportDate).isAfter(moment(), 'day');
  // Editar: no permitir si ejecutado (salvo hoy) ni en_certificacion
  const canEdit = permissions.canUpdate && row.status !== 'en_certificacion' && (row.status !== 'ejecutado' || isToday);
  // Asignar recursos: misma elegibilidad que editar, pero gobernada por su propio permiso
  const canAssignResources =
    permissions.canAssignResources && row.status !== 'en_certificacion' && (row.status !== 'ejecutado' || isToday);
  // Eliminar: solo si fecha hoy, futura, o status sin_recursos_asignados
  const canDelete = permissions.canDelete && (isToday || isFutureDate || row.status === 'sin_recursos_asignados');

  return (
    <div className="flex items-center gap-1">
      {/* Ver detalle — siempre visible */}
      <button
        type="button"
        title="Ver detalle"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onViewDetail(row)}
      >
        <span className="sr-only">Ver detalle</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {/* Editar — solo si canUpdate Y (status no ejecutado O parte es hoy) */}
      {canEdit && (
        <button
          type="button"
          title="Editar"
          className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => handlers.onEdit(row)}
        >
          <span className="sr-only">Editar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Asignar recursos — solo con el permiso assign_resources (Supervisor de Operaciones) */}
      {canAssignResources && (
        <button
          type="button"
          title="Asignar recursos"
          className="rounded p-1 text-cyan-600 hover:bg-accent hover:text-cyan-700"
          onClick={() => handlers.onAssignResources(row)}
        >
          <span className="sr-only">Asignar recursos</span>
          <UserCog width={14} height={14} />
        </button>
      )}

      {/* Historial — siempre visible */}
      <button
        type="button"
        title="Historial"
        className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
        onClick={() => handlers.onHistory(row)}
      >
        <span className="sr-only">Historial</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* Eliminar — solo si canDelete (fecha hoy/futura o sin_recursos) */}
      {canDelete && (
        <button
          type="button"
          title="Eliminar"
          className="rounded p-1 hover:bg-accent text-red-500 hover:text-red-700"
          onClick={() => handlers.onDelete(row)}
        >
          <span className="sr-only">Eliminar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
