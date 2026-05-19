'use client';

import { Button } from '@/components/ui/button';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Cell, Pie, PieChart } from 'recharts';
import {
  OWNERSHIP_CATEGORIES,
  VEHICLE_STATUSES,
  type OwnershipCategory,
  type VehicleStatus,
  type WorkdaysAggregate,
} from '../types';
import { ConditionChip } from './ConditionChip';
import { OwnershipCard } from './OwnershipCard';
import { WorkdaysProgress } from './WorkdaysProgress';

// Paleta semantica para distinguir las 3 categorias.
const CATEGORY_COLORS: Record<OwnershipCategory, string> = {
  Propios: 'var(--chart-2)',
  Leasing: 'var(--chart-4)',
  Contratados: 'var(--chart-1)',
};

// Labels + clases visuales para los KPIs de condicion operativa.
// ringClass + tintClass se aplican cuando el chip esta selected.
const STATUS_META: Record<VehicleStatus, { label: string; dotClass: string; ringClass: string; tintClass: string }> = {
  operativo: {
    label: 'Operativos',
    dotClass: 'bg-emerald-500',
    ringClass: 'ring-1 ring-emerald-500/50',
    tintClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  operativo_condicionado: {
    label: 'Op. condicionado',
    dotClass: 'bg-amber-500',
    ringClass: 'ring-1 ring-amber-500/50',
    tintClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  en_preparacion: {
    label: 'En preparación',
    dotClass: 'bg-sky-500',
    ringClass: 'ring-1 ring-sky-500/50',
    tintClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  no_operativo: {
    label: 'No operativos',
    dotClass: 'bg-rose-500',
    ringClass: 'ring-1 ring-rose-500/50',
    tintClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  en_reparacion: {
    label: 'En reparación',
    dotClass: 'bg-indigo-500',
    ringClass: 'ring-1 ring-indigo-500/50',
    tintClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  },
};

const chartConfig = {
  count: { label: 'Equipos' },
  Propios: { label: 'Propios', color: CATEGORY_COLORS.Propios },
  Leasing: { label: 'Leasing', color: CATEGORY_COLORS.Leasing },
  Contratados: { label: 'Contratados', color: CATEGORY_COLORS.Contratados },
} satisfies ChartConfig;

interface OwnershipDonutChartProps {
  countsByCategory: Record<OwnershipCategory, number>;
  // Counts de condicion mostrados en la banda inferior. Ya viene segmentado
  // por el padre segun haya drill-down o no (responsabilidad del client).
  effectiveConditionCounts: Record<VehicleStatus, number>;
  workdays: WorkdaysAggregate;
  // Drill-down activo (o null si esta global).
  drilledCategory: OwnershipCategory | null;
  // Estados seleccionados para el filtro global.
  selectedStatuses: Set<VehicleStatus>;
  onDrillDown: (category: OwnershipCategory) => void;
  onToggleStatus: (status: VehicleStatus) => void;
  onClearStatuses: () => void;
}

export function OwnershipDonutChart({
  countsByCategory,
  effectiveConditionCounts,
  workdays,
  drilledCategory,
  selectedStatuses,
  onDrillDown,
  onToggleStatus,
  onClearStatuses,
}: OwnershipDonutChartProps) {
  const total = OWNERSHIP_CATEGORIES.reduce((sum, cat) => sum + countsByCategory[cat], 0);

  // Data del donut: si hay drill-down, atenuamos los slices NO seleccionados
  // bajando su opacidad (mantenemos el slice visible para no romper la composicion).
  const data = OWNERSHIP_CATEGORIES.map((category) => ({
    category,
    count: countsByCategory[category],
    fill: CATEGORY_COLORS[category],
    fillOpacity: drilledCategory && drilledCategory !== category ? 0.25 : 1,
  })).filter((d) => d.count > 0);

  // Banda de condiciones: solo mostramos chips con count > 0 O seleccionados
  // (un chip seleccionado siempre visible aunque su count baje a 0 por filtros).
  const visibleStatuses = VEHICLE_STATUSES.filter(
    (s) => effectiveConditionCounts[s] > 0 || selectedStatuses.has(s)
  );

  const conditionLabel = drilledCategory ? `${drilledCategory}` : 'Todas las categorías';

  return (
    <div className="flex flex-col gap-6">
      <WorkdaysProgress worked={workdays.worked} possible={workdays.possible} />

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-around">
        {/* Donut chart con total al centro */}
        <ChartContainer config={chartConfig} className="aspect-square h-[220px] w-[220px]">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              innerRadius={65}
              outerRadius={95}
              strokeWidth={2}
              paddingAngle={total > 0 ? 2 : 0}
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} fillOpacity={entry.fillOpacity} />
              ))}
            </Pie>
            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-3xl font-bold"
            >
              {total}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs"
            >
              equipos
            </text>
          </PieChart>
        </ChartContainer>

        {/* Leyenda clickeable */}
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          {OWNERSHIP_CATEGORIES.map((category) => {
            const count = countsByCategory[category];
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <OwnershipCard
                key={category}
                category={category}
                count={count}
                percent={percent}
                color={CATEGORY_COLORS[category]}
                selected={drilledCategory === category}
                dimmed={drilledCategory !== null && drilledCategory !== category}
                onClick={() => onDrillDown(category)}
              />
            );
          })}
        </div>
      </div>

      {/* Banda de condicion — chips multi-select */}
      {visibleStatuses.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Condición · <span className="normal-case text-foreground/80">{conditionLabel}</span>
            </span>
            {selectedStatuses.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onClearStatuses}
              >
                Limpiar ({selectedStatuses.size})
              </Button>
            )}
          </div>
          <div
            className={cn(
              'flex flex-wrap items-center gap-2 lg:gap-3',
              drilledCategory && 'lg:justify-start'
            )}
          >
            {visibleStatuses.map((status) => {
              const meta = STATUS_META[status];
              const count = effectiveConditionCounts[status];
              return (
                <ConditionChip
                  key={status}
                  status={status}
                  label={meta.label}
                  count={count}
                  dotClass={meta.dotClass}
                  ringClass={meta.ringClass}
                  tintClass={meta.tintClass}
                  selected={selectedStatuses.has(status)}
                  disabled={count === 0 && !selectedStatuses.has(status)}
                  onClick={() => onToggleStatus(status)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
