'use client';

import BackButton from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { updateEquipmentCondition } from '@/features/Equipos/EquipoID/lib/actions/vehicle-actions';
import type { OtherEquipmentDetail } from '@/features/Equipos/OtherEquipment/actions/actionsServer';
import { PermissionGuard } from '@/features/Permissions';
import { CheckCircle2, Clock, Edit, Package } from 'lucide-react';
import moment from 'moment';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { OtherEquipmentQuickActions } from './OtherEquipmentQuickActions';

interface OtherEquipmentHeaderProps {
  equipment: OtherEquipmentDetail;
  mode: 'view' | 'edit' | 'new';
}

export function OtherEquipmentHeader({ equipment, mode }: OtherEquipmentHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingCondition, setIsChangingCondition] = useState(false);

  // El valor de condition viene de Supabase con espacios ("en preparacion")
  const isEnPreparacion = equipment?.condition === 'en preparacion';

  const handleConditionChange = async (newCondition: string) => {
    if (!equipment?.id || newCondition !== 'operativo') return;
    setIsChangingCondition(true);
    try {
      await updateEquipmentCondition(equipment.id, 'operativo', 'other_equipment');
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
  };

  // Título principal: número de serie o número interno
  const equipmentTitle = equipment?.serial_number || equipment?.intern_number || 'Equipo sin identificador';

  return (
    <div className="w-full">
      <CardContent className="p-2">
        <div className="flex items-start gap-6">
          {/* Ícono del equipo */}
          <div className="flex-shrink-0">
            <div className="size-28 bg-muted rounded-lg flex items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>

          {/* Información del equipo */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{equipmentTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  {equipment?.type?.name || 'Sin tipo'}
                  {equipment?.sub_type?.name ? ` / ${equipment.sub_type.name}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  {mode === 'view' && (
                    <PermissionGuard module="equipos" tab="detalle-otro-equipo" action="update">
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

                <PermissionGuard module="equipos" tab="detalle-otro-equipo" action="update">
                  <OtherEquipmentQuickActions equipmentId={equipment?.id} isActive={equipment?.is_active ?? false} />
                </PermissionGuard>

                <Separator orientation="vertical" className="w-[1px] h-10 my-0" />

                <div className="flex items-center justify-end gap-4">
                  <BackButton size="sm" />
                </div>
              </div>
            </div>

            {/* Campos de resumen */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Año</p>
                <p className="font-medium">{equipment?.year || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">N° Serie</p>
                <p className="font-medium">{equipment?.serial_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">N° Interno</p>
                <p className="font-medium">{equipment?.intern_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Condición</p>
                {isEnPreparacion ? (
                  <PermissionGuard module="equipos" tab="detalle-otro-equipo" action="update">
                    <Select
                      value="en preparacion"
                      onValueChange={handleConditionChange}
                      disabled={isChangingCondition}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 text-xs font-semibold border-dashed mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en preparacion" disabled>
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5" />
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
                  <p className="font-medium capitalize">{equipment?.condition || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={equipment?.is_active ? 'success' : 'destructive'} className="font-medium">
                  {equipment?.is_active ? 'Activo' : 'Dado de Baja'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Información de baja (solo si está inactivo) */}
        {!equipment?.is_active && (
          <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              {equipment?.termination_date && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Fecha de Baja:</p>
                  <p className="font-medium">{moment(equipment.termination_date).format('DD/MM/YYYY')}</p>
                </div>
              )}
              {equipment?.reason_for_termination && (
                <div className="flex gap-2 text-red-400">
                  <p className="font-medium">Razón de Baja:</p>
                  <p className="font-medium capitalize">{equipment.reason_for_termination}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
