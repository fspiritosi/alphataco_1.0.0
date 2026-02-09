import { Suspense } from 'react';
import { StatusCardServer, type Status } from './StatusCardServer';
import { StatusCardSkeleton } from './StatusCardSkeleton';
import { StatusCardWrapper, StatusCardsContainer } from './StatusCardsWrapper';

interface StatusCardsServerContainerProps {
  onStatusClick: (status: Status | null) => void;
  selectedStatus: Status | null;
}

const statusConfig: Record<Status, { label: string; color: string }> = {
  pendiente: { label: 'Pendientes', color: 'text-black dark:text-white' },
  reprogramado: { label: 'Reprogramados', color: 'text-yellow-600' },
  confirmado: { label: 'Confirmados', color: 'text-green-600' },
  cancelado: { label: 'Cancelados', color: 'text-red-600' },
  rechazado: { label: 'Rechazados', color: 'text-red-600' },
  vencido: { label: 'Vencidos', color: 'text-red-600' },
};

/**
 * Contenedor que coordina las StatusCards del servidor con el estado del cliente
 * Cada card se carga independientemente con su propio Suspense
 */
export function StatusCardsServerContainer({ onStatusClick, selectedStatus }: StatusCardsServerContainerProps) {
  return (
    <StatusCardsContainer>
      {/* Total Card */}
      <StatusCardWrapper status={null} onStatusClick={onStatusClick} selectedStatus={selectedStatus}>
        <Suspense fallback={<StatusCardSkeleton />}>
          <StatusCardServer status={null} label="Todos" color={selectedStatus === null ? 'text-primary' : undefined} />
        </Suspense>
      </StatusCardWrapper>

      {/* Status Cards */}
      {(Object.keys(statusConfig) as Status[]).map((status) => {
        const { label, color } = statusConfig[status];
        const isSelected = selectedStatus === status;

        return (
          <StatusCardWrapper key={status} status={status} onStatusClick={onStatusClick} selectedStatus={selectedStatus}>
            <Suspense fallback={<StatusCardSkeleton />}>
              <StatusCardServer status={status} label={label} color={isSelected ? 'text-primary' : color} />
            </Suspense>
          </StatusCardWrapper>
        );
      })}
    </StatusCardsContainer>
  );
}
