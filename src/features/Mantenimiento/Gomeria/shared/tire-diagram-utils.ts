// Shared tire diagram types and utilities — usable from both client and server

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DiagramAxle {
  id: string;
  axle_number: number;
  tires_per_side: number; // 1 (single) or 2 (dual)
  tire_size: string;
  is_drive_axle: boolean;
  is_spare: boolean;
}

export interface DiagramPosition {
  position_number: number;
  axle_number: number;
  side: 'LEFT' | 'RIGHT' | 'SPARE';
  tire_id: string | null;
  tire_serial?: string;
  tire_brand?: string;
  tire_size?: string;
}

export interface ComputedPosition {
  position_number: number;
  axle_number: number;
  side: 'LEFT' | 'RIGHT' | 'SPARE';
  /** For dual axles: 'INNER' | 'OUTER', for single/spare: undefined */
  dual_role?: 'INNER' | 'OUTER';
}

// ─── Position Calculation ──────────────────────────────────────────────────

/**
 * Given an array of axles, compute sequential positions.
 *
 * Regular axles (is_spare = false), sorted by axle_number:
 *   - tires_per_side = 1 → 2 positions: LEFT, RIGHT
 *   - tires_per_side = 2 → 4 positions: LEFT-OUTER, LEFT-INNER, RIGHT-INNER, RIGHT-OUTER
 *
 * Spare axles (is_spare = true), sorted by axle_number:
 *   - 1 position: SPARE
 */
export function calculatePositions(axles: DiagramAxle[]): ComputedPosition[] {
  const sorted = [...axles].sort((a, b) => a.axle_number - b.axle_number);
  const regularAxles = sorted.filter((a) => !a.is_spare);
  const spareAxles = sorted.filter((a) => a.is_spare);

  const positions: ComputedPosition[] = [];
  let counter = 1;

  for (const axle of regularAxles) {
    if (axle.tires_per_side === 1) {
      positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'LEFT' });
      positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'RIGHT' });
    } else {
      positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'LEFT', dual_role: 'OUTER' });
      positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'LEFT', dual_role: 'INNER' });
      positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'RIGHT', dual_role: 'INNER' });
      positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'RIGHT', dual_role: 'OUTER' });
    }
  }

  for (const axle of spareAxles) {
    positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'SPARE' });
  }

  return positions;
}
