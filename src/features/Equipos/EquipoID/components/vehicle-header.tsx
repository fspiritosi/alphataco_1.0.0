'use client';

import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { conditionConfig, variants } from '@/app/dashboard/equipment/data-equipment-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PermissionGuard } from '@/features/Permissions';
import BackButton from '@/shared/components/common/BackButton';
import { CheckCircle2, Edit, Truck } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { updateEquipmentCondition } from '../lib/actions/vehicle-actions';
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
  const [isChangingCondition, setIsChangingCondition] = useState(false);

  // El valor de condition viene de Supabase con espacios ("en preparacion")
  const isEnPreparacion = vehicle?.condition === 'en preparacion';

  const handleConditionChange = async (newCondition: string) => {
    if (!vehicle?.id || newCondition !== 'operativo') return;
    setIsChangingCondition(true);
    try {
      await updateEquipmentCondition(vehicle.id, 'operativo', 'vehicles');
      toast.success('Equipo actualizado a Operativo');
      router.refresh();
    } catch {
      toast.error('Error al actualizar la condición');
    } finally {
      setIsChangingCondition(false);
    }
  };

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
                  {isEnPreparacion ? (
                    <PermissionGuard module="equipos" tab="detalle-equipo" action="update">
                      <Select
                        value="en preparacion"
                        onValueChange={handleConditionChange}
                        disabled={isChangingCondition}
                      >
                        <SelectTrigger className="h-7 w-auto gap-1 text-xs font-semibold border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en preparacion" disabled>
                            <div className="flex items-center gap-1.5">
                              {React.createElement(conditionConfig['en preparacion']?.icon, {
                                className: 'size-3.5',
                              })}
                              En preparación
                            </div>
                          </SelectItem>
                          <SelectItem value="operativo">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-green-600" />
                              Operativo
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </PermissionGuard>
                  ) : (
                    <Badge variant={variants[vehicle?.condition ?? 'default'] as 'default'}>
                      {vehicle?.condition &&
                        conditionConfig[vehicle.condition] &&
                        React.createElement(conditionConfig[vehicle.condition].icon, {
                          className: 'mr-2 size-4',
                        })}
                      {vehicle?.condition}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  {mode === 'view' && (
                    <PermissionGuard module="equipos" tab="detalle-equipo" action="update">
                      <Button onClick={handleEdit} size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </PermissionGuard>
                  )}
                  {mode === 'edit' && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>

                <PermissionGuard module="equipos" tab="detalle-equipo" action="update">
                  <VehicleQuickActions
                    condition={vehicle?.condition!}
                    equipmentId={vehicle?.id}
                    isActive={vehicle?.is_active!}
                  />
                </PermissionGuard>
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
        {!vehicle?.is_active && (
          <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              {vehicle?.termination_date && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Fecha de Baja:</p>
                  <p className="font-medium">{new Date(vehicle.termination_date).toLocaleDateString()}</p>
                </div>
              )}
              {vehicle?.reason_for_termination && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Razón de Baja:</p>
                  <p className="font-medium">{vehicle.reason_for_termination}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
