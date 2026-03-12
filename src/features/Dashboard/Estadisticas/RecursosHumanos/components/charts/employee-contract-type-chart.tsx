'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { EmployeesByContractTypeData } from '../../actions.server';

interface EmployeeContractTypeChartProps {
  data: EmployeesByContractTypeData;
}

const chartConfig = {
  count: {
    label: 'Empleados',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function EmployeeContractTypeChartComponent({ data }: EmployeeContractTypeChartProps) {
  const chartData = useMemo(() => {
    // Contar empleados por tipo de contrato
    const contractCounts = new Map<string, number>();

    data?.forEach((employee) => {
      const contractType = employee.types_of_contract?.name || 'Sin especificar';
      contractCounts.set(contractType, (contractCounts.get(contractType) || 0) + 1);
    });

    // Convertir map a array y ordenar por cantidad descendente
    return Array.from(contractCounts.entries())
      .map(([contractType, count]) => ({
        month: contractType.length > 24 ? contractType.substring(0, 24) + '...' : contractType,
        count: count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div>
      <ChartContainer
        config={chartConfig}
        className="w-full"
        style={{ height: chartData.length * 40 > 300 ? chartData.length * 40 : 300 }}
      >
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          className="h-full"
          margin={{
            right: 16,
          }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="month" type="category" tickLine={false} tickMargin={10} axisLine={false} hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent />}
            labelFormatter={(value) => chartData.find((item) => item.month === value)?.month || value}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="month"
              position="right"
              offset={8}
              fontSize={12}
              width={100}
              formatter={(value: string) => (value.length > 25 ? `${value.substring(0, 25)}...` : value)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
