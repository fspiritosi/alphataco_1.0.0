'use client';

import { TireDiagramRenderer, type DiagramAxle } from '@/features/Mantenimiento/Gomeria/shared/TireDiagramRenderer';

// ============================================================================
// TYPES
// ============================================================================

interface TemplatePreviewProps {
  axles: DiagramAxle[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplatePreview({ axles }: TemplatePreviewProps) {
  if (axles.length === 0) {
    return <p className="text-muted-foreground text-sm italic">Configure los ejes para ver la vista previa</p>;
  }

  return <TireDiagramRenderer axles={axles} interactive={false} label="Vista previa" />;
}
