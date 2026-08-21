import { OrderManagementSkeleton } from './OrderManagementSkeleton';

/** Fallback del Suspense de la tab completa. */
export function SalaDeControlSkeleton() {
  return (
    <div className="space-y-3">
      <OrderManagementSkeleton />
    </div>
  );
}
