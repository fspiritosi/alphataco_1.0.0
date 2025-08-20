'use client';

import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Edit, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVehicleForm } from '../lib/hooks/use-vehicle-form';
import { VehicleQuickActions } from './vehicle-quick-actions';

interface VehicleHeaderProps {
  vehicle: VehicleById;
  mode: 'view' | 'edit' | 'new';
  onSave?: (data: VehicleById) => Promise<void>;
}

export function VehicleHeader({ vehicle, mode, onSave }: VehicleHeaderProps) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/dashboard/equipment/action?action=edit&id=${vehicle?.id}`);
  };
  const handleCancelEdit = () => {
    router.push(`/dashboard/equipment/action?action=view&id=${vehicle?.id}`);
  };

  const showSaveButton = mode === 'new';
  const { isPending } = useVehicleForm({
    initialData: vehicle,
    onSubmit: async (data) => {
      if (onSave) {
        await onSave(data);
      }
    },
  });
  return (
    <div className="w-full">
      <CardContent className="p-2">
        <div className="flex items-start gap-6">
          {/* Vehicle Image */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 bg-muted rounded-lg flex items-center justify-center">
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
              <div>
                <h1 className="text-2xl font-bold">{vehicle?.domain || 'Nuevo Equipo'}</h1>
                <p className="text-muted-foreground">
                  {vehicle?.brand} {vehicle?.model} {vehicle?.year}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  {showSaveButton && (
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                  )}
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

                <VehicleQuickActions vehicle={vehicle} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{vehicle?.type_of_vehicle || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serie</p>
                <p className="font-medium">{vehicle?.serie || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chasis</p>
                <p className="font-medium">{vehicle?.chassis || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">N° Interno</p>
                <p className="font-medium">{vehicle?.intern_number || '-'}</p>
              </div>
            </div>

            {vehicle?.allocated_to && vehicle.allocated_to.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Asignado a:</p>
                <div className="flex flex-wrap gap-1">
                  {vehicle.contractor_equipment.map((contractor) => (
                    <Badge key={contractor.customers?.id} variant="secondary">
                      {contractor.customers?.name || contractor.customers?.id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
