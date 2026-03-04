import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { PendingOrderList } from './PendingOrderList';

/**
 * Subtab de Pedidos Pendientes
 *
 * Muestra los pedidos de mantenimiento:
 * - pending_scheduling: Pendientes de planificar fecha
 * - scheduled: Pendientes de aprobación de fecha (ya planificados)
 *
 * Ordenamiento: pending_scheduling primero, luego scheduled, de más viejo a más reciente
 */

interface PendientesTabContentProps {
  searchParams?: DataTableSearchParams;
}

export async function PendientesTabContent({ searchParams = {} }: PendientesTabContentProps) {
  return <PendingOrderList searchParams={searchParams} />;
}
