import { Suspense } from 'react';

import { WorkflowPipeline } from '../components/WorkflowPipeline';
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
    label: 'Confirmados',
    description: 'Fecha confirmada por Operaciones. Registrá ingreso',
    iconName: 'CheckCircle',
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
  const activeStep =
    typeof rawStep === 'string' && TALLER_STEPS.some((s) => s.id === rawStep)
      ? rawStep
      : DEFAULT_STEP;

  return (
    <div className="space-y-6">
      {/* Chevrones del pipeline */}
      <WorkflowPipeline
        steps={TALLER_STEPS}
        counts={counts}
        activeStep={activeStep}
        paramName={PARAM_NAME}
        searchParams={searchParams}
      />

      {/* Contenido del paso activo */}
      <div>
        {activeStep === 'schedule' && (
          <Suspense fallback={<PendientesTableSkeleton />}>
            <PendientesTabContent />
          </Suspense>
        )}
        {activeStep === 'confirmed' && (
          <Suspense fallback={<PendientesTableSkeleton />}>
            <ConfirmadosTabContent />
          </Suspense>
        )}
        {activeStep === 'in_workshop' && (
          <Suspense fallback={<MaintenanceOrdersSkeleton />}>
            <MaintenanceOrdersTabContent />
          </Suspense>
        )}
        {activeStep === 'approvals' && (
          <Suspense fallback={<ApprovalInboxSkeleton />}>
            <ApprovalInboxTabContent />
          </Suspense>
        )}
      </div>
    </div>
  );
}
