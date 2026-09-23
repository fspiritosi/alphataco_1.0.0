'use client';

import { thresholdDotColor } from '@/features/Dashboard/lib/chart-thresholds';
import type { ReactElement } from 'react';

/** Props que recharts le pasa al render prop `dot` de un `<Line>`. */
interface RechartsDotProps {
  cx?: number;
  cy?: number;
  payload?: Record<string, unknown>;
}

/**
 * Render prop `dot` para las series del dashboard: punto rojo si el valor supera el
 * umbral esperado, verde si no. Reemplaza tres copias con `(props: any)`.
 */
export function makeThresholdDot(dataKey: string, threshold: number) {
  return function ThresholdDot(props: RechartsDotProps): ReactElement<SVGElement> {
    const { cx, cy, payload } = props;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={thresholdDotColor(payload?.[dataKey], threshold)}
        stroke="white"
        strokeWidth={2}
      />
    );
  };
}
