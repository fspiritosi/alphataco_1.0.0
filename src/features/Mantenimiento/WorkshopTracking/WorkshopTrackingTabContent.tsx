import { Suspense } from 'react';
import { WorkshopTrackingList } from './WorkshopTrackingList';
import { WorkshopTrackingSkeleton } from './fallback/WorkshopTrackingSkeleton';

interface WorkshopTrackingTabContentProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

/**
 * Tab de Seguimiento en Taller - Operaciones (solo lectura)
 *
 * Permite a Operaciones ver el estado actual de los equipos en taller
 * sin poder realizar acciones. Reutiliza el OrderDetailDialog en modo readOnly.
 */
export async function WorkshopTrackingTabContent({ searchParams = {} }: WorkshopTrackingTabContentProps) {
  return (
    <Suspense fallback={<WorkshopTrackingSkeleton />}>
      <WorkshopTrackingList searchParams={searchParams} />
    </Suspense>
  );
}
