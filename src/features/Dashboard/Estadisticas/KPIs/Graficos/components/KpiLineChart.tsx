'use client';

import moment from 'moment';
import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';

interface ChartDataPoint {
  date: string;
  indicator: number;
}

interface KpiLineChartProps {
  chartData: ChartDataPoint[];
  expectedPercentage: number;
  invertColors: boolean;
  showLabels: boolean;
}

const chartConfig = {
  indicator: {
    label: 'Indicador (%)',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const COLOR_GREEN = 'hsl(142.1 76.2% 36.3%)';
const COLOR_RED = 'hsl(0 84.2% 60.2%)';

function getDotColor(isAboveExpected: boolean, invertColors: boolean) {
  if (invertColors) return isAboveExpected ? COLOR_GREEN : COLOR_RED;
  return isAboveExpected ? COLOR_RED : COLOR_GREEN;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

export default function KpiLineChart({ chartData, expectedPercentage, invertColors, showLabels }: KpiLineChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
      <LineChart accessibilityLayer data={chartData} margin={{ top: 20, left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={20}
          tickFormatter={(value) => moment(value, 'YYYY-MM-DD').format('DD/MM')}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={false}
          content={(props) => {
            if (!props.active || !props.payload || !props.payload.length) return null;
            const value = props.payload[0].value as number;
            const isAboveExpected = value > expectedPercentage;
            const indicatorColor = getDotColor(isAboveExpected, invertColors);

            return (
              <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs shadow-xl">
                <div className="font-medium">{moment(props.label as string, 'YYYY-MM-DD').format('DD/MM/YYYY')}</div>
                <div className="flex w-full items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: indicatorColor }} />
                  <div className="flex flex-1 justify-between leading-none items-center gap-3">
                    <span className="text-muted-foreground">Indicador</span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {Number(value).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        {expectedPercentage > 0 && (
          <ReferenceLine
            y={expectedPercentage}
            stroke={COLOR_GREEN}
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `${expectedPercentage}%`,
              position: 'insideTopRight',
              fill: COLOR_GREEN,
              fontSize: 12,
              fontWeight: 600,
            }}
          />
        )}
        <Line
          dataKey="indicator"
          type="monotone"
          stroke="color-mix(in oklch, var(--muted-foreground) 30%, transparent)"
          strokeWidth={2}
          dot={(props: DotProps) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null || !payload) return <></>;
            const isAboveExpected = payload.indicator > expectedPercentage;
            const dotColor = getDotColor(isAboveExpected, invertColors);
            return <circle cx={cx} cy={cy} r={5} fill={dotColor} stroke="white" strokeWidth={2} />;
          }}
          activeDot={{ r: 7 }}
        >
          {showLabels && (
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
              formatter={(value: number) => `${value}%`}
            />
          )}
        </Line>
      </LineChart>
    </ChartContainer>
  );
}
