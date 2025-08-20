'use client';
import { fetchAllContractorForVehicles } from '@/app/dashboard/employee/action/actions/actions';
import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createVehicle, updateVehicle } from '../lib/actions/vehicle-actions';
import {
  getModelsByBrand,
  getSubTypesByType,
  getTypesOfVehicles,
  getVehicleBrands,
  getVehicleTypes,
} from '../lib/actions/vehicle-catalog-actions';
import { useVehicleFormReset } from '../lib/store/vehicleFormReset';
import { VehicleFormData, VehicleTabs } from './vehicle-tabs';

interface VehicleFormProps {
  vehicle?: VehicleById;
  mode: 'view' | 'edit' | 'new';
  vehicleId?: string;
  brandsPromise: ReturnType<typeof getVehicleBrands>;
  modelsPromise: ReturnType<typeof getModelsByBrand>;
  typesOfVehiclesPromise: ReturnType<typeof getTypesOfVehicles>;
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  documentsComponent?: React.ReactNode;
  repairsComponent?: React.ReactNode;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
}

const vehicleSchema = z.object({
  // Basic Data
  type_of_vehicle: z.string().min(1, 'El tipo de equipo es requerido'),
  brand: z.string().min(1, 'La marca es requerida'),
  model: z.string().min(1, 'El modelo es requerido'),
  year: z
    .string()
    .min(1, 'El año es requerido')
    .refine(
      (year) => {
        const yearNum = Number(year);
        const currentYear = new Date().getFullYear();
        return yearNum >= 1900 && yearNum <= currentYear;
      },
      { message: 'El año debe ser mayor a 1900 y menor al año actual' }
    ),

  // Technical Data
  engine: z.string().optional(),
  type: z.string().optional(),
  subType: z.string().optional(),
  chassis: z.string().optional(),
  serie: z.string().optional(),
  domain: z.string().optional(),
  kilometer: z.string().optional(),
  intern_number: z.string().optional(),
  picture: z.string().optional(),

  // Assignment Data
  allocated_to: z.array(z.string()).optional(),
  cost_center_id: z.string().optional(),
});

export function VehicleForm({ vehicle, mode, vehicleId, ...otherProps }: VehicleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const readOnly = mode === 'view';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resetTrigger } = useVehicleFormReset();

  const onSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true);
    let createdVehicleId;
    try {
      if (mode === 'new') {
        const result = await createVehicle(data);
        if (result?.id) {
          createdVehicleId = result.id;
        }
        toast.success('Equipo creado correctamente');
      } else {
        await updateVehicle(vehicleId!, data);
        toast.success('Equipo actualizado correctamente');
      }
      refresh(createdVehicleId);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(mode === 'new' ? 'Error al crear el equipo' : 'Error al actualizar el equipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log(vehicle, 'ajpra aqio');

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      type_of_vehicle: vehicle?.types_of_vehicles?.id?.toString() || '',
      brand: vehicle?.brand_vehicles?.id?.toString() || '',
      model: vehicle?.model_vehicles?.id?.toString() || '',
      year: vehicle?.year || '',
      engine: vehicle?.engine || '',
      type: vehicle?.type.id || '',
      subType: vehicle?.sub_type?.id || '',
      chassis: vehicle?.chassis || '',
      serie: vehicle?.serie || '',
      domain: vehicle?.domain || '',
      kilometer: vehicle?.kilometer || '',
      intern_number: vehicle?.intern_number || '',
      picture: vehicle?.picture || '',
      allocated_to: vehicle?.allocated_to || [],
      cost_center_id: vehicle?.cost_center_id || '',
    },
  });

  useEffect(() => {
    if (resetTrigger > 0) {
      form.reset();
    }
  }, [resetTrigger]);

  const refresh = (createdVehicleId?: string | undefined) => {
    if (!createdVehicleId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('action', 'view');
      router.refresh();
      router.push(`${pathname}?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set('action', 'view');
      params.set('vehicle_id', createdVehicleId.toString());
      router.refresh();
      router.push(`${pathname}?${params.toString()}`);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        {/* Aquí irá VehicleTabs como children */}
        <VehicleTabs vehicle={vehicle} mode={mode} vehicleId={vehicleId} form={form} {...otherProps} />

        {/* Botón de envío visible en todas las tabs del formulario */}
        {
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-fit">
                  {!readOnly && (
                    <Button type="submit" className="mt-5 ml-2" disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : mode === 'new' ? 'Agregar equipo' : 'Guardar cambios'}
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                {form.formState.isValid ? '¡Todo listo para guardar!' : 'Completa todos los campos requeridos'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      </form>
    </Form>
  );
}
