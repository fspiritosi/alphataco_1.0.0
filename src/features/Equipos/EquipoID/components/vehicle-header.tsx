'use client';

import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { conditionConfig, variants } from '@/app/dashboard/equipment/data-equipment-server';
import BackButton from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Edit, Truck } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { useVehicleFormReset } from '../lib/store/vehicleFormReset';
import { VehicleQuickActions } from './vehicle-quick-actions';

interface VehicleHeaderProps {
  vehicle: VehicleById;
  mode: 'view' | 'edit' | 'new';
  onSave?: (data: VehicleById) => Promise<void>;
}

export function VehicleHeader({ vehicle, mode, onSave }: VehicleHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { triggerReset } = useVehicleFormReset();

  const handleEdit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'edit');
    router.push(`${pathname}?${params.toString()}`);
  };
  const handleCancelEdit = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'view');
    router.push(`${pathname}?${params.toString()}`);
    triggerReset(); // Reset del formulario
  };

  return (
    <div className="w-full">
      <CardContent className="p-2">
        <div className="flex items-start gap-6">
          {/* Vehicle Image */}
          <div className="flex-shrink-0">
            <div className="size-28 bg-muted rounded-lg flex items-center justify-center">
              {vehicle?.picture ? (
                <img
                  src={vehicle.picture || '/placeholder.svg'}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="h-full w-full object-cover rounded-lg"
                />
              ) : (
                <Truck className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div>
                  <h1 className="text-2xl font-bold">{vehicle?.domain || 'Nuevo Equipo'}</h1>
                  <Badge variant={variants[vehicle?.condition ?? 'default'] as 'default'}>
                    {React.createElement(conditionConfig[vehicle?.condition!]?.icon, { className: 'mr-2 size-4' })}{' '}
                    {vehicle?.condition}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  {mode === 'view' && (
                    <Button onClick={handleEdit} size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {mode === 'edit' && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>

                <VehicleQuickActions equipmentId={vehicle?.id} isActive={vehicle?.is_active!} />
                <Separator orientation="vertical" className="w-[1px] h-10 my-0" />

                <div className="flex items-center justify-end gap-4 ">
                  <BackButton size="sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Año</p>
                <p className="font-medium">{vehicle?.year || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{vehicle?.type?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subtipo</p>
                <p className="font-medium">{vehicle?.sub_type?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">N° Interno</p>
                <p className="font-medium">{vehicle?.intern_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={vehicle?.is_active ? 'success' : 'destructive'} className="font-medium">
                  {vehicle?.is_active ? 'Activo' : 'Dado de Baja'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
