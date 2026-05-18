'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { getMaintenanceCategoryVehicles } from '../actions/actions.server';
import type { MaintenanceTypeOption, OwnershipCategory } from '../types';
import { EquipmentRow } from './EquipmentRow';

interface CategorySectionProps {
  category: OwnershipCategory;
  monthKey: string;
  totalCount: number;
  types: MaintenanceTypeOption[];
  selectedTypeIds: string[];
  onTypeFilterChange: (values: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysElapsed: number;
}

/**
 * Skeleton de una fila — replica fielmente el layout de EquipmentRow
 * (borde lateral + icono + info + chip de estado + barra + count) para que
 * el loading se sienta como contenido inminente y no como vacio generico.
 */
function EquipmentRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b last:border-b-0 border-l-4 border-l-muted">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="hidden md:block h-7 w-[140px] shrink-0 rounded-full" />
      <Skeleton className="md:hidden h-7 w-7 shrink-0 rounded-full" />
      <Skeleton className="hidden sm:block h-2 w-[180px] shrink-0 rounded-full" />
      <div className="text-right shrink-0 w-[88px] space-y-1">
        <Skeleton className="h-4 w-14 ml-auto" />
        <Skeleton className="h-2.5 w-8 ml-auto" />
      </div>
    </div>
  );
}

export function CategorySection({
  category,
  monthKey,
  totalCount,
  types,
  selectedTypeIds,
  onTypeFilterChange,
  open,
  onOpenChange,
  daysElapsed,
}: CategorySectionProps) {
  // Lazy fetch: solo dispara la query cuando el acordeon esta abierto.
  // Cachea por monthKey+category — reabrir es instantaneo dentro del staleTime.
  const { data: vehicles, isLoading, isError, refetch } = useQuery({
    queryKey: ['mantenimiento-vehicles', monthKey, category],
    queryFn: () => getMaintenanceCategoryVehicles(monthKey, category),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const filteredVehicles = React.useMemo(() => {
    if (!vehicles) return [];
    if (selectedTypeIds.length === 0) return vehicles;
    return vehicles.filter((v) => v.typeId !== null && selectedTypeIds.includes(v.typeId));
  }, [vehicles, selectedTypeIds]);

  const totalDaysWorked = filteredVehicles.reduce((sum, v) => sum + Math.min(v.workedDays, daysElapsed), 0);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} asChild>
      <Card className="py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-6 py-3 border-b">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 gap-2 px-2 hover:bg-transparent group"
              aria-label={`${open ? 'Contraer' : 'Expandir'} ${category}`}
            >
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
              />
              <span className="text-base font-semibold">{category}</span>
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {open && vehicles
                  ? selectedTypeIds.length > 0
                    ? `${filteredVehicles.length} / ${vehicles.length}`
                    : vehicles.length
                  : totalCount}
              </Badge>
              {open && vehicles && daysElapsed > 0 && filteredVehicles.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground hidden md:inline">
                  Total: {totalDaysWorked} días trabajados
                </span>
              )}
            </Button>
          </CollapsibleTrigger>

          <div className="w-[220px]" onClick={(e) => e.stopPropagation()}>
            <MultiSelectCombobox
              options={types.map((t) => ({ label: t.name, value: t.id }))}
              placeholder={types.length === 0 ? 'Sin tipos' : 'Todos los tipos'}
              emptyMessage="No hay tipos disponibles"
              selectedValues={selectedTypeIds}
              onChange={onTypeFilterChange}
              disabled={types.length === 0 || !open}
              showSelectAll
            />
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0">
            {isError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-8 text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p>No se pudieron cargar los equipos.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : isLoading || !vehicles ? (
              <>
                {Array.from({ length: Math.max(3, Math.min(totalCount, 5)) }).map((_, i) => (
                  <EquipmentRowSkeleton key={i} />
                ))}
              </>
            ) : vehicles.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No hay equipos en esta categoría.
              </p>
            ) : filteredVehicles.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Ningún equipo coincide con el filtro de tipo seleccionado.
              </p>
            ) : (
              filteredVehicles.map((vehicle) => (
                <EquipmentRow key={vehicle.id} vehicle={vehicle} daysElapsed={daysElapsed} />
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
