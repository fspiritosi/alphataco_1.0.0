import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import { ForWorkshopList } from './ForWorkshopList';

interface ParaTallerTabContentProps {
  searchParams?: DataTableSearchParams;
}

/**
 * Subtab "Para Taller" en Operaciones
 *
 * Muestra los pedidos de mantenimiento con fecha confirmada (date_confirmed)
 * Listos para aprobar entrada a taller (cambiar a in_workshop)
 */
export async function ParaTallerTabContent({ searchParams = {} }: ParaTallerTabContentProps) {
  return <ForWorkshopList searchParams={searchParams} />;
}
