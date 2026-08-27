import { Suspense } from 'react';

import { PipelineLayout, type PipelineStepEntry } from '../components/PipelineLayout';
import type { PipelineStep } from '../types';
import { getTallerPipelineCounts } from './actions/pipeline-counts.server';

import { PendientesTabContent } from '@/features/Mantenimiento/PedidosMantenimiento/Pendientes/PendientesTabContent';
import { ConfirmadosTabContent } from '@/features/Mantenimiento/PedidosMantenimiento/Confirmados/ConfirmadosTabContent';
import { PendientesTableSkeleton } from '@/features/Mantenimiento/PedidosMantenimiento/fallback';
import { MaintenanceOrdersTabContent, MaintenanceOrdersSkeleton } from '@/features/Mantenimiento/MaintenanceOrders';
import { ApprovalInboxTabContent, ApprovalInboxSkeleton } from '@/features/Mantenimiento/ApprovalInbox';

const PARAM_NAME = 'taller_step';
const DEFAULT_STEP = 'schedule';

const TALLER_STEPS: PipelineStep[] = [
  {
    id: 'schedule',
    stepNumber: 1,
    label: 'Por Programar',
    description: 'Pedidos aprobados sin fecha. Asigná fecha y reparaciones',
    iconName: 'Clock',
  },
  {
    id: 'confirmed',
    stepNumber: 2,
    label: 'Por Ingresar',
    description: 'Pedidos con fecha asignada. Registrá el ingreso al taller',
    // Calendar (no CheckCircle): el paso está pendiente, y lo que lo define es
    // que ya tiene fecha. El tilde daba a entender que el trabajo estaba hecho.
    iconName: 'Calendar',
  },
  {
    id: 'in_workshop',
    stepNumber: 3,
    label: 'En Taller',
    description: 'Equipos activos en taller. Gestioná sectores y OTs',
    iconName: 'Warehouse',
  },
  {
    id: 'approvals',
    stepNumber: 4,
    label: 'Aprobaciones',
    description: 'Trabajos que requieren tu autorización',
    iconName: 'Inbox',
  },
];

interface TallerPipelineContentProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function TallerPipelineContent({ searchParams }: TallerPipelineContentProps) {
  const counts = await getTallerPipelineCounts();

  const rawStep = searchParams[PARAM_NAME];
  const initialStep =
    typeof rawStep === 'string' && TALLER_STEPS.some((s) => s.id === rawStep)
      ? rawStep
      : DEFAULT_STEP;

  // Todos los pasos se renderizan simultáneamente (show/hide con CSS)
  const stepContents: PipelineStepEntry[] = [
    {
      id: 'schedule',
      content: (
        <Suspense fallback={<PendientesTableSkeleton />}>
          <PendientesTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
    {
      id: 'confirmed',
      content: (
        <Suspense fallback={<PendientesTableSkeleton />}>
          <ConfirmadosTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
    {
      id: 'in_workshop',
      content: (
        <Suspense fallback={<MaintenanceOrdersSkeleton />}>
          <MaintenanceOrdersTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
    {
      id: 'approvals',
      content: (
        <Suspense fallback={<ApprovalInboxSkeleton />}>
          <ApprovalInboxTabContent />
        </Suspense>
      ),
    },
  ];

  return (
    <PipelineLayout
      steps={TALLER_STEPS}
      counts={counts}
      initialStep={initialStep}
      paramName={PARAM_NAME}
      stepContents={stepContents}
    />
  );
}
