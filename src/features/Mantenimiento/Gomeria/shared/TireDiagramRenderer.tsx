'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

export interface TireDiagramRendererProps {
  axles: DiagramAxle[];
  positions?: DiagramPosition[];
  interactive?: boolean;
  onPositionClick?: (positionNumber: number) => void;
  highlightedPositions?: number[];
  /** e.g. vehicle domain/plate */
  label?: string;
}

// ─── Position Calculation ──────────────────────────────────────────────────

export interface ComputedPosition {
  position_number: number;
  axle_number: number;
  side: 'LEFT' | 'RIGHT' | 'SPARE';
  /** For dual axles: 'INNER' | 'OUTER', for single/spare: undefined */
  dual_role?: 'INNER' | 'OUTER';
}

/**
 * Given an array of axles, compute sequential positions.
 *
 * Regular axles (is_spare = false), sorted by axle_number:
 *   - tires_per_side = 1 → 2 positions: LEFT, RIGHT
 *   - tires_per_side = 2 → 4 positions: LEFT-OUTER, LEFT-INNER, RIGHT-INNER, RIGHT-OUTER
 *     (outer tire is closer to the road edge, inner is closer to the axle center)
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
      // Dual: outer then inner on left, inner then outer on right
      positions.push({
        position_number: counter++,
        axle_number: axle.axle_number,
        side: 'LEFT',
        dual_role: 'OUTER',
      });
      positions.push({
        position_number: counter++,
        axle_number: axle.axle_number,
        side: 'LEFT',
        dual_role: 'INNER',
      });
      positions.push({
        position_number: counter++,
        axle_number: axle.axle_number,
        side: 'RIGHT',
        dual_role: 'INNER',
      });
      positions.push({
        position_number: counter++,
        axle_number: axle.axle_number,
        side: 'RIGHT',
        dual_role: 'OUTER',
      });
    }
  }

  for (const axle of spareAxles) {
    positions.push({ position_number: counter++, axle_number: axle.axle_number, side: 'SPARE' });
  }

  return positions;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

interface MergedPosition extends ComputedPosition {
  tire_id: string | null;
  tire_serial?: string;
  tire_brand?: string;
  tire_size?: string;
}

function mergePositions(computed: ComputedPosition[], positions: DiagramPosition[]): MergedPosition[] {
  const posMap = new Map<number, DiagramPosition>(positions.map((p) => [p.position_number, p]));

  return computed.map((cp) => {
    const data = posMap.get(cp.position_number);
    return {
      ...cp,
      tire_id: data?.tire_id ?? null,
      tire_serial: data?.tire_serial,
      tire_brand: data?.tire_brand,
      tire_size: data?.tire_size,
    };
  });
}

// ─── TireDrum ──────────────────────────────────────────────────────────────
// Renders a single tire as a 3D cylinder/drum (bird's-eye schematic view).
// Mimics the paper diagram: rounded cap on top and bottom with a body.

interface TireDrumProps {
  position: MergedPosition;
  interactive: boolean;
  highlighted: boolean;
  onClick?: () => void;
  /** Slightly narrower for dual axles */
  compact?: boolean;
  /** Circular shape for spare tires */
  circular?: boolean;
}

