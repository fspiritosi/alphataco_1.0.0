'use client';
import { useEffect, useState } from 'react';
// import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { handleServiceSubmit, handleServiceUpdate } from '@/features/Empresa/Clientes/actions/services';
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
  areas,
  sectors,
  id,
  setOpen,
}: {
  customers: Service[];
  company_id: string;
  editingService?: Service;
  areas: any[];
  sectors: any[];
  id?: string;
  setOpen?: ((open: boolean) => void) | undefined;
}) {
  // Función para obtener los IDs de área válidos basados en las opciones disponibles
  const getValidAreaIds = (serviceAreas: any[] | undefined, allAreas: any[]) => {
    if (!serviceAreas || !Array.isArray(serviceAreas)) return [];

    // Normalizar los IDs a string para comparación
    const normalizeId = (id: any) => String(id).trim();

    // Obtener todos los IDs de áreas disponibles como strings
    const availableAreaIds = allAreas.map((area) => normalizeId(area.id));

    // Extraer los IDs de las áreas del servicio y filtrar los que existen
    if (!serviceAreas) return [];

    return serviceAreas.map((id) => normalizeId(id)).filter((id) => availableAreaIds.includes(id));
  };

  const form = useForm<z.infer<typeof ServiceSchema>>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: {
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

  // Watch form values
  const formValues = form.watch();

  const { reset } = form;
  const router = useRouter();
  const [view, setView] = useState(false);
  const [isEditing, setIsEditing] = useState(!!editingService);

  // Efecto para cargar los datos cuando cambia el servicio a editar
  useEffect(() => {
    if (editingService) {
      // Extraer los IDs de las áreas del servicio
      const areaIds = editingService.service_areas?.map((a: any) => a.area_id) || [];
      const sectorIds = editingService.service_sectors?.map((s) => s.sector_id) || [];

      if (editingService.customer_id) {
        // 1. Filtrar áreas por el cliente
        const filteredAreas = areas.filter((area) => area.customers?.id === editingService.customer_id);
        setFilteredAreas(filteredAreas);

        // 2. Filtrar sectores por el cliente
        const newFilteredSectors =
          sectors
            ?.filter((sector: any) => sector.customer_id === editingService.customer_id)
            .map((sector: any) => sector.sectors) || [];

        // 3. Asegurarse de que los sectores seleccionados estén en la lista
        if (sectorIds.length > 0) {
          const missingSectors = sectorIds.filter((id: string) => !newFilteredSectors.some((s: any) => s.id === id));

          if (missingSectors.length > 0) {
            const additionalSectors = (sectors || [])
              .filter((s: any) => missingSectors.includes(s.id))
              .map((s: any) => s.sectors || s);
            setFilteredSectors([...newFilteredSectors, ...additionalSectors]);
          } else {
            setFilteredSectors(newFilteredSectors);
          }
        } else {
          setFilteredSectors(newFilteredSectors);
        }

        // 4. Crear el objeto de datos después de que las áreas y sectores estén listos
        const formData = {
          id: editingService.id,
          customer_id: editingService.customer_id,
          service_name: editingService.service_name,
          sector_id: sectorIds,
          contract_number: editingService.contract_number || '',
          service_start: editingService.service_start ? new Date(editingService.service_start) : new Date(),
          service_validity: editingService.service_validity ? new Date(editingService.service_validity) : new Date(),
          is_active: editingService.is_active ?? true,
          area_id: areaIds,
          service_areas: editingService.service_areas,
          service_sectors: editingService.service_sectors,
        };

        // 5. Usar setTimeout para asegurar que los estados se actualicen antes de resetear
        const timer = setTimeout(() => {
          // Verificar que las áreas del servicio existan en las áreas filtradas
          const validAreaIds = areaIds.filter((id) => filteredAreas.some((area) => area.id === id));

          // Crear un nuevo formData con solo las áreas válidas
          const finalFormData = {
            ...formData,
            area_id: validAreaIds,
          };

          reset(finalFormData);
          setIsEditing(true);
        }, 300);

        return () => clearTimeout(timer);
      }
    } else {
      reset({
        customer_id: '',
        area_id: [],
        sector_id: [],
        service_name: '',
        contract_number: '',
        service_start: new Date(),
        service_validity: new Date(),
        is_active: true,
      });
      setFilteredAreas([]);
      setIsEditing(false);
    }
  }, [editingService, reset, areas, sectors]);

  const [filteredServices, setFilteredServices] = useState<Service[] | undefined>(
    editingService ? [editingService] : []
  );

  const [filteredAreas, setFilteredAreas] = useState<any[]>([]);
  const [filteredSectors, setFilteredSectors] = useState<any[]>([]);
  const customerId = form.watch('customer_id');
  useEffect(() => {
    if (id) {
      setView(true);
    }
  }, [id]);
  // Efecto para manejar cambios en el cliente y filtrar áreas/sectores
  useEffect(() => {
    // Limpiar selecciones cuando cambia el cliente
    form.setValue('area_id', []);
    form.setValue('sector_id', []);

    if (customerId) {
      // Filtrar áreas por el cliente seleccionado
      const filteredAreasByCustomer =
        areas?.filter((area: any) => {
          // Verificar si el área pertenece al cliente seleccionado
          return area.customers?.id === customerId;
        }) || [];

      setFilteredAreas(filteredAreasByCustomer);

      // Filtrar sectores por el cliente seleccionado
      const filteredSectorsByCustomer =
        sectors?.filter((sector: any) => sector.customer_id === customerId).map((sector: any) => sector.sectors) || [];

      setFilteredSectors(filteredSectorsByCustomer);
    } else {
      // Si no hay cliente seleccionado, limpiar las opciones
      setFilteredAreas([]);
      setFilteredSectors([]);
    }
  }, [customerId, areas, sectors, form]);
  useEffect(() => {
    if (editingService) {
      const serviceStartDate = new Date(editingService.service_start);
      const serviceValidityDate = new Date(editingService.service_validity);

      serviceStartDate.setDate(serviceStartDate.getDate() + 1);
      serviceValidityDate.setDate(serviceValidityDate.getDate() + 1);

      // Extraer los IDs de los sectores del array service_sectors
      const sectorIds = (editingService as Service).service_sectors?.map((sector) => sector.sector_id) || [];

      // Extraer los IDs de áreas
      const areaIds =
        (editingService as Service).service_areas?.map((area) => area.area_id) ||
        (Array.isArray(editingService.area_id) ? editingService.area_id : [editingService.area_id]);

      reset({
        id: editingService.id,
        customer_id: editingService.customer_id,
        area_id: areaIds,
        sector_id: sectorIds,
        service_name: editingService.service_name,
        contract_number: editingService.contract_number || '',
        service_start: serviceStartDate,
        service_validity: serviceValidityDate,
        is_active: editingService.is_active,
      });

      // Forzar una actualización de los sectores filtrados
      const filtered =
        sectors?.filter((sector: any) =>
          sector.sector_customer?.some((sc: any) => sc.customer_id?.id === editingService.customer_id)
        ) || [];

      // Asegurarse de que los sectores seleccionados estén en la lista
      if (sectorIds.length > 0) {
        const missingSectors = sectorIds.filter((id: string) => !filtered.some((s: any) => s.id === id));

        if (missingSectors.length > 0) {
          const additionalSectors = sectors.filter((s: any) => missingSectors.includes(s.id));
          setFilteredSectors([...filtered, ...additionalSectors]);
          return;
        }
      }

      setFilteredSectors(filtered);
      setIsEditing(true);
    } else {
      reset({
        id: '',
        customer_id: '',
        area_id: [],
        sector_id: [],
        service_name: '',
        contract_number: '',
        service_start: new Date(),
        service_validity: new Date(),
        is_active: true,
      });
      setIsEditing(false);
    }
  }, [editingService, reset]);
  const modified_editing_service_id = editingService?.id?.toString().replace(/"/g, '') ?? '';

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
      <div className="flex justify-end space-x-4 mr-2">
        <Button onClick={() => setView(!view)}>{view ? 'Habilitar Edicion' : 'Ver'}</Button>

        {/* <Link href="/dashboard/company/actualCompany?tab=comerce&subtab=service">
            <Button>Volver</Button>
          </Link> */}
      </div>
      {/* )} */}
      <Card className="w-full mt-2">
        <div className="grid grid-cols-2 gap-4 p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="contents">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      disabled={view}
                      onValueChange={(value) => {
                        // Limpiar áreas y sectores cuando cambia el cliente
                        form.setValue('area_id', []);
                        form.setValue('sector_id', []);
                        field.onChange(value);
                      }}
                      value={field.value || editingService?.customer_id}
                    >
                      <FormControl>
                        <SelectTrigger className="w-[400px]">
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
                        className="input w-[400px]"
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
                    <div className="flex gap-4 items-center w-[400px] justify-between">
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
                    <div className="flex gap-4 items-center w-[400px] justify-between">
                      <FormLabel>Validez del Contrato</FormLabel>
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
                        className="input w-[400px]"
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
              <Button disabled={view} className="mt-4" type="submit" variant={'gh_orange'}>
                {isEditing ? 'Editar' : 'Crear'}
              </Button>
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
