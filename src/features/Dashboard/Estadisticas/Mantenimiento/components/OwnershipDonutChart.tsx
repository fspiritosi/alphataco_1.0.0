'use client';

import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Cell, Pie, PieChart } from 'recharts';
import {
  OWNERSHIP_CATEGORIES,
  VEHICLE_STATUSES,
  type OwnershipCategory,
  type VehicleStatus,
} from '../types';

// Paleta semantica para distinguir las 3 categorias.
const CATEGORY_COLORS: Record<OwnershipCategory, string> = {
  Propios: 'var(--chart-2)',
  Leasing: 'var(--chart-4)',
  Contratados: 'var(--chart-1)',
};

// Labels y colores para los KPIs de condicion operativa
const STATUS_META: Record<VehicleStatus, { label: string; dotClass: string }> = {
  operativo: { label: 'Operativos', dotClass: 'bg-emerald-500' },
  operativo_condicionado: { label: 'Op. condicionado', dotClass: 'bg-amber-500' },
  en_preparacion: { label: 'En preparación', dotClass: 'bg-sky-500' },
  no_operativo: { label: 'No operativos', dotClass: 'bg-rose-500' },
  en_reparacion: { label: 'En reparación', dotClass: 'bg-indigo-500' },
};

const chartConfig = {
  count: { label: 'Equipos' },
  Propios: { label: 'Propios', color: CATEGORY_COLORS.Propios },
  Leasing: { label: 'Leasing', color: CATEGORY_COLORS.Leasing },
  Contratados: { label: 'Contratados', color: CATEGORY_COLORS.Contratados },
} satisfies ChartConfig;

interface OwnershipDonutChartProps {
  countsByCategory: Record<OwnershipCategory, number>;
  conditionCounts: Record<VehicleStatus, number>;
}

export function OwnershipDonutChart({ countsByCategory, conditionCounts }: OwnershipDonutChartProps) {
  const total = OWNERSHIP_CATEGORIES.reduce((sum, cat) => sum + countsByCategory[cat], 0);

  const data = OWNERSHIP_CATEGORIES.map((category) => ({
    category,
    count: countsByCategory[category],
    fill: CATEGORY_COLORS[category],
  })).filter((d) => d.count > 0);

  // Solo mostramos KPIs de condicion con count > 0 — evita ruido
  const visibleStatuses = VEHICLE_STATUSES.filter((s) => conditionCounts[s] > 0);

  return (
    <div className="flex flex-col gap-6">
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
                <Cell key={entry.category} fill={entry.fill} />
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

        {/* Leyenda con count y porcentaje por categoria */}
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          {OWNERSHIP_CATEGORIES.map((category) => {
            const count = countsByCategory[category];
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div
                key={category}
                className="flex items-center gap-3 rounded-md border bg-card/40 px-3 py-2 transition-colors hover:bg-card"
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  aria-hidden
                />
                <span className="text-sm font-medium flex-1">{category}</span>
                <span className="text-sm tabular-nums font-semibold">{count}</span>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPIs de condicion operativa — banda inferior */}
      {visibleStatuses.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t pt-4 lg:gap-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Condición:</span>
          {visibleStatuses.map((status) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-md border bg-card/40 px-2.5 py-1"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_META[status].dotClass}`} aria-hidden />
              <span className="text-xs text-muted-foreground">{STATUS_META[status].label}</span>
              <span className="text-xs font-semibold tabular-nums">{conditionCounts[status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
