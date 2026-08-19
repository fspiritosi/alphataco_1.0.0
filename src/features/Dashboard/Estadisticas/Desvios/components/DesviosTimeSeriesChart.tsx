'use client';

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { DEVIATION_SERIES, seriesColorVar, type DeviationSeriesKey } from '../constants';
import { DesviosChartTooltip, type DeviationChartPoint } from './DesviosChartTooltip';

const chartConfig = Object.fromEntries(
  DEVIATION_SERIES.map((serie) => [serie.key, { label: serie.label }])
) satisfies ChartConfig;

interface Props {
  chartData: DeviationChartPoint[];
  /** Series visibles. El usuario las prende y apaga desde los KPI del header. */
  visibleSeries: DeviationSeriesKey[];
}

export function DesviosTimeSeriesChart({ chartData, visibleSeries }: Props) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <LineChart data={chartData} margin={{ left: 12, right: 12, top: 16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={40}
          className="tabular-nums"
        />
        <ChartTooltip cursor={false} content={<DesviosChartTooltip />} />

        {/*
          Meta = 0: el objetivo acordado con el cliente es no tener ningun desvio.
          Va en gris neutro y no en verde: la referencia contra la que se lee todo
          el grafico no debe competir por color con ninguna serie (el verde daba
          practicamente el mismo color que "Desvios Equipos" en deuteranopia).
          Su identidad la dan el trazo punteado y la etiqueta.
        */}
        <ReferenceLine
          y={0}
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          label={{
            value: 'Meta: 0',
            position: 'insideTopLeft',
            fill: 'var(--muted-foreground)',
            fontSize: 11,
            fontWeight: 600,
          }}
        />

        {DEVIATION_SERIES.filter((serie) => visibleSeries.includes(serie.key)).map((serie) => (
          <Line
            key={serie.key}
            dataKey={serie.key}
            name={serie.label}
            type="monotone"
            stroke={seriesColorVar(serie.key)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            // Sin animacion: al prender y apagar series, recharts deja las lineas
            // a medio dibujar (mismo motivo que en ServiceHistoryAreaChart).
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
