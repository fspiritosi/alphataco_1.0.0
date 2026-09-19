'use client';
import { VehicleById } from '@/app/dashboard/equipment/action/page';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { fetchAllContractorForVehicles } from '@/features/Equipos/EquipoID/actions/vehicle-actions';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { zodResolver } from '@hookform/resolvers/zod';
import moment from 'moment';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createVehicle, updateVehicle } from '../lib/actions/vehicle-actions';
import {
  getModelsByBrand,
  getSubTypesByType,
  getTypesOfVehicles,
  getVehicleBrands,
  getVehicleOwnersType,
  getVehicleTypes,
} from '../lib/actions/vehicle-catalog-actions';
import { useVehicleFormReset } from '../lib/store/vehicleFormReset';
import { VEHICLE_TYPE_OF_VEHICLE_ID } from '../lib/utils/vehicle-utils';
import { VehicleFormData, VehicleTabs } from './vehicle-tabs';

const logger = new Logger('VehicleForm');

interface VehicleFormProps {
  vehicle?: VehicleById;
  mode: 'view' | 'edit' | 'new';
  vehicleId?: string;
  brandsPromise: ReturnType<typeof getVehicleBrands>;
  modelsPromise: ReturnType<typeof getModelsByBrand>;
  typesOfVehiclesPromise: ReturnType<typeof getTypesOfVehicles>;
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  hierarchicalPositionsPromise: Promise<Array<{ id: string; name: string }>>;
  documentsComponent?: React.ReactNode;
  qrComponent?: React.ReactNode;
  checklistsComponent?: React.ReactNode;
  operationsComponent?: React.ReactNode;
  tiresComponent?: React.ReactNode;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
  ownersPromise: Promise<getVehicleOwnersType>;
}

