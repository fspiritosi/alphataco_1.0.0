'use client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createArea,
  fetchActiveContractsByCustomer,
  fetchAreaLinkedContracts,
  fetchAreasWithProvinces,
  linkAreaToContracts,
  updateArea,
} from '@/features/Empresa/Clientes/actions/create';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Info, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const AreaSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  descripcion_corta: z.string().min(1, { message: 'La descripción corta es requerida' }).max(5, 'Máximo 5 caracteres'),
  customer_id: z.string().min(1, { message: 'El cliente es requerido' }),
  province_id: z.array(z.number()).min(1, { message: 'La provincia es requerida' }),
  contract_ids: z.array(z.string()).optional(),
});

interface Cliente {
  id: string;
  name: string;
}

interface Provincia {
  id: number;
  name: string;
}

type Area = Awaited<ReturnType<typeof fetchAreasWithProvinces>>[0];
interface AreaFormProps {
  customers: Cliente[];
  provinces: Provincia[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  selectedArea: Area | null;
  setSelectedArea: (area: Area | null) => void;
}

type AreaFormValues = z.infer<typeof AreaSchema>;

function AreaForm({ customers, provinces, mode, setMode, selectedArea, setSelectedArea }: AreaFormProps) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(AreaSchema),
    defaultValues: {
      name: '',
      descripcion_corta: '',
      customer_id: '',
      province_id: [],
      contract_ids: [],
    },
  });

  const { reset, watch, setValue } = form;
  const router = useRouter();

  const watchedCustomerId = watch('customer_id');

  const finishFormReset = () => {
    reset({
      name: '',
      descripcion_corta: '',
      customer_id: '',
      province_id: [],
      contract_ids: [],
    });
    setSelectedArea(null);
    setMode('create');
    router.refresh();
  };

  // Reset inicial al cambiar modo / area seleccionada
  useEffect(() => {
    if (mode === 'edit' && selectedArea) {
      reset({
        name: selectedArea.nombre,
        descripcion_corta: selectedArea.descripcion_corta || '',
        customer_id: selectedArea.customers?.id || '',
        province_id: selectedArea.area_province.map((prov) => prov.provinces?.id || 0),
        contract_ids: [],
      });
    } else if (mode === 'create') {
      reset({
        name: '',
        descripcion_corta: '',
        customer_id: '',
        province_id: [],
        contract_ids: [],
      });
    }
  }, [mode, selectedArea, reset]);

  // Contratos activos del cliente seleccionado
  const contractsQuery = useQuery({
    queryKey: ['active-contracts-by-customer', watchedCustomerId],
    queryFn: () => fetchActiveContractsByCustomer(watchedCustomerId!),
    enabled: !!watchedCustomerId,
    staleTime: 2 * 60 * 1000,
  });

  // En modo edit: contratos ya vinculados al area (para filtrarlos del select)
  const linkedQuery = useQuery({
    queryKey: ['area-linked-contracts', selectedArea?.id ?? ''],
    queryFn: () => fetchAreaLinkedContracts(selectedArea!.id),
    enabled: mode === 'edit' && !!selectedArea?.id,
    staleTime: 2 * 60 * 1000,
  });

  const availableContracts = useMemo(() => {
    const all = contractsQuery.data ?? [];
    const linked = new Set(linkedQuery.data ?? []);
    return all.filter((c) => !linked.has(c.id));
  }, [contractsQuery.data, linkedQuery.data]);

  // Al cambiar de cliente, limpiar contratos seleccionados
  useEffect(() => {
    setValue('contract_ids', []);
  }, [watchedCustomerId, setValue]);

  const handleSubmit = async (values: AreaFormValues) => {
    try {
      const response =
        mode === 'edit' && selectedArea
          ? await updateArea({ ...values, id: selectedArea.id })
          : await createArea(values);

      if (!response) {
        toast.error('No se recibió respuesta del servidor');
        return;
      }

      if (response.status !== 200) {
        toast.error(response.body || 'Error al guardar el área');
        return;
      }

      const areaId = response.data?.areaId;
      const contractIds = values.contract_ids ?? [];

      if (areaId && contractIds.length > 0) {
        const link = await linkAreaToContracts(areaId, contractIds);
        if (!link.ok) {
          toast.error(`Área guardada pero falló el vínculo: ${link.error}`);
          finishFormReset();
          return;
        }
        toast.success(
          `${mode === 'create' ? 'Área creada' : 'Área actualizada'} y vinculada a ${link.linked} contrato${link.linked === 1 ? '' : 's'}`
        );
      } else {
        toast.success(
          response.body || (mode === 'create' ? 'Área creada correctamente' : 'Área actualizada correctamente')
        );
      }

      finishFormReset();
    } catch (error) {
      console.error(error);
      toast.error('Error inesperado al procesar la solicitud');
    }
  };

  const handleCancel = () => {
    reset({
      name: '',
      descripcion_corta: '',
      customer_id: '',
      province_id: [],
      contract_ids: [],
    });
    if (mode === 'edit') {
      setSelectedArea(null);
      setMode('create');
    }
  };

  const showContractsSection = !!watchedCustomerId;
  const isLoadingContracts = contractsQuery.isLoading || (mode === 'edit' && linkedQuery.isLoading);
  const hasNoContracts = !isLoadingContracts && availableContracts.length === 0;

  return (
    <PermissionGuard module="comercial" tab="areas" action={mode === 'create' ? 'create' : 'update'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-[300px]">
          <h2 className="text-xl font-bold">{mode === 'create' ? 'Crear Área' : 'Editar Área'}</h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Área</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Nombre del área" className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion_corta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción Corta</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Descripción breve" className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Clientes</SelectLabel>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="province_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provincias</FormLabel>
                <FormControl>
                  <MultiSelectCombobox
                    options={provinces.map((province) => ({
                      label: province.name,
                      value: province.id.toString(),
                    }))}
                    emptyMessage="No hay provincias disponibles"
                    selectedValues={field.value.map(String)}
                    onChange={(values) => field.onChange(values.map(Number))}
                    placeholder="Selecciona provincias"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showContractsSection && (
            <>
              <Separator className="my-4" />

              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Vincular a contratos</h3>
                  <p className="text-xs text-muted-foreground">
                    Opcional — seleccioná los contratos activos del cliente que querés vincular con esta área.
                  </p>
                </div>

                {isLoadingContracts && (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                )}

                {hasNoContracts && (
                  <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>Este cliente no tiene contratos activos disponibles para vincular.</p>
                  </div>
                )}

                {!isLoadingContracts && !hasNoContracts && (
                  <FormField
                    control={form.control}
                    name="contract_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultiSelectCombobox
                            options={availableContracts.map((c) => ({
                              label: `${c.contract_number ?? 'Sin número'} — ${c.service_name ?? 'Sin nombre'}`,
                              value: c.id,
                            }))}
                            selectedValues={field.value ?? []}
                            onChange={field.onChange}
                            placeholder="Seleccionar contratos"
                            emptyMessage="Sin contratos"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </>
          )}

          <div className="flex gap-4 pt-2">
            <Button type="submit" variant="gh_orange" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mode === 'create' ? 'Crear' : 'Actualizar'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </PermissionGuard>
  );
}

export default AreaForm;
