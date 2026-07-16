import { Suspense } from 'react';
import { StatusCardServer, type Status } from './StatusCardServer';
import { StatusCardSkeleton } from './StatusCardSkeleton';
import { StatusCardWrapper, StatusCardsContainer } from './StatusCardsWrapper';

const statusConfig: Record<Status, { label: string; color: string }> = {
  pendiente: { label: 'Pendientes', color: 'text-black dark:text-white' },
  reprogramado: { label: 'Reprogramados', color: 'text-yellow-600' },
  confirmado: { label: 'Confirmados', color: 'text-green-600' },
  cancelado: { label: 'Cancelados', color: 'text-red-600' },
  rechazado: { label: 'Rechazados', color: 'text-red-600' },
  vencido: { label: 'Vencidos', color: 'text-red-600' },
};

/**
 * Server Component que renderiza las StatusCards con COUNT queries
 * El estado y clicks se sincronizan con el filtro namespaced de la tabla.
 * Cada card se carga independientemente con su propio Suspense
 */
export function StatusCardsServerContainer() {
  return (
    <StatusCardsContainer>
      {/* Total Card */}
      <StatusCardWrapper status={null}>
        <Suspense fallback={<StatusCardSkeleton />}>
          <StatusCardServer status={null} label="Todos" />
        </Suspense>
      </StatusCardWrapper>

      {/* Status Cards */}
      {(Object.keys(statusConfig) as Status[]).map((status) => {
        const { label, color } = statusConfig[status];

        return (
          <StatusCardWrapper key={status} status={status}>
            <Suspense fallback={<StatusCardSkeleton />}>
              <StatusCardServer status={status} label={label} color={color} />
            </Suspense>
          </StatusCardWrapper>
        );
      })}
    </StatusCardsContainer>
  );
}
