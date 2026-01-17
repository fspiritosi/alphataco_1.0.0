'use client';

import { TabsManagerClient } from '@/features/TabsManager';
import { Clock, Eye } from 'lucide-react';
import { OperacionesPlanificadasTable } from './components/OperacionesPlanificadasTable';
import { OperacionesTable } from './components/OperacionesTable';

interface OperacionesTabContentProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  permissions?: Record<string, boolean>;
}

export function OperacionesTabContent({}: OperacionesTabContentProps) {
  const tabs = [
    {
      value: 'operations_pending',
      label: (
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pendientes de Ejecutar
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'operations_pending' as const,
      content: <OperacionesTable />,
    },
    {
      value: 'operations_planned',
      label: (
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Planificadas (Vista)
        </span>
      ),
      moduleSlug: 'mantenimiento' as const,
      tabSlug: 'operations_planned' as const,
      content: <OperacionesPlanificadasTable />,
    },
  ];

  return <TabsManagerClient paramName="operations_tab" tabs={tabs} defaultTab="operations_pending" />;
}
