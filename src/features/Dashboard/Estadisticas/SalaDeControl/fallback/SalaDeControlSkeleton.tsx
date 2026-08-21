import { DesviosChartsSkeleton } from './DesviosChartsSkeleton';
import { OrderManagementSkeleton } from './OrderManagementSkeleton';

/** Fallback del Suspense de la tab completa: desvios + gestion de pedidos. */
export function SalaDeControlSkeleton() {
  return (
    <div className="space-y-3">
      <DesviosChartsSkeleton />
      <OrderManagementSkeleton />
    </div>
  );
}
