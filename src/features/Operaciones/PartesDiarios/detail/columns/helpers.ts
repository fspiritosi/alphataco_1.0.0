import type { DailyReportDetailRow } from '../types';

// ============================================================================
// HELPERS — Employee label
// ============================================================================

export function buildEmployeeLabel(emp: {
  file?: string | null;
  lastname?: string | null;
  firstname?: string | null;
}): string {
  return `[${emp.file ?? '?'}] ${emp.lastname ?? ''} ${emp.firstname ?? ''}`.trim();
}

/** Contexto de la fila, para que el modal de recursos indique de qué línea se trata. */
export function buildRowDescription(row: DailyReportDetailRow): string {
  const parts = [row.customers?.name, row.customer_services?.service_name, row.service_items?.item_name].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length > 0 ? parts.join(' · ') : 'Recursos asignados a esta fila del parte diario.';
}
