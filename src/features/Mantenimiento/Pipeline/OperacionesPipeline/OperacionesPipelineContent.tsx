import { Suspense } from 'react';
import { PipelineLayout, type PipelineStepEntry } from '../components/PipelineLayout';
import type { PipelineStep } from '../types';
import { getOperacionesPipelineCounts } from './actions/pipeline-counts.server';

// TabContent components existentes
import { SolicitudesMantenimientoTabContent } from '@/features/Mantenimiento/SolicitudesMantenimiento';
import { SolicitudesTableSkeleton } from '@/features/Mantenimiento/SolicitudesMantenimiento/fallback';
import { WorkshopTrackingSkeleton, WorkshopTrackingTabContent } from '@/features/Mantenimiento/WorkshopTracking';

const PARAM_NAME = 'op_step';
const DEFAULT_STEP = 'validate';

/**
 * Pasos del pipeline de Operaciones.
 *
 * Los pasos "Aprobar Fecha" y "Para Taller" fueron eliminados del circuito:
 * la fecha que programa el taller es directamente la fecha de reparación
 * (ya no requiere aprobación de Operaciones), y la información que mostraba
 * "Para Taller" se migró a Seguimiento con el estado "Pendiente de ingreso a taller".
 */
const OPERACIONES_STEPS: PipelineStep[] = [
  {
    id: 'validate',
    stepNumber: 1,
    label: 'Validar Solicitud',
    description: 'Solicitudes nuevas pendientes de tu aprobación',
    iconName: 'ClipboardCheck',
  },
  {
    id: 'in_workshop',
    stepNumber: 2,
    label: 'Seguimiento',
    description: 'Equipos pendientes de ingreso y actualmente en taller',
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
    typeof rawStep === 'string' && OPERACIONES_STEPS.some((s) => s.id === rawStep) ? rawStep : DEFAULT_STEP;

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
