import { TrendingUp } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig } from '@/components/ui/chart';
import { getAbsenteeismTrend } from '../actions/actions';
import { AbsenteeismTrendChartComponent } from './charts/absenteeism-trend-chart';

const chartConfig = {
  percentage: {
    label: 'Ausentismo',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export async function AbsenteeismTrendChart() {
  const data: any = await getAbsenteeismTrend({});
  console.log(data, 'getAbsenteeismTrend');
  const currentValue = data[data.length - 1]?.percentage || 0;
  const previousValue = data[data.length - 2]?.percentage || 0;
  const trend = currentValue - previousValue;
  const isPositive = trend > 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Variación de Ausentismo</CardTitle>
        <CardDescription>Agosto 2025</CardDescription>
      </CardHeader>
      <CardContent>
        <AbsenteeismTrendChartComponent chartConfig={chartConfig} data={data} />
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {isPositive ? 'Incremento' : 'Reducción'} de {Math.abs(trend).toFixed(2)}% desde el día anterior
          <TrendingUp className={`h-4 w-4 ${isPositive ? 'text-red-500' : 'text-green-500 rotate-180'}`} />
        </div>
        <div className="text-muted-foreground leading-none">Ausentismo actual: {currentValue}%</div>
      </CardFooter>
    </Card>
  );
}
