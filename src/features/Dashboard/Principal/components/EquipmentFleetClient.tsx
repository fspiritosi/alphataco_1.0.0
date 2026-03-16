'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import dynamic from 'next/dynamic';
import * as React from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import { RadialGauge } from '../shared/RadialGauge';

const VehiclesOnRepairDialog = dynamic(() => import('./VehiclesOnRepairDialog'), {
  ssr: false,
});

interface Props {
  totalActive: number;
  totalNotAvailable: number;
  totalInUse: number;
  totalFleet: number;
  availabilityPercent: number;
  usagePercent: number;
  // Motor unit metrics (Chasis & Tractor)
  motorActive: number;
  motorInUse: number;
  motorNotAvailable: number;
  motorFleet: number;
  motorAvailabilityPercent: number;
  motorUsagePercent: number;
}

function DonutWithCenter({
  data,
  config,
  centerValue,
  centerLabel,
}: {
  data: { name: string; value: number; fill: string }[];
  config: ChartConfig;
  centerValue: number;
  centerLabel: string;
}) {
  return (
    <ChartContainer config={config} className="mx-auto aspect-square w-full max-h-[160px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} strokeWidth={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                      {centerValue}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 16} className="fill-muted-foreground text-[10px]">
                      {centerLabel}
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export const EquipmentFleetClient = React.memo(function EquipmentFleetClient({
  totalActive,
  totalNotAvailable,
  totalInUse,
  totalFleet,
  availabilityPercent,
  usagePercent,
  motorActive,
  motorInUse,
  motorNotAvailable,
  motorFleet,
  motorAvailabilityPercent,
  motorUsagePercent,
}: Props) {
  const [repairDialogOpen, setRepairDialogOpen] = React.useState(false);

  const availabilityConfig = React.useMemo<ChartConfig>(
    () => ({
      disponibles: { label: 'Operativos', color: 'var(--chart-2)' },
      noDisponibles: { label: 'No disponibles', color: 'var(--chart-1)' },
    }),
    []
  );

  const availabilityData = React.useMemo(
    () => [
      { name: 'Operativos', value: totalActive, fill: 'var(--chart-2)' },
      { name: 'No disponibles', value: totalNotAvailable, fill: 'var(--chart-1)' },
    ],
    [totalActive, totalNotAvailable]
  );

  const usageConfig = React.useMemo<ChartConfig>(
    () => ({
      enUso: { label: 'En Operaciones', color: 'var(--chart-5)' },
      sinUsar: { label: 'Disponible / Sin asignar', color: 'var(--chart-4)' },
    }),
    []
  );

  const usageData = React.useMemo(
    () => [
      { name: 'En Operaciones', value: totalInUse, fill: 'var(--chart-5)' },
      { name: 'Disponible / Sin asignar', value: totalActive - totalInUse, fill: 'var(--chart-4)' },
    ],
    [totalInUse, totalActive]
  );

  // Motor units donut data
  const motorAvailabilityConfig = React.useMemo<ChartConfig>(
    () => ({
      disponibles: { label: 'Operativos', color: '#34C759' },
      noDisponibles: { label: 'No disponibles', color: '#e74c3c' },
    }),
    []
  );

  const motorAvailabilityData = React.useMemo(
    () => [
      { name: 'Operativos', value: motorActive, fill: '#34C759' },
      { name: 'No disponibles', value: motorNotAvailable, fill: '#e74c3c' },
    ],
    [motorActive, motorNotAvailable]
  );

  const motorUsageConfig = React.useMemo<ChartConfig>(
    () => ({
      enUso: { label: 'En Operaciones', color: '#3a86ff' },
      disponibles: { label: 'Disponible / Sin asignar', color: '#06d6a0' },
    }),
    []
  );

  const motorUsageData = React.useMemo(
    () => [
      { name: 'En Operaciones', value: motorInUse, fill: '#3a86ff' },
      { name: 'Disponible / Sin asignar', value: motorActive - motorInUse, fill: '#06d6a0' },
    ],
    [motorInUse, motorActive]
  );

  return (
    <>
      <Card>
        <CardHeader className="border-b px-6 py-4">
          <div>
            <CardTitle className="text-base">Equipos — Estado de Flota</CardTitle>
            <CardDescription>Disponibilidad y uso de la flota de vehiculos</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Unidades Motoras (Chasis & Tractor) — primera fila */}
          {motorFleet > 0 && (
            <div className="mb-6 pb-4 border-b">
              <h4 className="text-sm font-medium mb-3">
                Solo Unidades Motoras <span className="text-muted-foreground font-normal">(Chasis & Tractor)</span>
              </h4>
              <div className="grid grid-cols-2 gap-6">
                {/* Motor: Disponibilidad */}
                <div className="flex flex-col items-center gap-2">
                  <DonutWithCenter
                    data={motorAvailabilityData}
                    config={motorAvailabilityConfig}
                    centerValue={motorFleet}
                    centerLabel="Total"
                  />
                  <div className="flex gap-3 justify-center flex-wrap">
                    {motorAvailabilityData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full text-center mt-1">
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold tabular-nums">{motorActive.toLocaleString('es-AR')}</p>
                      <p className="text-[10px] text-muted-foreground">Operativos</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold tabular-nums">{motorNotAvailable.toLocaleString('es-AR')}</p>
                      <p className="text-[10px] text-muted-foreground">En reparacion</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold tabular-nums">{motorFleet.toLocaleString('es-AR')}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <RadialGauge value={motorAvailabilityPercent} label="Indicador de flota" accentColor="#34C759" />
                </div>

                {/* Motor: Uso */}
                <div className="flex flex-col items-center gap-2">
                  <DonutWithCenter
                    data={motorUsageData}
                    config={motorUsageConfig}
                    centerValue={motorActive}
                    centerLabel="Operativos"
                  />
                  <div className="flex gap-3 justify-center flex-wrap">
                    {motorUsageData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full text-center mt-1">
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold tabular-nums">{motorInUse.toLocaleString('es-AR')}</p>
                      <p className="text-[10px] text-muted-foreground">En Operaciones</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold tabular-nums">
                        {(motorActive - motorInUse).toLocaleString('es-AR')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Disponible / Sin asignar</p>
                    </div>
                    <div className="rounded-lg border p-2">
                      <p className="text-lg font-bold tabular-nums">{motorActive.toLocaleString('es-AR')}</p>
                      <p className="text-[10px] text-muted-foreground">Total operativos</p>
                    </div>
                  </div>
                  <RadialGauge value={motorUsagePercent} label="Eficiencia de uso" accentColor="#3a86ff" />
                </div>
              </div>
            </div>
          )}

          {/* Disponibilidad y Uso — segunda fila */}
          <div className="grid grid-cols-2 gap-6">
            {/* Disponibilidad */}
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm font-medium self-start">Disponibilidad — Todos los Equipos</h4>
              <DonutWithCenter
                data={availabilityData}
                config={availabilityConfig}
                centerValue={totalFleet}
                centerLabel="Flota"
              />
              <div className="flex gap-3 justify-center flex-wrap">
                {availabilityData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
              {/* Key stats inline */}
              <div className="grid grid-cols-3 gap-2 w-full text-center mt-1">
                <div className="rounded-lg border p-2">
                  <p className="text-lg font-bold tabular-nums">{totalActive.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">Operativos</p>
                </div>
                <button
                  type="button"
                  onClick={totalNotAvailable > 0 ? () => setRepairDialogOpen(true) : undefined}
                  className="rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-lg font-bold tabular-nums">{totalNotAvailable.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">En reparacion</p>
                </button>
                <div className="rounded-lg border p-2">
                  <p className="text-lg font-bold tabular-nums">{totalFleet.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">Total flota</p>
                </div>
              </div>
              <RadialGauge value={availabilityPercent} label="Disponibilidad" accentColor="var(--chart-2)" />
            </div>

            {/* Uso */}
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm font-medium self-start">Uso — Todos los Equipos</h4>
              <DonutWithCenter
                data={usageData}
                config={usageConfig}
                centerValue={totalActive}
                centerLabel="Operativos"
              />
              <div className="flex gap-3 justify-center flex-wrap">
                {usageData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
              {/* Key stats inline */}
              <div className="grid grid-cols-3 gap-2 w-full text-center mt-1">
                <div className="rounded-lg border p-2">
                  <p className="text-lg font-bold tabular-nums">{totalInUse.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">En Operaciones</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-lg font-bold tabular-nums">{(totalActive - totalInUse).toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">Disponible / Sin asignar</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-lg font-bold tabular-nums">{totalActive.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] text-muted-foreground">Operativos</p>
                </div>
              </div>
              <RadialGauge value={usagePercent} label="Uso" accentColor="var(--chart-5)" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4 pt-3 border-t">
            <p className="text-[11px] text-muted-foreground text-center">
              <span className="font-semibold">Disponibilidad</span> = Total de flota − Equipos en reparacion
            </p>
            <p className="text-[11px] text-muted-foreground text-center">
              <span className="font-semibold">Uso</span> = Equipos operativos − Equipos en operaciones
            </p>
          </div>
        </CardContent>
      </Card>

      {repairDialogOpen && (
        <VehiclesOnRepairDialog open={repairDialogOpen} onOpenChange={setRepairDialogOpen} count={totalNotAvailable} />
      )}
    </>
  );
});
