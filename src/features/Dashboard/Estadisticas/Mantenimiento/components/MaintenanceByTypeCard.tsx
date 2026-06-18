'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, Wrench } from 'lucide-react';
import * as React from 'react';
import { getMaintenanceByTypeForMonth } from '../actions/actions.server';
import type { VehicleStatus } from '../types';

const STATUS_LABELS: Record<VehicleStatus, string> = {
  operativo: 'Operativo',
  operativo_condicionado: 'Operativo condicionado',
  en_preparacion: 'En preparación',
  no_operativo: 'No operativo',
  en_reparacion: 'En reparación',
};

/** Formatea un valor numerico-en-string (km/hs) con separador de miles. */
function fmtNum(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('es-AR') : value;
}

interface Props {
  monthKey: string;
  monthLabel: string;
}

/**
 * Equipos en mantenimiento agrupados por TIPO de equipo, para el mes seleccionado
 * (ticket 233). Cuenta dominios unicos que entraron a taller en el mes y permite
 * filtrar tipos y hacer drill-down a la lista de equipos con sus solicitudes
 * abiertas. Comparte la navegacion de mes del reporte via la prop monthKey; el
 * padre lo remonta con key={monthKey} para resetear seleccion al cambiar de mes.
 */
export function MaintenanceByTypeCard({ monthKey, monthLabel }: Props) {
  const { data, isFetching } = useQuery({
    queryKey: ['mantenimiento-by-type', monthKey],
    queryFn: () => getMaintenanceByTypeForMonth(monthKey),
    staleTime: 5 * 60 * 1000,
  });

  const groups = React.useMemo(() => data ?? [], [data]);
  const [selectedTypeIds, setSelectedTypeIds] = React.useState<string[]>([]);
  const [expandedType, setExpandedType] = React.useState<string | null>(null);

  const typeOptions = React.useMemo(() => groups.map((g) => ({ label: g.typeName, value: g.typeId })), [groups]);

  const visible = React.useMemo(
    () => (selectedTypeIds.length > 0 ? groups.filter((g) => selectedTypeIds.includes(g.typeId)) : groups),
    [groups, selectedTypeIds]
  );

  const total = React.useMemo(() => groups.reduce((s, g) => s + g.count, 0), [groups]);
  const maxCount = React.useMemo(() => Math.max(1, ...visible.map((g) => g.count)), [visible]);

  const isEmpty = !isFetching && groups.length === 0;

  return (
    <Card className="py-0">
      <CardHeader className="px-6 pt-4 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Equipos en mantenimiento por tipo
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {total} {total === 1 ? 'equipo único' : 'equipos únicos'} en taller · {monthLabel}
            </CardDescription>
          </div>
          {typeOptions.length > 0 && (
            <div className="sm:w-[210px]">
              <MultiSelectCombobox
                options={typeOptions}
                placeholder="Todos los tipos"
                emptyMessage="No hay tipos"
                selectedValues={selectedTypeIds}
                onChange={setSelectedTypeIds}
                showSelectAll
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-4 sm:px-6">
        {isEmpty ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-5 w-5 opacity-40" />
            Sin equipos en mantenimiento este período
          </div>
        ) : (
          <div className="space-y-0.5">
            {visible.map((g) => {
              const isOpen = expandedType === g.typeId;
              const pct = (g.count / maxCount) * 100;
              return (
                <div key={g.typeId}>
                  {/* Fila-barra clickeable */}
                  <button
                    type="button"
                    onClick={() => setExpandedType(isOpen ? null : g.typeId)}
                    aria-expanded={isOpen}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60',
                      isOpen && 'bg-muted/60'
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-90'
                      )}
                    />
                    <span className="w-28 shrink-0 truncate text-sm font-medium sm:w-36" title={g.typeName}>
                      {g.typeName}
                    </span>
                    <span className="relative h-5 flex-1 overflow-hidden rounded-md bg-muted">
                      <span
                        className="absolute inset-y-0 left-0 rounded-md bg-primary/80 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums">{g.count}</span>
                  </button>

                  {/* Drill-down: equipos del tipo */}
                  {isOpen && (
                    <div className="mt-1 mb-2 ml-7 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {g.vehicles.map((v) => (
                        <Tooltip key={v.id}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-sm transition-colors hover:border-border hover:bg-muted/40">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="font-mono font-medium">{v.domain ?? '—'}</span>
                                {v.internNumber && (
                                  <span className="truncate text-xs text-muted-foreground">#{v.internNumber}</span>
                                )}
                              </span>
                              {v.openCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 border-amber-300 tabular-nums text-amber-600 dark:border-amber-700 dark:text-amber-400"
                                >
                                  {v.openCount} {v.openCount === 1 ? 'abierta' : 'abiertas'}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                {v.domain ?? 'Sin dominio'}
                                {v.internNumber ? ` · #${v.internNumber}` : ''}
                              </p>
                              <p>Estado: {STATUS_LABELS[v.status]}</p>
                              {v.kilometer != null && <p>Km: {fmtNum(v.kilometer)}</p>}
                              {v.engineHours != null && <p>Hs: {fmtNum(v.engineHours)}</p>}
                              <p>Solicitudes abiertas: {v.openCount}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
