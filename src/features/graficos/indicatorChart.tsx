'use client';
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const description = 'A radial chart with stacked sections';

export function IndicatorChart({
  chartConfig,
  chartData,
  totalIndicator,
}: {
  chartConfig: ChartConfig;
  chartData: any;
  totalIndicator: number;
}) {
  // Función para determinar el color del texto basado en el totalIndicator
  const getTextColor = (value: number) => {
    if (value >= 75) return '#22c55e'; // Verde
    if (value >= 50) return '#eab308'; // Amarillo
    return '#ef4444'; // Rojo
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <ChartContainer config={chartConfig} className="w-full max-h-[200px] aspect-square my-auto">
        <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={120}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 16}
                        className="text-2xl font-bold"
                        fill={getTextColor(totalIndicator)}
                      >
                        {totalIndicator} %
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 4}
                        className="text-sm"
                        fill={getTextColor(totalIndicator)}
                      >
                        En operación
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </PolarRadiusAxis>
          <RadialBar
            dataKey="available"
            fill={chartConfig.available?.color}
            stackId="a"
            cornerRadius={5}
            className="stroke-transparent stroke-2"
          />
          <RadialBar
            dataKey="operative"
            stackId="a"
            cornerRadius={5}
            fill={chartConfig.operative?.color}
            className="stroke-transparent stroke-2"
          />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
}
