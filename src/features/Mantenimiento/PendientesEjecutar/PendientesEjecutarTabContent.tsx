import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { PendingExecutionList } from './PendingExecutionList';

interface PendientesEjecutarTabContentProps {
  searchParams?: DataTableSearchParams;
}

/**
 * Tab de Pendientes de Ejecutar
 *
 * Muestra los pedidos de mantenimiento que tienen fecha planificada:
 * - Pendientes de aprobación por parte de Operaciones (scheduled)
 * - Ya confirmados y listos para ejecución (date_confirmed)
 *
 * Desde aquí se puede:
 * - Ver detalle de cualquier pedido
 * - Aprobar la fecha (solo scheduled): El pedido pasa a 'date_confirmed'
 * - Rechazar la fecha (solo scheduled): El pedido vuelve a 'pending_scheduling'
 *
 * Estados que se muestran: 'scheduled', 'date_confirmed'
 * Ordenamiento: scheduled primero (pendientes), luego date_confirmed (confirmados)
 */
export async function PendientesEjecutarTabContent({
  searchParams = {},
}: PendientesEjecutarTabContentProps = {}) {
  return (
    <PendingExecutionList
      searchParams={searchParams}
    />
  );
}
