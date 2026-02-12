'use client';
import { useState } from 'react';
// import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { handleServiceSubmit, handleServiceUpdate } from '@/features/Empresa/Clientes/actions/services';
import { PermissionGuard } from '@/features/Permissions';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '../../../../../components/ui/card';
import { MultiSelectCombobox } from '../../../../../components/ui/multi-select-combobox';
import { RadioGroup, RadioGroupItem } from '../../../../../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
const ServiceSchema = z
  .object({
    id: z.string().optional(),
    customer_id: z.string().min(1, { message: 'Debe seleccionar un cliente' }),
    area_id: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos un area' }),
    sector_id: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos un sector' }),
    service_name: z.string().min(1, { message: 'Debe ingresar el nombre del servicio' }),
    contract_number: z.string().optional(),
    service_start: z.date(),
    service_validity: z.date(),
    is_active: z.boolean(),
    service_areas: z
      .array(
        z.object({
          area_id: z.string(),
          areas_cliente: z.object({
            id: z.string(),
            nombre: z.string(),
            descripcion_corta: z.string(),
          }),
        })
      )
      .optional(),
  })
  .refine((data) => data.service_validity > data.service_start, {
    message: 'La validez del servicio debe ser mayor que el inicio del servicio',
    path: ['service_validity'],
  });
interface Customer {
  id: string;
  name: string;
}
type Services = {
  id: string;
  service_name: string;
  customer_id: string;
  area_id: string[];
  sector_id: string[];
  description: string;
  contract_number: string;
  service_price: number;
  service_start: string;
  service_validity: string;
  is_active: boolean;
  service_areas?: Array<{
    area_id: string;
    areas_cliente: {
      id: string;
      nombre: string;
      descripcion_corta: string;
    };
  }>;
  service_sectors?: Array<{
    sector_id: string;
    sectors: {
      id: string;
      name: string;
    };
  }>;
  customer?: string;
  area?: string;
  sector?: string;
  created_at?: string;
  company_id?: string;
};
type Service = z.infer<typeof ServiceSchema> & {
  service_sectors?: Array<{
    sector_id: string;
    sectors: {
      id: string;
      name: string;
    };
  }>;
  service_areas?: Array<{
    area_id: string;
    areas_cliente: {
      id: string;
      nombre: string;
      descripcion_corta: string;
    };
  }>;
  customer?: string;
  area?: string;
  sector?: string;
  created_at?: string;
  company_id?: string;
};

