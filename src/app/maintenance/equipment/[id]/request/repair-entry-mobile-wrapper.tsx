'use client';

import type { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import RepairNewEntry from '@/components/Tipos_de_reparaciones/RepairEntry';
import type { fetchMaintenanceGroupsActionType } from '@/components/Tipos_de_reparaciones/actions/maintenanceGroupActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TypeOfRepair } from '@/types/types';
import type { VisibilityState } from '@tanstack/react-table';
import Image from 'next/image';
import { FiTool } from 'react-icons/fi';

interface RepairEntryMobileWrapperProps {
  equipmentId: string;
  user_id?: string;
  equipment: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>;
  tipo_de_mantenimiento: TypeOfRepair;
  maintenance_groups: NonNullable<fetchMaintenanceGroupsActionType['groups']>;
  default_equipment_id?: string;
  employee_id?: string;
  savedVisibility: VisibilityState;
  savedFilters: string[];
  vehicle: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>[0] | undefined;
}

// Componente para mostrar las reparaciones en mobile sin accordion
function MobileRepairCard({
  repair,
  repairType,
  onEditDetails,
  onDelete,
  hasDescription,
  imageCount,
}: {
  repair: any;
  repairType: TypeOfRepair[0] | undefined;
  onEditDetails: () => void;
  onDelete: () => void;
  hasDescription: boolean;
  imageCount: number;
}) {
  const criticidad = [
    { value: 'Alta', icon: FiTool, color: 'destructive' },
    { value: 'Media', icon: FiTool, color: 'yellow' },
    { value: 'Baja', icon: FiTool, color: 'success' },
  ];

  const priority = criticidad.find((p) => p.value === repairType?.criticity);
  const badgeVariant =
    repairType?.criticity === 'Baja'
      ? 'success'
      : repairType?.criticity === 'Media'
        ? 'yellow'
        : ('destructive' as
            | 'success'
            | 'default'
            | 'destructive'
            | 'outline'
            | 'secondary'
            | 'yellow'
            | 'red'
            | null
            | undefined);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-2">{repairType?.name}</CardTitle>
            <Badge variant={badgeVariant} className="mt-2 font-medium">
              {priority?.icon && <priority.icon className="mr-1.5 h-3.5 w-3.5" />}
              {repairType?.criticity}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Información siempre visible */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FiTool className="h-4 w-4 shrink-0" />
            <span>Tipo: {repairType?.type_of_maintenance || '-'}</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onEditDetails} className="w-full">
            {hasDescription ? 'Editar detalles' : 'Agregar detalles'}
          </Button>

          {/* Indicadores de estado */}
          {(hasDescription || imageCount > 0) && (
            <div className="flex gap-2 flex-wrap">
              {hasDescription && (
                <Badge variant="success" className="text-xs">
                  ✓ Descripción
                </Badge>
              )}
              {imageCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {imageCount} imagen{imageCount > 1 ? 'es' : ''}
                </Badge>
              )}
            </div>
          )}

          <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RepairEntryMobileWrapper({ equipmentId, vehicle, ...props }: RepairEntryMobileWrapperProps) {
  // Este componente envuelve RepairNewEntry pero necesitamos acceso a los estados internos
  // Por ahora, vamos a modificar directamente el componente para que sea más mobile-friendly
  // cuando se usa desde el contexto de mantenimiento

  return (
    <div className="space-y-4">
      {/* Card simplificada del vehículo - solo en mobile */}
      {vehicle && (
        <Card className="sm:hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {vehicle.picture && (
                <div className="relative w-20 h-20 rounded-md overflow-hidden shrink-0">
                  <Image
                    src={vehicle.picture}
                    alt={`Vehicle ${vehicle.domain || vehicle.serie}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{vehicle.domain || vehicle.serie || 'Sin identificador'}</p>
                <p className="text-xs text-muted-foreground mt-1">{vehicle.types_of_vehicles?.name || ''}</p>
                {vehicle.kilometer && <p className="text-xs text-muted-foreground">{vehicle.kilometer} km</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Componente principal con modificaciones */}
      <RepairNewEntry {...props} limittedEquipment={true} />
    </div>
  );
}