const vehicleSchema = z
  .object({
    // Basic Data
    type_of_vehicle: z.string().min(1, 'El tipo de equipo es requerido'),
    brand: z.string().min(1, 'La marca es requerida'),
    model: z.string().min(1, 'El modelo es requerido'),
    owner_id: z.string().optional().nullable(),
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
    type_of_contract: z.enum(['Leasing', 'Alquiler', 'Propio', 'Prendado']).optional().nullable(),

    // Technical Data
    engine: z.string().optional(),
    type: z.string().optional(),
    subType: z.string().optional().nullable(),
    chassis: z.string().optional(),
    serie: z.string().optional(),
    domain: z.string().optional().nullable(),
    kilometer: z.string().optional(),
    engine_hours: z.string().optional(),
    intern_number: z.string().optional(),
    picture: z.string().optional().nullable(),
    contract_expiration_date: z.date().optional().nullable(),
    contract_start_date: z.date().optional().nullable(),
    contract_number: z.string().optional().nullable(),
    // Certificacion del equipo (ticket 727, idem equipamientos). Los dos datos
    // dependientes son opcionales en la base y se vuelven obligatorios cuando
    // `has_certification` esta en true (ver el superRefine de abajo).
    has_certification: z.boolean().default(false),
    certification_expiration_date: z.date().optional().nullable(),
    certification_number: z.string().optional().nullable(),

    // Assignment Data
    allocated_to: z.array(z.string()).optional(),
    cost_center_id: z.string().optional().nullable(),
    cost_type: z.enum(['Directo', 'Indirecto'], { required_error: 'El tipo de costo es requerido' }),
    sector: z.string({ required_error: 'El sector es requerido' }),

    // Price Data
    price: z.number().positive('El precio debe ser mayor a 0').optional(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'ARS']).optional(),
  })
  .superRefine((data, ctx) => {
    // Si el equipo posee certificacion, sus dos datos son obligatorios (idem equipamientos)
    if (!data.has_certification) return;
    if (!data.certification_expiration_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de vencimiento de la certificación es requerida',
        path: ['certification_expiration_date'],
      });
    }
    if (!data.certification_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El número de certificación es requerido',
        path: ['certification_number'],
      });
    }
  })
  .refine(
    (data) => {
      if (data.type_of_vehicle === '2') {
        return !!data.type;
      }
      return true;
    },
    { message: 'El tipo es requerido', path: ['type'] }
  )
  .refine(
    (data) => {
      if (data.type_of_vehicle === '2') {
        return !!data.subType;
      }
      return true;
    },
    { message: 'El subtipo es requerido', path: ['subType'] }
  )
  .refine(
    (data) => {
      if (data.type_of_vehicle === '1') {
        return !!data.chassis && data.chassis.length >= 2 && data.chassis.length <= 30;
      }
      return true;
    },
    { message: 'El chasis debe tener entre 2 y 30 caracteres', path: ['chassis'] }
  )
  .refine(
    (data) => {
      if (data.type_of_vehicle === '2') {
        return !!data.serie && data.serie.length >= 2 && data.serie.length <= 30;
      }
      return true;
    },
    { message: 'La serie debe tener entre 2 y 30 caracteres', path: ['serie'] }
  )
  .refine(
    (data) => {
      if (data.type_of_vehicle === '1') {
        if (!data.domain) return false;
        const domain = data.domain.toUpperCase();
        const year = Number(data.year);

        const oldRegex = /^[A-Za-z]{3}[0-9]{3}$/; // AAA000
        const oldRegex2 = /^[A-Za-z]{3}[0-9]{2}$/; // AAA00
        if (year <= 2015) {
          return oldRegex.test(domain) || oldRegex2.test(domain);
        }
      }
      return true;
    },
    { message: 'El dominio debe tener el formato AAA000 o AAA00. (verificar año)', path: ['domain'] }
  )
  .refine(
    (data) => {
      if (data.type_of_vehicle === '1') {
        if (!data.domain) return false;
        const domain = data.domain.toUpperCase();
        const year = Number(data.year);

        const newRegex = /^[A-Za-z]{2}[0-9]{3}[A-Za-z]{2}$/; // AA000AA
        const oldRegex2 = /^[A-Za-z]{3}[0-9]{2}$/; // AAA00
        if (year >= 2017) {
          return newRegex.test(domain) || oldRegex2.test(domain);
        }
      }
      return true;
    },
    { message: 'El dominio debe tener el formato AA000AA o AAA00. (verificar año)', path: ['domain'] }
  )
  .refine(
    (data) => {
      if (data.type_of_vehicle === '1') {
        if (!data.domain) return false;
        const domain = data.domain.toUpperCase();
        const year = Number(data.year);

        const newRegex = /^[A-Za-z]{2}[0-9]{3}[A-Za-z]{2}$/; // AA000AA
        const oldRegex = /^[A-Za-z]{3}[0-9]{3}$/; // AAA000
        const oldRegex2 = /^[A-Za-z]{3}[0-9]{2}$/; // AAA00
        if (year === 2016 || year === 2015) {
          return newRegex.test(domain) || oldRegex.test(domain) || oldRegex2.test(domain);
        }
      }
      return true;
    },
    {
      message: 'El dominio debe tener uno de los formatos: AA000AA o AAA000 o AAA00. (verificar año)',
      path: ['domain'],
    }
  )
  .refine(
    async (data) => {
      if (data.type_of_vehicle === '1' && data.domain) {
        const supabase = supabaseBrowser();
        let { data: vehicles } = await supabase.from('vehicles').select('id').eq('domain', data.domain.toUpperCase());

        if (vehicles?.[0]?.id && window.location.href.includes('/dashboard/equipment/action?action=new')) {
          return false;
        }
      }
      return true;
    },
    { message: 'El dominio ya existe', path: ['domain'] }
  );

