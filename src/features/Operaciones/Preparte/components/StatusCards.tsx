'use client';

import { cn } from '@/lib/utils';
import CardInfo from '@/shared/components/cards/CardInfo';
import { PreparteItem } from './PreparteManager';

export type Status = 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'confirmado' | 'vencido';

interface StatusCardsProps {
  data: PreparteItem[];
  onStatusClick: (status: Status | null) => void;
  selectedStatus: Status | null;
}

const statusConfig: Record<Status, { label: string; color: string }> = {
  pendiente: { label: 'Pendientes', color: 'text-black' },
  reprogramado: { label: 'Reprogramados', color: 'text-yellow-600' },
  confirmado: { label: 'Confirmados', color: 'text-green-600' },
  cancelado: { label: 'Cancelados', color: 'text-red-600' },
  rechazado: { label: 'Rechazados', color: 'text-red-600' },
  vencido: { label: 'Vencidos', color: 'text-red-600' },
};

export function StatusCards({ data, onStatusClick, selectedStatus }: StatusCardsProps) {
  const statusCounts = data.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<Status, number>
  );

  const total = data.length;

  return (
    <div className="flex w-full overflow-x-auto pb-2 mb-6">
      <div className="flex flex-nowrap gap-2 min-w-max w-full">
        {/* Total Card */}
        <div
          className={cn(
            'cursor-pointer transition-all hover:shadow-md flex-1 min-w-0',
            !selectedStatus ? 'ring-2 ring-primary rounded-lg' : ''
          )}
          onClick={() => onStatusClick(null)}
        >
          <CardInfo title="Todos" value={total} valueClassname={!selectedStatus ? 'text-primary' : ''} />
        </div>

        {Object.entries(statusConfig).map(([status, { label, color }]) => {
          const count = statusCounts[status as Status] || 0;
          const isSelected = selectedStatus === status;

          return (
            <div
              key={status}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md flex-1 min-w-0',
                isSelected ? 'ring-2 ring-primary rounded-lg' : ''
              )}
              onClick={() => onStatusClick(status as Status)}
            >
              <CardInfo title={label} value={count} valueClassname={isSelected ? 'text-primary' : color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
