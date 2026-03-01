import { Suspense } from 'react';
import { WorkflowPipeline } from '../components/WorkflowPipeline';
import type { PipelineStep } from '../types';
import { getOperacionesPipelineCounts } from './actions/pipeline-counts.server';

// TabContent components existentes
import { SolicitudesMantenimientoTabContent } from '@/features/Mantenimiento/SolicitudesMantenimiento';
import { SolicitudesTableSkeleton } from '@/features/Mantenimiento/SolicitudesMantenimiento/fallback';
import { PendientesEjecutarTabContent, PendientesEjecutarSkeleton } from '@/features/Mantenimiento/PendientesEjecutar';
import { ParaTallerTabContent } from '@/features/Mantenimiento/Operaciones/ParaTaller/ParaTallerTabContent';
import { OperacionesTableSkeleton } from '@/features/Mantenimiento/Operaciones/fallback';
import { WorkshopTrackingTabContent, WorkshopTrackingSkeleton } from '@/features/Mantenimiento/WorkshopTracking';

const PARAM_NAME = 'op_step';
const DEFAULT_STEP = 'validate';

const OPERACIONES_STEPS: PipelineStep[] = [
  {
    id: 'validate',
    stepNumber: 1,
    label: 'Validar Solicitud',
    description: 'Solicitudes nuevas pendientes de tu aprobación',
    iconName: 'ClipboardCheck',
  },
  {
    id: 'approve_date',
    stepNumber: 2,
    label: 'Aprobar Fecha',
    description: 'Taller propuso una fecha. Aprobá o rechazá',
    iconName: 'Calendar',
  },
  {
    id: 'for_workshop',
    stepNumber: 3,
    label: 'Para Taller',
    description: 'Equipos con fecha confirmada, listos para taller',
    iconName: 'Warehouse',
  },
  {
    id: 'in_workshop',
    stepNumber: 4,
    label: 'Seguimiento',
    description: 'Equipos actualmente en taller',
    iconName: 'Eye',
  },
];

interface OperacionesPipelineContentProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function OperacionesPipelineContent({ searchParams }: OperacionesPipelineContentProps) {
  const counts = await getOperacionesPipelineCounts();

  // Determinar paso activo desde la URL o usar el default
  const rawStep = searchParams[PARAM_NAME];
  const activeStep =
    typeof rawStep === 'string' && OPERACIONES_STEPS.some((s) => s.id === rawStep)
      ? rawStep
      : DEFAULT_STEP;

  return (
    <div className="space-y-6">
      {/* Chevrons del pipeline */}
      <WorkflowPipeline
        steps={OPERACIONES_STEPS}
        counts={counts}
        activeStep={activeStep}
        paramName={PARAM_NAME}
        searchParams={searchParams}
      />

      {/* Contenido del paso activo */}
      <div>
        {activeStep === 'validate' && (
          <Suspense fallback={<SolicitudesTableSkeleton />}>
            <SolicitudesMantenimientoTabContent />
          </Suspense>
        )}
        {activeStep === 'approve_date' && (
          <Suspense fallback={<PendientesEjecutarSkeleton />}>
            <PendientesEjecutarTabContent />
          </Suspense>
        )}
        {activeStep === 'for_workshop' && (
          <Suspense fallback={<OperacionesTableSkeleton />}>
            <ParaTallerTabContent />
          </Suspense>
        )}
        {activeStep === 'in_workshop' && (
          <Suspense fallback={<WorkshopTrackingSkeleton />}>
            <WorkshopTrackingTabContent />
          </Suspense>
        )}
      </div>
    </div>
  );
}