export function VehicleForm({ vehicle, mode, vehicleId, ...otherProps }: VehicleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Candado sincrono contra doble submit. El estado de React no alcanza: la validacion
  // del resolver es async (consulta si el dominio ya existe), asi que dos clicks seguidos
  // pueden llegar a onSubmit antes de cualquier re-render.
  const submitLockRef = useRef(false);
  const readOnly = mode === 'view';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resetTrigger } = useVehicleFormReset();

  const onSubmit = async (data: VehicleFormData) => {
    if (submitLockRef.current) {
      logger.warn('Submit descartado: ya hay un guardado en curso');
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    let createdVehicleId;
    // La fecha de certificacion viaja como 'YYYY-MM-DD' (formateada en la zona del navegador),
    // igual que en equipamientos. Si viajara como Date, un navegador al este de UTC la
    // serializa como el dia anterior (medianoche local del 15 = 14 a las 23:00 UTC) y la
    // columna DATE guarda un dia menos.
    const payload = {
      ...data,
      certification_expiration_date:
        data.has_certification && data.certification_expiration_date
          ? moment(data.certification_expiration_date).format('YYYY-MM-DD')
          : null,
    };
    try {
      if (mode === 'new') {
        const result = await createVehicle(payload);
        if (result?.id) {
          createdVehicleId = result.id;
        }
        toast.success('Equipo creado correctamente');
      } else {
        await updateVehicle(vehicleId!, payload);
        toast.success('Equipo actualizado correctamente');
      }
      // El boton queda deshabilitado a proposito: la navegacion a la vista de detalle
      // sigue en curso y liberarlo aca permitiria crear el mismo equipo otra vez.
      refresh(createdVehicleId);
    } catch (error) {
      logger.error('Error submitting form', { data: { error } });
      const message = error instanceof Error ? error.message : undefined;
      toast.error(message || (mode === 'new' ? 'Error al crear el equipo' : 'Error al actualizar el equipo'));
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      // Unico valor posible en este form: los otros equipos se cargan desde su propia pantalla
      type_of_vehicle: vehicle?.types_of_vehicles?.id?.toString() || VEHICLE_TYPE_OF_VEHICLE_ID,
      brand: vehicle?.brand_vehicles?.id?.toString() || '',
      model: vehicle?.model_vehicles?.id?.toString() || null,
      year: vehicle?.year || '',
      engine: vehicle?.engine || '',
      type: vehicle?.type.id || null,
      subType: vehicle?.sub_type?.id || null,
      chassis: vehicle?.chassis || '',
      serie: vehicle?.serie || '',
      domain: vehicle?.domain || '',
      kilometer: vehicle?.kilometer || '',
      engine_hours: vehicle?.engine_hours || '',
      intern_number: vehicle?.intern_number || '',
      picture: vehicle?.picture || null,
      allocated_to: vehicle?.allocated_to || [],
      cost_center_id: vehicle?.cost_center_id || null,
      cost_type: vehicle?.cost_type || undefined,
      sector: vehicle?.sector || '',
      owner_id: vehicle?.equipment_owners?.id || null,
      type_of_contract: vehicle?.type_of_contract || null,
      contract_expiration_date: vehicle?.contract_expiration_date
        ? moment(vehicle.contract_expiration_date).toDate()
        : null,
      contract_start_date: vehicle?.contract_start_date ? moment(vehicle.contract_start_date).toDate() : null,
      contract_number: vehicle?.contract_number || '',
      has_certification: vehicle?.has_certification ?? false,
      certification_expiration_date: vehicle?.certification_expiration_date
        ? moment(vehicle.certification_expiration_date).toDate()
        : null,
      certification_number: vehicle?.certification_number ?? null,
      price: vehicle?.price || undefined,
      currency: vehicle?.currency || 'USD',
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
      params.set('id', createdVehicleId.toString());
      router.refresh();
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // Al editar, el form NO se remonta despues de guardar (la key del padre es el id del
  // equipo): cuando vuelve a modo lectura la navegacion ya termino y se libera el candado
  // para que una edicion posterior pueda guardar de nuevo.
  const [wasReadOnly, setWasReadOnly] = useState(readOnly);
  if (readOnly !== wasReadOnly) {
    setWasReadOnly(readOnly);
    if (readOnly) {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || form.formState.isSubmitting;

  return (
    <Form {...form}>
      <div className="w-full">
        <VehicleTabs vehicle={vehicle} mode={mode} vehicleId={vehicleId} form={form} {...otherProps} />

        {!readOnly && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-fit">
                  {/* form.formState.isSubmitting se activa al inicio de handleSubmit (antes de
                      validar), asi que cubre la ventana en la que el resolver consulta el dominio. */}
                  <Button
                    type="button"
                    className="mt-5 ml-2"
                    disabled={isBusy}
                    onClick={() => form.handleSubmit(onSubmit)()}
                  >
                    {isBusy ? 'Guardando...' : mode === 'new' ? 'Agregar equipo' : 'Guardar cambios'}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                {form.formState.isValid ? '¡Todo listo para guardar!' : 'Completa todos los campos requeridos'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </Form>
  );
}
