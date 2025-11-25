'use client';
import { Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const description = 'A pie chart with a label';

export function EmployeeDiagramsPieChart({
  chartData,
  chartConfig,
  date,
}: {
  chartData: any;
  chartConfig: any;
  date: string;
}) {
  return (
    <Card className="flex flex-col ">
      <CardHeader className="items-center pb-0">
        <CardTitle>Diagramas cargados al día</CardTitle>
        <CardDescription>Fecha: {date}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 ">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square pb-0 max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="empleados" label nameKey="novedad" />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