function TireDrum({ position, interactive, highlighted, onClick, compact = false, circular = false }: TireDrumProps) {
  const hasTire = position.tire_id !== null;

  const interactiveClass = interactive
    ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition-all'
    : '';

  const tooltipLines: string[] = [];
  if (position.tire_brand) tooltipLines.push(`Marca: ${position.tire_brand}`);
  if (position.tire_size) tooltipLines.push(`Medida: ${position.tire_size}`);
  if (position.tire_serial) tooltipLines.push(`Serie: ${position.tire_serial}`);

  // Colors for the drum
  const bodyBg = highlighted ? 'bg-amber-500' : hasTire ? 'bg-gray-600' : 'bg-white';
  const bodyBorder = highlighted ? 'border-amber-600' : hasTire ? 'border-gray-700' : 'border-gray-400 border-dashed';
  const capBg = highlighted ? 'bg-amber-400' : hasTire ? 'bg-gray-400' : 'bg-gray-100';
  const capBorder = highlighted ? 'border-amber-600' : hasTire ? 'border-gray-600' : 'border-gray-400';
  const textColor = highlighted ? 'text-white' : hasTire ? 'text-white' : 'text-gray-400';

  // Sizing
  const drumWidth = circular ? 'w-10' : compact ? 'w-7' : 'w-9';
  const drumBodyHeight = circular ? 'h-10' : 'h-10';
  const capHeight = circular ? 'h-2.5' : 'h-2.5';
  const fontSize = compact ? 'text-[9px]' : 'text-xs';

  if (circular) {
    // Spare: render as a circle
    const circleEl = (
      <div
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? onClick : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick?.();
              }
            : undefined
        }
        className={cn(
          'flex flex-col items-center justify-center rounded-full border-2 font-mono select-none w-12 h-12',
          bodyBorder,
          bodyBg,
          textColor,
          interactiveClass
        )}
      >
        <span className="font-bold text-sm leading-none">{position.position_number}</span>
      </div>
    );

    const serialLabel = position.tire_serial ? (
      <span className="text-[9px] leading-none text-muted-foreground mt-1 font-mono">
        {position.tire_serial.slice(-4)}
      </span>
    ) : null;

    const wrapped = (
      <div className="flex flex-col items-center">
        {circleEl}
        {serialLabel}
      </div>
    );

    if (tooltipLines.length === 0) return wrapped;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-0.5">
            <p className="font-semibold text-xs">Posición {position.position_number}</p>
            {tooltipLines.map((line) => (
              <p key={line} className="text-xs">
                {line}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Drum: 3 sections — top cap, body, bottom cap (simulates 3D cylinder)
  const drumEl = (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick?.();
            }
          : undefined
      }
      className={cn('flex flex-col items-center select-none', drumWidth, interactiveClass)}
    >
      {/* Top cap — rounded top, straight bottom */}
      <div className={cn('w-full rounded-t-lg border-2 border-b-0', capHeight, capBg, capBorder)} />
      {/* Body — center section with position number */}
      <div
        className={cn(
          'w-full border-x-2 flex items-center justify-center font-mono',
          drumBodyHeight,
          bodyBg,
          bodyBorder,
          'border-y-0',
          textColor
        )}
      >
        <span className={cn('font-bold leading-none', fontSize)}>{position.position_number}</span>
      </div>
      {/* Bottom cap — straight top, rounded bottom */}
      <div className={cn('w-full rounded-b-lg border-2 border-t-0', capHeight, capBg, capBorder)} />
    </div>
  );

  const serialLabel = position.tire_serial ? (
    <span className="text-[9px] leading-none text-muted-foreground mt-0.5 font-mono">
      {position.tire_serial.slice(-4)}
    </span>
  ) : null;

  const wrappedDrum = (
    <div className="flex flex-col items-center">
      {drumEl}
      {serialLabel}
    </div>
  );

  if (tooltipLines.length === 0) return wrappedDrum;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrappedDrum}</TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-0.5">
          <p className="font-semibold text-xs">Posición {position.position_number}</p>
          {tooltipLines.map((line) => (
            <p key={line} className="text-xs">
              {line}
            </p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── AxleColumn ─────────────────────────────────────────────────────────────
// Renders one axle as a vertical column: top tires — axle bar — bottom tires.
// The diagram is oriented horizontally (vehicle moves left→right).
// "LEFT" side appears on top, "RIGHT" side appears on bottom.

interface AxleColumnProps {
  axle: DiagramAxle;
  leftPositions: MergedPosition[];
  rightPositions: MergedPosition[];
  interactive: boolean;
  highlightedPositions: number[];
  onPositionClick?: (positionNumber: number) => void;
}

function AxleColumn({
  axle,
  leftPositions,
  rightPositions,
  interactive,
  highlightedPositions,
  onPositionClick,
}: AxleColumnProps) {
  const isDual = axle.tires_per_side === 2;

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Axle label */}
      <span className="text-[9px] text-muted-foreground mb-1 font-medium whitespace-nowrap">
        {axle.is_drive_axle ? '⚙ ' : ''}Eje {axle.axle_number}
      </span>

      {/* TOP row (LEFT side) */}
      <div className={cn('flex flex-row items-end', isDual ? 'gap-px' : '')}>
        {leftPositions.map((pos) => (
          <TireDrum
            key={pos.position_number}
            position={pos}
            interactive={interactive}
            highlighted={highlightedPositions.includes(pos.position_number)}
            onClick={() => onPositionClick?.(pos.position_number)}
            compact={isDual}
          />
        ))}
      </div>

      {/* Axle bar connecting top and bottom tires */}
      <div className="w-1 bg-gray-500 flex-1 min-h-[6px] rounded-full" />

      {/* BOTTOM row (RIGHT side) */}
      <div className={cn('flex flex-row items-start', isDual ? 'gap-px' : '')}>
        {rightPositions.map((pos) => (
          <TireDrum
            key={pos.position_number}
            position={pos}
            interactive={interactive}
            highlighted={highlightedPositions.includes(pos.position_number)}
            onClick={() => onPositionClick?.(pos.position_number)}
            compact={isDual}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

// ─── SpareAxleColumn ────────────────────────────────────────────────────────
// Renders a spare axle inline with regular axles inside the chassis.

interface SpareAxleColumnProps {
  axle: DiagramAxle;
  sparePosition: MergedPosition;
  interactive: boolean;
  highlightedPositions: number[];
  onPositionClick?: (positionNumber: number) => void;
}

function SpareAxleColumn({
  axle,
  sparePosition,
  interactive,
  highlightedPositions,
  onPositionClick,
}: SpareAxleColumnProps) {
  return (
    <div className="flex flex-col items-center gap-0">
      {/* Axle label */}
      <span className="text-[9px] text-muted-foreground mb-1 font-medium whitespace-nowrap">
        Eje {axle.axle_number}
      </span>

      {/* Spare circle centered vertically */}
      <div className="flex flex-col items-center justify-center flex-1 py-2">
        <TireDrum
          position={sparePosition}
          interactive={interactive}
          highlighted={highlightedPositions.includes(sparePosition.position_number)}
          onClick={() => onPositionClick?.(sparePosition.position_number)}
          circular
        />
        <span className="text-[9px] text-muted-foreground mt-1 whitespace-nowrap">Auxilio</span>
      </div>
    </div>
  );
}

export function TireDiagramRenderer({
  axles,
  positions = [],
  interactive = false,
  onPositionClick,
  highlightedPositions = [],
  label,
}: TireDiagramRendererProps) {
  const computed = calculatePositions(axles);
  const merged = mergePositions(computed, positions);

  // Sort ALL axles by axle_number — render in order (regular + spare interleaved)
  const sortedAxles = [...axles].sort((a, b) => a.axle_number - b.axle_number);
  const regularAxles = sortedAxles.filter((a) => !a.is_spare);

  // Group regular merged positions by axle_number and side
  const byAxle = new Map<number, { left: MergedPosition[]; right: MergedPosition[] }>();
  for (const pos of merged) {
    if (pos.side === 'SPARE') continue;
    if (!byAxle.has(pos.axle_number)) {
      byAxle.set(pos.axle_number, { left: [], right: [] });
    }
    const group = byAxle.get(pos.axle_number)!;
    if (pos.side === 'LEFT') group.left.push(pos);
    else group.right.push(pos);
  }

  // Group spare merged positions by axle_number
  const bySpareAxle = new Map<number, MergedPosition>();
  for (const pos of merged) {
    if (pos.side === 'SPARE') {
      bySpareAxle.set(pos.axle_number, pos);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-2">
        {label && <div className="text-sm font-medium text-muted-foreground">{label}</div>}

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-4 rounded-sm border-2 bg-gray-600 border-gray-700" />
            Con cubierta
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-4 rounded-sm border-2 border-dashed bg-white border-gray-400" />
            Vacío
          </span>
          {highlightedPositions.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-4 rounded-sm border-2 bg-amber-500 border-amber-600" />
              Intervenido
            </span>
          )}
        </div>

        {/* Diagram — fills 100% width of parent */}
        <div className="flex flex-row items-center w-full">
          {/* Direction indicator */}
          <div className="flex flex-col items-center justify-center shrink-0 pr-2">
            <span className="text-xs text-muted-foreground font-medium">→</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Frente</span>
          </div>

          {/* Side labels — only if there are regular axles */}
          {regularAxles.length > 0 && (
            <div className="flex flex-col justify-between text-[10px] text-muted-foreground pr-1.5 py-6 shrink-0">
              <span className="whitespace-nowrap">Izq</span>
              <span className="whitespace-nowrap">Der</span>
            </div>
          )}

          {/* Vehicle chassis frame — ALL axles sorted by axle_number, spare inline */}
          {sortedAxles.length > 0 && (
            <div className="relative flex flex-row items-stretch border-2 border-slate-300 rounded-xl bg-slate-50 px-3 py-3 flex-1 min-w-0 justify-around">
              {/* Chassis top rail */}
              <div className="absolute top-0 left-4 right-4 h-0.5 bg-slate-300 rounded-full" />
              {/* Chassis bottom rail */}
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-300 rounded-full" />

              {sortedAxles.map((axle) => {
                if (axle.is_spare) {
                  const sparePos = bySpareAxle.get(axle.axle_number);
                  if (!sparePos) return null;
                  return (
                    <SpareAxleColumn
                      key={axle.id}
                      axle={axle}
                      sparePosition={sparePos}
                      interactive={interactive}
                      highlightedPositions={highlightedPositions}
                      onPositionClick={onPositionClick}
                    />
                  );
                }
                const group = byAxle.get(axle.axle_number) ?? { left: [], right: [] };
                return (
                  <AxleColumn
                    key={axle.id}
                    axle={axle}
                    leftPositions={group.left}
                    rightPositions={group.right}
                    interactive={interactive}
                    highlightedPositions={highlightedPositions}
                    onPositionClick={onPositionClick}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Position count summary */}
        <div className="text-[10px] text-muted-foreground">
          {computed.filter((p) => p.side !== 'SPARE').length} posiciones ·{' '}
          {positions.filter((p) => p.tire_id !== null).length} con cubierta ·{' '}
          {computed.filter((p) => p.side === 'SPARE').length} auxilio
        </div>
      </div>
    </TooltipProvider>
  );
}