export default function ServicesForm({
  customers,
  company_id,
  editingService,
  initialFormData,
  areas,
  sectors,
  id,
  setOpen,
}: {
  customers: Service[];
  company_id: string;
  editingService?: Service;
  initialFormData?: Record<string, unknown> | null;
  areas: any[];
  sectors: any[];
  id?: string;
  setOpen?: ((open: boolean) => void) | undefined;
}) {
  const form = useForm<z.infer<typeof ServiceSchema>>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: initialFormData
      ? (initialFormData as z.infer<typeof ServiceSchema>)
      : {
          customer_id: '',
          area_id: [],
          sector_id: [],
          service_name: '',
          contract_number: '',
          service_start: new Date(),
          service_validity: new Date(),
          is_active: true,
        },
    mode: 'onChange',
  });

  const { reset } = form;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!!editingService);

  const [filteredAreas, setFilteredAreas] = useState<any[]>(() => {
    if (editingService?.customer_id) {
      return areas.filter((area) => area.customers?.id === editingService.customer_id);
    }
    return [];
  });
  const [filteredSectors, setFilteredSectors] = useState<any[]>(() => {
    if (editingService?.customer_id) {
      return (
        sectors
          ?.filter((sector: any) => sector.customer_id === editingService.customer_id)
          .map((sector: any) => sector.sectors) || []
      );
    }
    return [];
  });
  const [view, setView] = useState(!!id);
  const onSubmit = async (values: z.infer<typeof ServiceSchema>) => {
    // Incluir solo los campos necesarios con valores por defecto
    const submissionData = {
      customer_id: values.customer_id,
      area_id: Array.isArray(values.area_id) ? values.area_id : [],
      sector_id: Array.isArray(values.sector_id) ? values.sector_id : [],
      service_name: values.service_name,
      contract_number: values.contract_number || '',
      service_start: values.service_start ? new Date(values.service_start) : new Date(),
      service_validity: values.service_validity ? new Date(values.service_validity) : new Date(),
      is_active: values.is_active !== undefined ? values.is_active : true,
    };

    // Validar que los campos requeridos estén presentes
    if (
      !submissionData.customer_id ||
      !submissionData.service_name ||
      !submissionData.area_id.length ||
      !submissionData.sector_id.length
    ) {
      throw new Error('Faltan campos requeridos en el formulario');
    }

    try {
      const result = await handleServiceSubmit(submissionData, company_id, resetForm, router);

      // Resetear el formulario después de enviar
      if (result) {
        reset();
      }
      return result;
    } catch (error) {
      throw error; // Propagar el error para que pueda ser manejado por handleFormSubmit
    }
  };

  const onUpdate = async (values: z.infer<typeof ServiceSchema>) => {
    try {
      const result = await handleServiceUpdate(
        {
          ...values,
          // Asegurarse de que los campos opcionales estén presentes

          contract_number: values.contract_number || '',
        },
        editingService?.id || '',
        resetForm,
        router
      );

      return result;
    } catch (error) {
      throw error; // Propagar el error
    }
  };

  const handleFormSubmit = async (formData: z.infer<typeof ServiceSchema>) => {
    // Crear un nuevo objeto con los campos del formulario y valores por defecto
    const submissionData = {
      customer_id: formData.customer_id,
      area_id: Array.isArray(formData.area_id) ? formData.area_id : [],
      sector_id: Array.isArray(formData.sector_id) ? formData.sector_id : [],
      service_name: formData.service_name,
      contract_number: formData.contract_number || '',
      service_start: formData.service_start ? new Date(formData.service_start) : new Date(),
      service_validity: formData.service_validity ? new Date(formData.service_validity) : new Date(),
      is_active: formData.is_active !== undefined ? formData.is_active : true,
    };

    // Validar que los campos requeridos estén presentes
    if (
      !submissionData.customer_id ||
      !submissionData.service_name ||
      !submissionData.area_id.length ||
      !submissionData.sector_id.length
    ) {
      throw new Error('Faltan campos requeridos en el formulario');
    }

    try {
      let result;

      if (isEditing) {
        result = await onUpdate(submissionData);
      } else {
        result = await onSubmit(submissionData);
      }

      // Cerrar el diálogo después de enviar el formulario exitosamente
      if (setOpen) {
        setOpen(false);
      }

      return result;
    } catch (error) {
      throw error;
    }
  };

  const resetForm = () => {
    reset({
      id: '',
      customer_id: '',
      service_name: '',
      service_start: new Date(),
      service_validity: new Date(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    resetForm();
    setOpen?.(false);
  };

  const formatedAreas = areas?.map((area) => ({
    ...area,
    cliente: area.customer_id?.name,
    provincias: area.area_province.map((province: any) => province.provinces.name),
  }));

  return (
    <div>
      {/* {view && ( */}
      {editingService && (
        <div className="flex justify-end space-x-4 mr-2">
          <PermissionGuard module="comercial" tab="detalle-contrato" action="update">
            <Button onClick={() => setView(!view)}>{view ? 'Habilitar Edicion' : 'Ver'}</Button>
          </PermissionGuard>

          {/* <Link href="/dashboard/company/actualCompany?tab=comerce&subtab=service">
              <Button>Volver</Button>
            </Link> */}
        </div>
      )}
      {/* )} */}
      <Card className="w-full mt-2 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 w-full min-w-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="contents w-full">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      disabled={view}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('area_id', []);
                        form.setValue('sector_id', []);

                        const filteredAreasByCustomer = areas?.filter((area) => area.customers?.id === value) || [];
                        setFilteredAreas(filteredAreasByCustomer);

                        const filteredSectorsByCustomer =
                          sectors
                            ?.filter((sector: any) => sector.customer_id === value)
                            .map((sector: any) => sector.sectors) || [];
                        setFilteredSectors(filteredSectorsByCustomer);
                      }}
                      value={field.value || editingService?.customer_id}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegir cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer: any) => (
                          <SelectItem value={customer.id} key={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area_id"
                render={({ field }) => {
                  // Asegurarse de que field.value sea un array de strings
                  const fieldValue = field.value || [];
                  const selectedValues = (Array.isArray(fieldValue) ? fieldValue : [fieldValue])
                    .map(String)
                    .filter(Boolean);

                  // Opciones para el combobox
                  const areaOptions =
                    filteredAreas?.map((area) => ({
                      label: area.nombre,
                      value: String(area.id),
                    })) || [];

                  // Función para manejar cambios en la selección
                  const handleChange = (values: string[]) => {
                    field.onChange(values);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <MultiSelectCombobox
                        options={areaOptions}
                        placeholder="Elegir areas"
                        emptyMessage="No se encontraron areas"
                        selectedValues={selectedValues}
                        onChange={handleChange}
                        disabled={view}
                      />
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="sector_id"
                render={({ field }) => {
                  // Asegurarse de que field.value sea un array de strings
                  const fieldValue = field.value || [];
                  const selectedValues = (Array.isArray(fieldValue) ? fieldValue : [fieldValue])
                    .map(String)
                    .filter(Boolean);

                  // Opciones para el combobox
                  const sectorOptions =
                    filteredSectors?.map((sector) => ({
                      label: sector.name,
                      value: String(sector.id),
                    })) || [];

                  // Función para manejar cambios en la selección
                  const handleChange = (values: string[]) => {
                    field.onChange(values);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Sectores</FormLabel>
                      <MultiSelectCombobox
                        options={sectorOptions}
                        placeholder="Seleccionar sectores"
                        emptyMessage="No se encontraron sectores"
                        selectedValues={selectedValues}
                        onChange={handleChange}
                        disabled={view}
                      />
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="service_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Contrato</FormLabel>
                    <FormControl>
                      <Input
                        disabled={view}
                        type="text"
                        {...field}
                        className="input w-full"
                        placeholder="Título del contrato"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_start"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-4 items-center w-full justify-between">
                      <FormLabel>Inicio del Contrato</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              disabled={view}
                              variant={'outline'}
                              className={cn(
                                'w-[240px] pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? field.value.toLocaleDateString() : 'Elegir fecha'}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              {...field}
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service_validity"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-4 items-center w-full justify-between">
                      <FormLabel>Validez del Contrato</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="relative w-full">
                              <Button
                                type="button"
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? field.value.toLocaleDateString() : 'Elegir fecha'}
                              </Button>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contract_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Contrato</FormLabel>
                    <FormControl>
                      <Input
                        disabled={view}
                        type="text"
                        {...field}
                        className="input w-full"
                        placeholder="Número de contrato"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Activo</FormLabel>
                    <FormControl>
                      <RadioGroup
                        disabled={view}
                        onValueChange={(value) => field.onChange(value === 'true')}
                        value={field.value ? 'true' : 'false'}
                        className="flex  space-x-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="true" />
                          </FormControl>
                          <FormLabel className="font-normal">Activo</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="false" />
                          </FormControl>
                          <FormLabel className="font-normal">Inactivo</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <PermissionGuard module="comercial" tab="detalle-contrato" action="update">
                <Button disabled={view} className="mt-4" type="submit" variant={'gh_orange'}>
                  {isEditing ? 'Editar' : 'Crear'}
                </Button>
              </PermissionGuard>
              <Button disabled={view} className="mt-4 ml-2" type="button" onClick={handleCancel} variant={'outline'}>
                Cancelar
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
