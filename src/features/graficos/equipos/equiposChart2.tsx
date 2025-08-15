'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart } from 'recharts';

export const description = 'A pie chart with a label';

export function EquiposChart2({ chartData, chartConfig, date }: { chartData: any; chartConfig: any; date: string }) {
  console.log(chartData);
  const totalChartData = [
    {
      novedad: 'Activos',
      total: chartData
        ?.filter((item: any) => item.novedad === 'Chasis' || item.novedad === 'Tractor')
        .reduce((acc: number, item: any) => acc + (item.disponibles || 0), 0),
      fill: '#34C759', // Green color for Total
    },
    {
      novedad: 'Usados',
      total: chartData
        ?.filter((item: any) => item.novedad === 'Chasis' || item.novedad === 'Tractor')
        .reduce((acc: number, item: any) => acc + (item.enUso || 0), 0),
      fill: '#e74c3c', // Red color for No Disponibles
    },
  ];
  return (
    <Card className="flex flex-col ">
      <CardHeader className="items-center pb-0">
        <CardTitle>
          <span className="text-lg">Cantidad total de unidades motoras activas </span>
          <div className="flex items-center justify-center">
            <span className="text-muted-foreground text-sm">(Tipo: Chasis & Tractor)</span>
          </div>
        </CardTitle>
        <CardDescription>Fecha: {date}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 ">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square pb-0 max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={totalChartData} dataKey="total" label nameKey="novedad" />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
