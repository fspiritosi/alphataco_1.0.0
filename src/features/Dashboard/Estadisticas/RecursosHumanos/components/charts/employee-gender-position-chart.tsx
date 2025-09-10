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
import { GetEmployeesByGenderAndPositionType } from '../../actions/actions';

interface EmployeeGenderPositionChartProps {
  data: GetEmployeesByGenderAndPositionType;
}
const chartConfig = {
  masculino: {
    label: 'Masculino',
    color: 'hsl(var(--chart-1))',
  },
  femenino: {
    label: 'Femenino',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function EmployeeGenderPositionChartComponent({ data }: EmployeeGenderPositionChartProps) {
  const sortedData = useMemo(() => {
    const positionData = new Map<string, { male: number; female: number }>();

    data.forEach((employee) => {
      const position = employee.company_positions.name || 'Undefined Position';
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
    // Create a map to store position counts by gender
    const positionData = new Map<string, { male: number; female: number }>();

    // Count employees by position and gender
    data.forEach((employee) => {
      const position = employee.company_positions.name || 'Undefined Position';
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

    // Convert map to array format required by chart
    // If no positions are selected, take the top 5 by default
    const finalChartData =
      selectedPositions.length === 0
        ? sortedData.slice(0, 5)
        : sortedData.filter((item) => selectedPositions.includes(item.originalPosition));

    return finalChartData;
  }, [selectedPositions, sortedData]);

  return (
    <div className=" w-full">
      <MultiSelect values={selectedPositions} onValuesChange={setSelectedPositions}>
        <MultiSelectTrigger className="w-full max-w-[400px]">
          <MultiSelectValue placeholder="Seleccionar posiciones..." />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectGroup>
            {Array.from(new Set(data.map((item) => item.company_positions.name))).map((position) => (
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
          <Bar dataKey="masculino" stackId="a" fill="var(--color-masculino)" radius={[0, 0, 0, 0]}>
            {/* <LabelList
              dataKey="month"
              position="right"
              offset={8}

              fontSize={12}
              width={100}

            /> */}
          </Bar>
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

// const [selectedPosition, setSelectedPosition] = useState<string>('all');

// // Obtener posiciones únicas
// const positions = useMemo(() => {
//   const uniquePositions = Array.from(
//     new Set(data.map(item => item.company_positions.name))
//   ).sort();
//   return uniquePositions;
// }, [data]);

// // Filtrar datos por posición seleccionada
// const filteredData = useMemo(() => {
//   if (selectedPosition === 'all') {
//     return data;
//   }
//   return data.filter(item => item.company_positions.name === selectedPosition);
// }, [data, selectedPosition]);

// // Procesar datos para el gráfico (stacked)
// const chartData2 = useMemo(() => {
//   const genderCounts = filteredData.reduce((acc, item) => {
//     const gender = item.gender || 'Otro';
//     acc[gender] = (acc[gender] || 0) + 1;
//     return acc;
//   }, {} as Record<string, number>);

//   const positionData = new Map<string, Record<string, number>>();

//   if (selectedPosition === 'all') {
//     filteredData.forEach(item => {
//       const position = item.company_positions.name;
//       const gender = item.gender || 'Otro';

//       if (!positionData.has(position)) {
//         positionData.set(position, { Masculino: 0, Femenino: 0 });
//       }

//       const counts = positionData.get(position)!;
//       if (gender === 'Masculino' || gender === 'Femenino') {
//         counts[gender] = (counts[gender] || 0) + 1;
//       }
//     });

//     return Array.from(positionData.entries()).map(([position, counts]) => {
//       const row: any = {
//         position: position.length > 24 ? position.substring(0, 24) + '...' : position,
//         Masculino: counts.Masculino || 0,
//         Femenino: counts.Femenino || 0,
//       };
//       row.Total = (row.Masculino || 0) + (row.Femenino || 0);
//       return row;
//     });
//   } else {
//     const row: any = {
//       position: selectedPosition.length > 24 ? selectedPosition.substring(0, 24) + '...' : selectedPosition,
//       Masculino: genderCounts.Masculino || 0,
//       Femenino: genderCounts.Femenino || 0,
//     };
//     row.Total = (row.Masculino || 0) + (row.Femenino || 0);
//     return [row];
//   }
// }, [filteredData, selectedPosition]);

// console.log(chartData2, 'chartData2')

{
  /* <div className="mb-4">
        <Select value={selectedPosition} onValueChange={setSelectedPosition}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar posición" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las posiciones</SelectItem>
            {positions.map(position => (
              <SelectItem key={position} value={position!}>
                {position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */
}
{
  /* 
      <ChartContainer config={chartConfig} className="w-full" style={{ height: dynamicHeight }}>
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ right: 16 }}
          barCategoryGap={14}
          barGap={6}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="position"
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            hide
          />
          <XAxis type="number" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <ChartLegend content={<ChartLegendContent />} />

          <Bar dataKey="Masculino" stackId="a" fill="var(--color-Masculino)" radius={4}>
            <LabelList
              dataKey="position"
              position="insideLeft"
              offset={8}
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
          <Bar dataKey="Femenino" stackId="a" fill="var(--color-Femenino)" radius={4}>
            <LabelList
              dataKey="Total"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer> */
}
