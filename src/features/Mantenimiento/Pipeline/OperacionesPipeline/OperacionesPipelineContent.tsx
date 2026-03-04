import { Suspense } from 'react';
import { PipelineLayout, type PipelineStepEntry } from '../components/PipelineLayout';
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

  // Determinar paso inicial desde la URL o usar el default
  const rawStep = searchParams[PARAM_NAME];
  const initialStep =
    typeof rawStep === 'string' && OPERACIONES_STEPS.some((s) => s.id === rawStep)
      ? rawStep
      : DEFAULT_STEP;

  // Todos los pasos se renderizan simultáneamente (show/hide con CSS)
  const stepContents: PipelineStepEntry[] = [
    {
      id: 'validate',
      content: (
        <Suspense fallback={<SolicitudesTableSkeleton />}>
          <SolicitudesMantenimientoTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
    {
      id: 'approve_date',
      content: (
        <Suspense fallback={<PendientesEjecutarSkeleton />}>
          <PendientesEjecutarTabContent />
        </Suspense>
      ),
    },
    {
      id: 'for_workshop',
      content: (
        <Suspense fallback={<OperacionesTableSkeleton />}>
          <ParaTallerTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
    {
      id: 'in_workshop',
      content: (
        <Suspense fallback={<WorkshopTrackingSkeleton />}>
          <WorkshopTrackingTabContent searchParams={searchParams} />
        </Suspense>
      ),
    },
  ];

  return (
    <PipelineLayout
      steps={OPERACIONES_STEPS}
      counts={counts}
      initialStep={initialStep}
      paramName={PARAM_NAME}
      stepContents={stepContents}
    />
  );
}
