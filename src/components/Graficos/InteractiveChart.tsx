'use client';

import { TypeSubTypeFilter } from '@/components/TypeSubTypeFilter';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogHeader } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  YAxis,
} from 'recharts';

const chartConfig = {
  activos: {
    label: 'Activos',
    color: 'var(--chart-5)',
  },
  inactivos: {
    label: 'Fuera de Servicio',
    color: 'var(--chart-1)',
  },
  usados: {
    label: 'Trabajando',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const charts_types = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Lineas' },
  { value: 'area', label: 'Area' },
];

const chartRender = ({ data }: { data: any[] }) => {
  const [chartType, setChartType] = useState('bar');

  const dynamicHeight = useMemo(() => {
    const len = data?.length || 0;
    if (len === 0) return 200;
    return len > 6 ? len * 40 : len * 65;
  }, [data]);

  return (
    <div className="w-full flex flex-col">
      {/* <div className="flex justify-end mb-2">
        <select
          value={chartType}
          onChange={(e) => handleChartTypeChange(e.target.value)}
          className="rounded-md border p-2 text-sm"
        >
          {charts_types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div> */}
      <div>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: dynamicHeight }}>
          {chartType === 'bar' ? (
            <BarChart accessibilityLayer data={data} layout="vertical" margin={{ right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent className="w-[200px]" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="Activos" stackId="a" fill="var(--color-activos)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Fuera de Servicio" stackId="a" fill="var(--color-inactivos)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Trabajando" stackId="a" fill="var(--color-usados)" radius={[0, 2, 2, 0]}>
                <LabelList dataKey="NombreShort" position="right" offset={8} fontSize={12} width={120} />
              </Bar>
              <YAxis
                dataKey="NombreShort"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={60}
                hide
              />
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
                tickFormatter={(value) => String(value).slice(0, 3)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Line
                dataKey="Activos"
                type="natural"
                stroke="var(--color-activos)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-activos)' }}
                activeDot={{ r: 6 }}
              >
                <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
              </Line>
              <Line
                dataKey="Fuera de Servicio"
                type="natural"
                stroke="var(--color-inactivos)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-inactivos)' }}
                activeDot={{ r: 6 }}
              >
                <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
              </Line>
              <Line
                dataKey="Trabajando"
                type="natural"
                stroke="var(--color-usados)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-usados)' }}
                activeDot={{ r: 6 }}
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
              <Radar dataKey="Fuera de Servicio" fill="var(--color-inactivos)" fillOpacity={0.6} />
              <Radar dataKey="Trabajando" fill="var(--color-usados)" fillOpacity={0.6} />
            </RadarChart>
          )}
        </ChartContainer>
      </div>
    </div>
  );
};

export function InteractiveChart({ chartData }: { chartData: any }) {
  const [filters, setFilters] = useState<{ typeIds: string[]; subTypeIds: string[] }>({ typeIds: [], subTypeIds: [] });
  const [displayMode, setDisplayMode] = useState<'types' | 'subtypes'>('types');

  // Update display mode based on filters
  useEffect(() => {
    if (filters.subTypeIds.length > 0) {
      setDisplayMode('subtypes');
    } else {
      setDisplayMode('types');
    }
  }, [filters]);

  const chartDataTransformed = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    let filteredData = chartData;

    // Nueva lógica: mostrar solo lo seleccionado
    if (filters.subTypeIds.length > 0) {
      // Si hay subtipos seleccionados, mostrar solo esos subtipos (agrupados por subtipo)
      const subtypeData = new Map();
      chartData.forEach((item: any) => {
        if (filters.subTypeIds.includes(item.subtype_id?.toString())) {
          const subtypeId = item.subtype_id?.toString();
          if (!subtypeData.has(subtypeId)) {
            subtypeData.set(subtypeId, {
              subtype_id: item.subtype_id,
              subtype_name: item.subtype_name,
              type_id: item.type_id,
              type_name: item.type_name,
              available_units: 0,
              not_available_units: 0,
              used_units: 0,
            });
          }
          const existing = subtypeData.get(subtypeId);
          existing.available_units += item.available_units || 0;
          existing.not_available_units += item.not_available_units || 0;
          existing.used_units += item.used_units || 0;
        }
      });
      filteredData = Array.from(subtypeData.values());
    } else if (filters.typeIds.length > 0) {
      // Si hay tipos seleccionados, mostrar solo esos tipos (agrupados por tipo)
      const typeData = new Map();
      chartData.forEach((item: any) => {
        if (filters.typeIds.includes(item.type_id?.toString())) {
          const typeId = item.type_id?.toString();
          if (!typeData.has(typeId)) {
            typeData.set(typeId, {
              type_id: item.type_id,
              type_name: item.type_name,
              available_units: 0,
              not_available_units: 0,
              used_units: 0,
            });
          }
          const existing = typeData.get(typeId);
          existing.available_units += item.available_units || 0;
          existing.not_available_units += item.not_available_units || 0;
          existing.used_units += item.used_units || 0;
        }
      });
      filteredData = Array.from(typeData.values());
    } else {
      // Por defecto, mostrar los primeros 5 tipos (agrupados)
      const typeData = new Map();
      chartData.forEach((item: any) => {
        const typeId = item.type_id?.toString();
        if (!typeData.has(typeId)) {
          typeData.set(typeId, {
            type_id: item.type_id,
            type_name: item.type_name,
            available_units: 0,
            not_available_units: 0,
            used_units: 0,
          });
        }
        const existing = typeData.get(typeId);
        existing.available_units += item.available_units || 0;
        existing.not_available_units += item.not_available_units || 0;
        existing.used_units += item.used_units || 0;
      });
      filteredData = Array.from(typeData.values()).slice(0, 5);
    }

    return filteredData.map((item: any) => {
      const name: string =
        displayMode === 'subtypes' ? item.subtype_name ?? item.type_name ?? '' : item.type_name ?? '';
      const short = name.length > 24 ? name.substring(0, 24) + '...' : name;
      return {
        Nombre: name,
        NombreShort: short,
        Activos: item.available_units ?? 0,
        'Fuera de Servicio': item.not_available_units ?? 0,
        Trabajando: item.used_units ?? 0,
      };
    });
  }, [chartData, filters, displayMode]);

  const handleFiltersChange = useCallback((newFilters: { typeIds: string[]; subTypeIds: string[] }) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="w-full flex flex-col">
      <Card className="relative w-full flex flex-col">
        <CardHeader className="flex-shrink-0 pb-4">
          <AlertDialog>
            {/* <AlertDialogTrigger className="flex items-end justify-end">
              <Maximize2 />
            </AlertDialogTrigger> */}
            <AlertDialogContent className="max-w-3xl w-full h-[80vh]">
              <AlertDialogHeader>
                <div className="flex items-end justify-end">
                  <AlertDialogCancel className="flex items-end justify-end">X</AlertDialogCancel>
                </div>
              </AlertDialogHeader>
              <div className="w-full overflow-auto">{chartRender({ data: chartDataTransformed })}</div>
            </AlertDialogContent>
          </AlertDialog>
          <CardTitle>Estado de Equipos</CardTitle>
          <CardDescription>
            {displayMode === 'subtypes'
              ? 'Activos, Fuera de Servicio y Trabajando por Subtipo'
              : 'Activos, Fuera de Servicio y Trabajando por Tipo'}
          </CardDescription>

          {/* Filters */}
          <div className="mt-4">
            <TypeSubTypeFilter onFiltersChange={handleFiltersChange} />
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="w-full">{chartRender({ data: chartDataTransformed })}</div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1 text-sm pt-2">
          <div className="leading-none text-muted-foreground">
            {filters.subTypeIds.length > 0
              ? `Se muestran ${filters.subTypeIds.length} subtipo(s) seleccionado(s)`
              : filters.typeIds.length > 0
                ? `Se muestran ${filters.typeIds.length} tipo(s) seleccionado(s)`
                : 'Se muestran los primeros 5 tipos de equipos por defecto'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
