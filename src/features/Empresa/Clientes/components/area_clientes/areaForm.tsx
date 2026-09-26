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
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createArea, getAreaLinkedContracts, linkAreaToContracts, updateArea, type AreaRow } from '../../actions/areas.server';
import { getActiveContractsByCustomer } from '../../actions/services.server';
import type { CustomerRef } from '../../lib/serializers';
import { areaFormSchema, type AreaFormValues } from '../../schemas/area';

const logger = new Logger('features/Empresa/Clientes/AreaForm');

export interface ProvinceOption {
  id: number;
  name: string;
}

interface AreaFormProps {
  customers: CustomerRef[];
  provinces: ProvinceOption[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  selectedArea: AreaRow | null;
  setSelectedArea: (area: AreaRow | null) => void;
}

const EMPTY_VALUES: AreaFormValues = {
  name: '',
  descripcion_corta: '',
  customer_id: '',
  province_id: [],
  contract_ids: [],
};

function toFormValues(area: AreaRow | null): AreaFormValues {
  if (!area) return EMPTY_VALUES;
  return {
    name: area.nombre,
    descripcion_corta: area.descripcion_corta ?? '',
    customer_id: area.customers.id,
    province_id: area.area_province.map((prov) => prov.provinces.id),
    contract_ids: [],
  };
}

function AreaForm({ customers, provinces, mode, setMode, selectedArea, setSelectedArea }: AreaFormProps) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { reset, watch, setValue } = form;
  const router = useRouter();
  const queryClient = useQueryClient();

  const watchedCustomerId = watch('customer_id');

  // El modo/área seleccionada llegan por props desde la tabla: sincronizar el form con ellos.
  useEffect(() => {
    reset(toFormValues(mode === 'edit' ? selectedArea : null));
  }, [mode, selectedArea, reset]);

  const finishFormReset = () => {
    reset(EMPTY_VALUES);
    setSelectedArea(null);
    setMode('create');
    queryClient.invalidateQueries({ queryKey: ['area-linked-contracts'] });
    router.refresh();
  };

  // Contratos activos del cliente seleccionado
  const contractsQuery = useQuery({
    queryKey: ['active-contracts-by-customer', watchedCustomerId],
    queryFn: () => getActiveContractsByCustomer(watchedCustomerId),
    enabled: !!watchedCustomerId,
    staleTime: 2 * 60 * 1000,
  });

  // En modo edit: contratos ya vinculados al área (para filtrarlos del select)
  const linkedQuery = useQuery({
    queryKey: ['area-linked-contracts', selectedArea?.id ?? ''],
    queryFn: () => getAreaLinkedContracts(selectedArea?.id ?? ''),
    enabled: mode === 'edit' && !!selectedArea?.id,
    staleTime: 2 * 60 * 1000,
  });

  const availableContracts = useMemo(() => {
    const all = contractsQuery.data ?? [];
    const linked = new Set(linkedQuery.data ?? []);
    return all.filter((c) => !linked.has(c.id));
  }, [contractsQuery.data, linkedQuery.data]);

  const handleSubmit = async (values: AreaFormValues) => {
    try {
      const response =
        mode === 'edit' && selectedArea ? await updateArea({ ...values, id: selectedArea.id }) : await createArea(values);

      if (!response.ok) {
        toast.error(response.error);
        return;
      }

      const areaId = response.data.areaId;
      const contractIds = values.contract_ids ?? [];

      if (contractIds.length > 0) {
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
        toast.success(mode === 'create' ? 'Área creada correctamente' : 'Área actualizada correctamente');
      }

      finishFormReset();
    } catch (error) {
      logger.error('Error inesperado al guardar el área', { data: { error } });
      toast.error('Error inesperado al procesar la solicitud');
    }
  };

  const handleCancel = () => {
    reset(EMPTY_VALUES);
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
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Al cambiar de cliente, los contratos seleccionados ya no aplican.
                      setValue('contract_ids', []);
                    }}
                  >
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
                    options={provinces.map((province) => ({ label: province.name, value: String(province.id) }))}
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
                              label: `${c.contract_number || 'Sin número'} — ${c.service_name || 'Sin nombre'}`,
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
            <Button type="submit" variant="brand" disabled={form.formState.isSubmitting}>
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
