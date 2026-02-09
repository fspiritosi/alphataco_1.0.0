'use client';

import { cn } from '@/lib/utils';
import type { Status } from './StatusCardServer';
import { useStatusFilter } from './StatusCardsClientWrapper';

interface StatusCardsWrapperProps {
  children: React.ReactNode;
  status: Status | null; // El estado que representa esta card
}

/**
 * Client Component que envuelve cada StatusCard para manejar clicks y estilos
 * Usa contexto para comunicarse con PreparteTable
 */
export function StatusCardWrapper({ children, status }: StatusCardsWrapperProps) {
  const { statusFilter, setStatusFilter } = useStatusFilter();
  const isSelected = statusFilter === status;

  return (
    <div
      data-testid={`status-card-${status || 'todos'}`}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md flex-1 min-w-0',
        isSelected ? 'border-2 border-primary rounded-lg' : 'focus:border-2 focus:border-primary focus:rounded-lg'
      )}
      onClick={() => setStatusFilter(status)}
    >
      {children}
    </div>
  );
}

interface StatusCardsContainerProps {
  children: React.ReactNode;
}

/**
 * Contenedor para las cards de estado
 */
export function StatusCardsContainer({ children }: StatusCardsContainerProps) {
  return (
    <div className="flex w-full overflow-x-auto pb-2 mb-6">
      <div className="flex flex-nowrap gap-2 min-w-max w-full">{children}</div>
    </div>
  );
}
