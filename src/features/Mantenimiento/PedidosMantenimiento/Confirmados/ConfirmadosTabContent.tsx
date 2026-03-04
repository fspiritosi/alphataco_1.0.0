import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { ConfirmedOrderList } from './ConfirmedOrderList';

/**
 * Subtab de Pedidos Confirmados
 *
 * Muestra los pedidos de mantenimiento con fecha confirmada (date_confirmed)
 * Listos para aprobar entrada a taller
 *
 * Ordenamiento: de más viejo a más reciente
 */

interface ConfirmadosTabContentProps {
  searchParams?: DataTableSearchParams;
}

export async function ConfirmadosTabContent({ searchParams = {} }: ConfirmadosTabContentProps) {
  return <ConfirmedOrderList searchParams={searchParams} />;
}
