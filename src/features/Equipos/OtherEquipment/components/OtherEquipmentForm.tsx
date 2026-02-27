'use client';

import { fetchAllContractorForVehicles } from '@/app/dashboard/employee/action/actions/actions';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import {
  getModelsByBrand,
  getSubTypesByType,
  getVehicleBrands,
  getVehicleOwners,
  getVehicleTypes,
} from '@/features/Equipos/EquipoID/lib/actions/vehicle-catalog-actions';
import {
  createOtherEquipment,
  updateOtherEquipment,
  type OtherEquipmentDetail,
} from '@/features/Equipos/OtherEquipment/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import moment from 'moment';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { OtherEquipmentTabs } from './OtherEquipmentTabs';

const logger = new Logger('OtherEquipmentForm');

// ─── Schema de validación ─────────────────────────────────────────────────────

const otherEquipmentSchema = z.object({
  type_id: z.string().min(1, 'El tipo es requerido'),
  sub_type_id: z.string().nullable().optional(),
  brand_id: z.string().nullable().optional(),
  model_id: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  intern_number: z.string().nullable().optional(),
  year: z.string().nullable().optional(),
  condition: z
    .enum(['operativo', 'no operativo', 'en reparacion', 'operativo condicionado', 'en preparacion'])
    .nullable()
    .optional(),
  horometer: z.coerce.number().nullable().optional(),
  manufacturer_plate: z.string().nullable().optional(),
  composition: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  initial_value: z.coerce.number().nullable().optional(),
  currency: z.enum(['USD', 'ARS']).nullable().optional(),
  purchase_date: z.date().nullable().optional(),
  owner_id: z.string().nullable().optional(),
  linked_vehicle_id: z.string().nullable().optional(),
  // Campos de asignación
  cost_center_id: z.string().nullable().optional(),
  cost_type: z.enum(['Directo', 'Indirecto']).nullable().optional(),
  sector: z.string().nullable().optional(),
  contractors: z.array(z.string()).optional(),
});

export type OtherEquipmentFormData = z.infer<typeof otherEquipmentSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface OtherEquipmentFormProps {
  equipment?: OtherEquipmentDetail | null;
  mode: 'view' | 'edit' | 'new';
  equipmentId?: string;
  brandsPromise: ReturnType<typeof getVehicleBrands>;
  modelsPromise: ReturnType<typeof getModelsByBrand>;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
  ownersPromise: ReturnType<typeof getVehicleOwners>;
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  hierarchicalPositionsPromise: Promise<Array<{ id: string; name: string }>>;
  vehiclesPromise: Promise<Array<{ id: string; domain: string | null }>>;
  certificationsComponent?: React.ReactNode;
  qrComponent?: React.ReactNode;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function OtherEquipmentForm({ equipment, mode, equipmentId, ...otherProps }: OtherEquipmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const readOnly = mode === 'view';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const form = useForm<OtherEquipmentFormData>({
    resolver: zodResolver(otherEquipmentSchema),
    defaultValues: {
      type_id: equipment?.type?.id ?? '',
      sub_type_id: equipment?.sub_type?.id ?? null,
      brand_id: equipment?.brand_vehicles?.id?.toString() ?? null,
      model_id: equipment?.model_vehicles?.id?.toString() ?? null,
      serial_number: equipment?.serial_number ?? null,
      intern_number: equipment?.intern_number ?? null,
      year: equipment?.year ?? null,
      condition: (equipment?.condition as OtherEquipmentFormData['condition']) ?? null,
      horometer: equipment?.horometer ?? null,
      manufacturer_plate: equipment?.manufacturer_plate ?? null,
      composition: equipment?.composition ?? null,
      invoice_number: equipment?.invoice_number ?? null,
      initial_value: equipment?.initial_value ?? null,
      currency: (equipment?.currency as OtherEquipmentFormData['currency']) ?? 'ARS',
      purchase_date: equipment?.purchase_date ? moment(equipment.purchase_date).toDate() : null,
      owner_id: equipment?.equipment_owners?.id?.toString() ?? null,
      linked_vehicle_id: equipment?.vehicles?.id ?? null,
      cost_center_id: equipment?.cost_center?.id ?? null,
      cost_type: (equipment?.cost_type as OtherEquipmentFormData['cost_type']) ?? null,
      sector: equipment?.hierarchy?.id ?? null,
      contractors: (equipment?.contractors as string[]) ?? [],
    },
  });

  const onSubmit = async (data: OtherEquipmentFormData) => {
    setIsSubmitting(true);
    let createdId: string | undefined;

    try {
      if (mode === 'new') {
        const result = await createOtherEquipment({
          type_id: data.type_id,
          sub_type_id: data.sub_type_id ?? null,
          brand_id: data.brand_id ? parseInt(data.brand_id, 10) : null,
          model_id: data.model_id ? parseInt(data.model_id, 10) : null,
          serial_number: data.serial_number ?? null,
          intern_number: data.intern_number ?? null,
          year: data.year ?? null,
          condition: data.condition ?? null,
          horometer: data.horometer ?? null,
          manufacturer_plate: data.manufacturer_plate ?? null,
          composition: data.composition ?? null,
          invoice_number: data.invoice_number ?? null,
          initial_value: data.initial_value ?? null,
          currency: data.currency ?? null,
          purchase_date: data.purchase_date ? moment(data.purchase_date).format('YYYY-MM-DD') : null,
          owner_id: data.owner_id ?? null,
          linked_vehicle_id: data.linked_vehicle_id ?? null,
          cost_center_id: data.cost_center_id ?? null,
          cost_type: data.cost_type ?? null,
          sector: data.sector ?? null,
          contractors: data.contractors ?? [],
        });
        createdId = result?.id;
        toast.success('Equipo creado correctamente');
      } else {
        await updateOtherEquipment(equipmentId!, {
          type_id: data.type_id,
          sub_type_id: data.sub_type_id ?? null,
          brand_id: data.brand_id ? parseInt(data.brand_id, 10) : null,
          model_id: data.model_id ? parseInt(data.model_id, 10) : null,
          serial_number: data.serial_number ?? null,
          intern_number: data.intern_number ?? null,
          year: data.year ?? null,
          condition: data.condition ?? null,
          horometer: data.horometer ?? null,
          manufacturer_plate: data.manufacturer_plate ?? null,
          composition: data.composition ?? null,
          invoice_number: data.invoice_number ?? null,
          initial_value: data.initial_value ?? null,
          currency: data.currency ?? null,
          purchase_date: data.purchase_date ? moment(data.purchase_date).format('YYYY-MM-DD') : null,
          owner_id: data.owner_id ?? null,
          linked_vehicle_id: data.linked_vehicle_id ?? null,
          cost_center_id: data.cost_center_id ?? null,
          cost_type: data.cost_type ?? null,
          sector: data.sector ?? null,
          contractors: data.contractors ?? [],
        });
        toast.success('Equipo actualizado correctamente');
      }

      refreshAfterSave(createdId);
    } catch (error) {
      logger.error('Error al guardar other equipment', { data: { error } });
      toast.error(mode === 'new' ? 'Error al crear el equipo' : 'Error al actualizar el equipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshAfterSave = (createdId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('action', 'view');
    params.set('type', 'other');

    if (createdId) {
      params.set('id', createdId);
    }

    router.refresh();
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <OtherEquipmentTabs equipment={equipment} mode={mode} equipmentId={equipmentId} form={form} {...otherProps} />

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
      </form>
    </Form>
  );
}
