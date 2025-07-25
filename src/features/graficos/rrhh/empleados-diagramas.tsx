'use client';
import { Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const description = 'A pie chart with a label';

export function Empleados_diagramas({
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
            {/* <ChartLegend
              content={<ChartLegendContent nameKey="novedad" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            /> */}
          </PieChart>
        </ChartContainer>
        {/* <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <Pie data={chartData} dataKey="empleados" />
            <ChartLegend
              content={<ChartLegendContent nameKey="novedad" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer> */}
      </CardContent>
      {/* <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  );
}
