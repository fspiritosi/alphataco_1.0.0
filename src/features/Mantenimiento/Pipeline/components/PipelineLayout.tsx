'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { WorkflowPipelineChevrons } from './WorkflowPipelineChevrons';
import type { PipelineStep, PipelineCounts } from '../types';

/**
 * Prefijos de parámetros de URL relacionados con tablas paginadas.
 * Al cambiar de paso se eliminan para evitar estado obsoleto entre pasos.
 */
const TABLE_PARAM_PREFIXES = [
  'page',
  'pageSize',
  'sort',
  'filter',
  'search',
  'col',
  'visibility',
];

function hasTablePrefix(key: string): boolean {
  return TABLE_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export interface PipelineStepEntry {
  id: string;
  content: ReactNode;
}

interface PipelineLayoutProps {
  steps: PipelineStep[];
  counts: PipelineCounts;
  initialStep: string;
  paramName: string;
  stepContents: PipelineStepEntry[];
}

/**
 * Client component que gestiona la navegación del pipeline.
 *
 * Patrón idéntico a TabsManagerClient:
 * - Paso inicial leído del servidor (searchParams)
 * - Estado local (useState) para cambios instantáneos
 * - replaceState para actualizar la URL sin navegación Next.js
 * - TODOS los pasos se renderizan simultáneamente, show/hide con CSS
 */
export function PipelineLayout({
  steps,
  counts,
  initialStep,
  paramName,
  stepContents,
}: PipelineLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Leer la URL actual al montar (fuente de verdad), no el prop del servidor que puede
  // estar stale si el componente se desmontó/remontó por cambio de tab (Radix TabsContent).
  const [activeStep, setActiveStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlStep = new URLSearchParams(window.location.search).get(paramName);
      if (urlStep && steps.some((s) => s.id === urlStep)) return urlStep;
    }
    return initialStep;
  });

  // Sincronizar si searchParams cambia externamente (botón atrás/adelante del browser)
  useEffect(() => {
    const urlStep = searchParams.get(paramName);
    if (urlStep && urlStep !== activeStep && steps.some((s) => s.id === urlStep)) {
      setActiveStep(urlStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleStepClick = useCallback(
    (stepId: string) => {
      if (stepId === activeStep) return;

      // 1. Actualización instantánea de UI
      setActiveStep(stepId);

      // 2. Actualización silenciosa de URL (sin roundtrip al servidor)
      const params = new URLSearchParams(window.location.search);

      // Limpiar params de tablas del paso anterior
      for (const key of Array.from(params.keys())) {
        if (hasTablePrefix(key)) params.delete(key);
      }

      params.set(paramName, stepId);
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
    },
    [activeStep, paramName, pathname],
  );

  return (
    <div className="space-y-6">
      <WorkflowPipelineChevrons
        steps={steps}
        counts={counts}
        activeStep={activeStep}
        onStepClick={handleStepClick}
      />

      {stepContents.map(({ id, content }) => (
        <div key={id} className={activeStep === id ? undefined : 'hidden'}>
          {content}
        </div>
      ))}
    </div>
  );
}
