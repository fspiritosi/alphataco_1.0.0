'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Maximize2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
} from 'recharts';

// const chartData = [
//   { mes: 'Enero', activos: 300, inactivos: 160 },
//   { mes: 'Febrero', activos: 250, inactivos: 210 },
//   { mes: 'Marzo', activos: 280, inactivos: 180 },
//   { mes: 'Abril', activos: 190, inactivos: 270 },
//   { mes: 'Mayo', activos: 310, inactivos: 150 },
//   { mes: 'Junio', activos: 320, inactivos: 140 },
//   { mes: 'Julio', activos: 330, inactivos: 130 },
//   { mes: 'Agosto', activos: 340, inactivos: 120 },
//   { mes: 'Septiembre', activos: 350, inactivos: 110 },
//   { mes: 'Octubre', activos: 200, inactivos: 260 },
//   { mes: 'Noviembre', activos: 360, inactivos: 100 },
//   { mes: 'Diciembre', activos: 370, inactivos: 90 },
// ];

const chartConfig = {
  activos: {
    label: 'Activos',
    color: 'hsl(var(--chart-6))',
  },
  inactivos: {
    label: 'Inactivos',
    color: 'hsl(var(--chart-7))',
  },
  usados: {
    label: 'Usados',
    color: 'hsl(var(--chart-8))',
  },
  porcentaje: {
    label: 'Porcentaje',
    color: 'hsl(var(--chart-9))',
  },
} satisfies ChartConfig;

const charts_types = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Lineas' },
  { value: 'area', label: 'Area' },
];

const chartRender = ({ data }: { data: any }) => {
  const [chartType, setChartType] = useState('bar');
  const handleChartTypeChange = (value: any) => {
    setChartType(value);
  };
  return (
    <div>
      <div className="mb-4">
        <select
          value={chartType}
          onChange={(e) => handleChartTypeChange(e.target.value)}
          className="rounded-md border p-2"
        >
          {charts_types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <ChartContainer config={chartConfig}>
        {chartType === 'bar' ? (
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="Nombre"
              tickLine={true}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="Activos" fill="var(--color-activos)" radius={4} />
            <Bar dataKey="Inactivos" fill="var(--color-inactivos)" radius={4} />
            <Bar dataKey="Usados" fill="var(--color-usados)" radius={4} />
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={true} />
            <XAxis
              dataKey="Nombre"
              tickLine={true}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Line
              dataKey="Activos"
              type="natural"
              stroke="var(--color-activos)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-activos)',
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Line>
            <Line
              dataKey="Inactivos"
              type="natural"
              stroke="var(--color-inactivos)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-inactivos)',
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Line>
            <Line
              dataKey="Usados"
              type="natural"
              stroke="var(--color-usados)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-usados)',
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Line>
            <Line
              dataKey="Porcentaje"
              type="natural"
              stroke="var(--color-inactivos)"
              strokeWidth={2}
              dot={{
                fill: 'var(--color-inactivos)',
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Line>
          </LineChart>
        ) : (
          <RadarChart data={data}>
            <ChartTooltip cursor={true} content={<ChartTooltipContent indicator="line" />} />
            <PolarAngleAxis dataKey="Nombre" />
            <PolarGrid />
            <Radar dataKey="Activos" fill="var(--color-activos)" fillOpacity={0.6} />
            <Radar dataKey="Inactivos" fill="var(--color-inactivos)" fillOpacity={0.6} />
            <Radar dataKey="Usados" fill="var(--color-usados)" fillOpacity={0.6} />
            <Radar dataKey="Porcentaje" fill="var(--color-usados)" fillOpacity={0.6} />
          </RadarChart>
        )}
      </ChartContainer>
    </div>
  );
};

export function InteractiveChart({ chartData }: { chartData: any }) {
  const chartDataTransformed = chartData.map((item: any) => ({
    Nombre: item.type_name,
    Activos: item.available_units,
    Inactivos: item.not_available_units,
    Usados: item.not_available_units,
    Porcentaje: item.usage_indicator,
  }));

  return (
    <div>
      <Card>
        <CardHeader>
          <AlertDialog>
            <AlertDialogTrigger className="flex items-end justify-end">
              <Maximize2 />
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-3xl w-full">
              <AlertDialogHeader>
                <div className="flex items-end justify-end">
                  <AlertDialogCancel className="flex items-end justify-end">X</AlertDialogCancel>
                </div>
              </AlertDialogHeader>
              {chartRender({ data: chartDataTransformed })}
              <AlertDialogFooter>{/* <AlertDialogAction>Continue</AlertDialogAction> */}</AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <CardTitle>Estado de Equipos</CardTitle>
          <CardDescription>Activos e Inactivos</CardDescription>
        </CardHeader>
        <CardContent>{chartRender({ data: chartDataTransformed })}</CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Tendencia de Equipos Activos <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">Se muestran todos los tipos de equipos</div>
        </CardFooter>
      </Card>
    </div>
  );
}
