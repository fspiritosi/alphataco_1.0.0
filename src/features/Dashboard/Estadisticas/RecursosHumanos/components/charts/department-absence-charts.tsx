'use client';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Pie, PieChart } from 'recharts';

interface DepartmentAbsenceChartsProps {
  chartConfig: ChartConfig;
  deptChartData: {
    reason: string;
    value: number;
    fill: string;
    label: string;
  }[];
}

export function DepartmentAbsenceChartsComponent({ chartConfig, deptChartData }: DepartmentAbsenceChartsProps) {
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[230px] pb-0">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie data={deptChartData} dataKey="value" nameKey="label" innerRadius={50} strokeWidth={8} />
        <ChartLegend content={<ChartLegendContent nameKey="reason" />} />
      </PieChart>
    </ChartContainer>
  );
}
