'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { useState } from 'react';

interface WorkOrderAccordionProps {
  workOrder: {
    id: string;
    orderNumber: string;
    status: string;
    sectorName: string | null;
    isExternal: boolean;
  };
  defaultOpen: boolean;
  children: React.ReactNode;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  paused: 'Pausada',
  completed: 'Completada',
  completed_partial: 'Completada parcialmente',
  cancelled: 'Cancelada',
};

export function WorkOrderAccordion({ workOrder, defaultOpen, children }: WorkOrderAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left bg-muted/40 hover:bg-muted/60 transition-colors'
        )}
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <GitBranch className="h-4 w-4 shrink-0" />
        <span className="font-mono text-sm font-medium truncate flex-1">{workOrder.orderNumber}</span>
        {workOrder.sectorName && (
          <Badge variant="secondary" className="text-xs">
            {workOrder.sectorName}
          </Badge>
        )}
        {workOrder.isExternal && (
          <Badge variant="outline" className="text-xs">
            Externo
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {statusLabels[workOrder.status] ?? workOrder.status}
        </Badge>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}
