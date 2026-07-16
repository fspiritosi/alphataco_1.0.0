'use client';

import { cn } from '@/lib/utils';
import { DATA_TABLE_URL_CHANGE_EVENT } from '@/shared/components/common/DataTable/useDataTable';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Status } from './StatusCardServer';

const STATUS_PARAM = 'preparte-table__status';
const PAGE_PARAM = 'preparte-table__page';

interface StatusCardsWrapperProps {
  children: React.ReactNode;
  status: Status | null; // El estado que representa esta card
}

/**
 * Client Component que envuelve cada StatusCard para manejar clicks y estilos
 * Usa contexto para comunicarse con PreparteTable
 */
export function StatusCardWrapper({ children, status }: StatusCardsWrapperProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(
    () => searchParams.get(STATUS_PARAM) as Status | null
  );
  const isSelected = selectedStatus === status;

  useEffect(() => {
    const syncSelectedStatus = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedStatus(params.get(STATUS_PARAM) as Status | null);
    };
    window.addEventListener(DATA_TABLE_URL_CHANGE_EVENT, syncSelectedStatus);
    window.addEventListener('popstate', syncSelectedStatus);
    return () => {
      window.removeEventListener(DATA_TABLE_URL_CHANGE_EVENT, syncSelectedStatus);
      window.removeEventListener('popstate', syncSelectedStatus);
    };
  }, []);

  const handleClick = () => {
    const params = new URLSearchParams(window.location.search);
    if (status) params.set(STATUS_PARAM, status);
    else params.delete(STATUS_PARAM);
    params.delete(PAGE_PARAM);
    const queryString = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      queryString ? `${pathname}?${queryString}` : pathname
    );
    window.dispatchEvent(new Event(DATA_TABLE_URL_CHANGE_EVENT));
  };

  return (
    <div
      data-testid={`status-card-${status || 'todos'}`}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md flex-1 min-w-0',
        isSelected ? 'border-2 border-primary rounded-lg' : 'focus:border-2 focus:border-primary focus:rounded-lg'
      )}
      onClick={handleClick}
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
