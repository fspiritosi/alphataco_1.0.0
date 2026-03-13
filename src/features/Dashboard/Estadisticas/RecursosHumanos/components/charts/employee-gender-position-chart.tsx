'use client';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { EmployeesByGenderAndPositionData } from '../../actions.server';

interface EmployeeGenderPositionChartProps {
  data: EmployeesByGenderAndPositionData;
}

const chartConfig = {
  masculino: {
    label: 'Masculino',
    color: 'var(--chart-1)',
  },
  femenino: {
    label: 'Femenino',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function EmployeeGenderPositionChartComponent({ data }: EmployeeGenderPositionChartProps) {
  const sortedData = useMemo(() => {
    const positionData = new Map<string, { male: number; female: number }>();

    data?.forEach((employee) => {
      const position = employee.company_positions?.name || 'Undefined Position';
      const gender = employee.gender || 'Undefined';

      if (!positionData.has(position)) {
        positionData.set(position, { male: 0, female: 0 });
      }

      const counts = positionData.get(position)!;
      if (gender === 'Masculino') {
        counts.male += 1;
      } else if (gender === 'Femenino') {
        counts.female += 1;
      }
    });

    return Array.from(positionData.entries())
      .map(([position, counts]) => ({
        month: position.length > 24 ? position.substring(0, 24) + '...' : position,
        originalPosition: position,
        masculino: counts.male,
        femenino: counts.female,
      }))
      .sort((a, b) => b.masculino + b.femenino - (a.masculino + a.femenino));
  }, [data]);

  const [selectedPositions, setSelectedPositions] = useState<string[]>(() => {
    return sortedData.slice(0, 5).map((item) => item.originalPosition);
  });

  const chartData = useMemo(() => {
    if (selectedPositions.length === 0) {
      return sortedData.slice(0, 5);
    }
    return sortedData.filter((item) => selectedPositions.includes(item.originalPosition));
  }, [selectedPositions, sortedData]);

  return (
    <div className=" w-full">
      <MultiSelect values={selectedPositions} onValuesChange={setSelectedPositions}>
        <MultiSelectTrigger className="w-full max-w-[400px]">
          <MultiSelectValue placeholder="Seleccionar posiciones..." />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectGroup>
            {Array.from(new Set(data?.map((item) => item.company_positions?.name))).map((position) => (
              <MultiSelectItem key={position} value={position!}>
                {position}
              </MultiSelectItem>
            ))}
          </MultiSelectGroup>
        </MultiSelectContent>
      </MultiSelect>
      <ChartContainer
        config={chartConfig}
        className="w-full"
        style={{ height: chartData.length > 6 ? chartData.length * 40 : chartData.length * 65 }}
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
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent />}
            labelFormatter={(value) => chartData.find((item) => item.month === value)?.month || value}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="masculino" stackId="a" fill="var(--color-masculino)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="femenino" stackId="a" fill="var(--color-femenino)" radius={[0, 2, 2, 0]}>
            <LabelList dataKey="month" position="right" offset={8} fontSize={12} width={100} />
          </Bar>

          <YAxis
            dataKey="month"
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            width={60}
            tickFormatter={(value) => (value.length > 4 ? value.substring(0, 4) + '...' : value)}
            hide
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
