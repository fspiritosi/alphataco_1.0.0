'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { type DateRange } from 'react-day-picker';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartData } from '../hooks/useChartData';

const chartConfig = {
  'total-count': {
    label: 'Total',
    color: 'var(--chart-1)',
  },
  'vehicle-count': {
    label: 'Vehículos',
    color: 'var(--chart-2)',
  },
  'employee-count': {
    label: 'Empleados',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

export function CompanyCountsChart() {
  const { data: rawData, loading } = useChartData('get_company_counts_indicator');

  const chartData = React.useMemo(() => {
    return rawData.map((item) => {
      const metrics = item.metrics as {
        total_count?: number;
        vehicle_count?: number;
        employee_count?: number;
      };
      return {
        date: item.snapshot_date,
        'total-count': metrics.total_count || 0,
        'vehicle-count': metrics.vehicle_count || 0,
        'employee-count': metrics.employee_count || 0,
      };
    });
  }, [rawData]);

  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);

  // Resetear range cuando cambia timeRange
  React.useEffect(() => {
    if (timeRange) {
      const today = new Date();
      const from = new Date();
      const daysToSubtract = timeRange === '1y' ? 365 : timeRange === '90d' ? 90 : timeRange === '7d' ? 7 : 30;
      from.setDate(today.getDate() - daysToSubtract);
      setRange({
        from,
        to: today,
      });
    }
  }, [timeRange]);

  const filteredData = React.useMemo(() => {
    if (!range?.from && !range?.to) {
      return chartData;
    }

    return chartData.filter((item) => {
      const date = new Date(item.date);
      if (range.from && range.to) {
        return date >= range.from && date <= range.to;
      }
      if (range.from) {
        return date >= range.from;
      }
      return true;
    });
  }, [chartData, range]);

  const totals = React.useMemo(() => {
    if (filteredData.length === 0) return { total: 0, vehicles: 0, employees: 0 };

    const sum = filteredData.reduce(
      (acc, curr) => ({
        total: acc.total + curr['total-count'],
        vehicles: acc.vehicles + curr['vehicle-count'],
        employees: acc.employees + curr['employee-count'],
      }),
      { total: 0, vehicles: 0, employees: 0 }
    );

    return {
      total: (sum.total / filteredData.length).toFixed(0),
      vehicles: (sum.vehicles / filteredData.length).toFixed(0),
      employees: (sum.employees / filteredData.length).toFixed(0),
    };
  }, [filteredData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conteos Generales</CardTitle>
          <CardDescription>Evolución de vehículos y empleados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conteos Generales</CardTitle>
          <CardDescription>Evolución de vehículos y empleados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No hay datos disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card w-full">
      <CardHeader className="border-b">
        <div className="grid gap-1">
          <CardTitle>Conteos Generales</CardTitle>
          <CardDescription>Evolución de vehículos y empleados</CardDescription>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | '1y')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 3 meses</SelectItem>
                <SelectItem value="1y">Último año</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from && range?.to
                    ? `${format(range.from, 'dd/MM/yyyy', { locale: es })} - ${format(range.to, 'dd/MM/yyyy', { locale: es })}`
                    : 'Seleccionar rango'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="end">
                <Calendar
                  className="w-full"
                  mode="range"
                  defaultMonth={range?.from}
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={filteredData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              tickFormatter={(value) => {
                const date = new Date(value);
                return format(date, 'dd/MM', { locale: es });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return format(new Date(value), 'dd/MM/yyyy', { locale: es });
                  }}
                />
              }
            />
            <Line
              dataKey="total-count"
              type="monotone"
              stroke={`var(--color-total-count)`}
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="vehicle-count"
              type="monotone"
              stroke={`var(--color-vehicle-count)`}
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="employee-count"
              type="monotone"
              stroke={`var(--color-employee-count)`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t">
        <div className="text-sm">
          Promedio del período: <span className="font-semibold">{totals.total}</span> total,{' '}
          <span className="font-semibold">{totals.vehicles}</span> vehículos,{' '}
          <span className="font-semibold">{totals.employees}</span> empleados.
        </div>
      </CardFooter>
    </Card>
  );
}
