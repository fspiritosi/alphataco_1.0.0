'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createSector, updateSector, type SectorCustomerRow } from '../../actions/sectors.server';
import type { CustomerRef } from '../../lib/serializers';
import { sectorFormSchema, type SectorFormValues } from '../../schemas/sector';

interface SectorFormProps {
  customers: CustomerRef[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  selectedSector: SectorCustomerRow | null;
  setSelectedSector: (sector: SectorCustomerRow | null) => void;
}

const EMPTY_VALUES: SectorFormValues = { name: '', descripcion_corta: '', customer_id: '' };

function toFormValues(sector: SectorCustomerRow | null): SectorFormValues {
  if (!sector) return EMPTY_VALUES;
  return {
    name: sector.sectors.name,
    descripcion_corta: sector.sectors.descripcion_corta ?? '',
    customer_id: sector.customer_id,
  };
}

function SectorForm({ customers, mode, setMode, selectedSector, setSelectedSector }: SectorFormProps) {
  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { reset } = form;
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['preparte-sectors'] });
    queryClient.invalidateQueries({ queryKey: ['preparte-contratos'] });
    router.refresh();
  };

  const createMutation = useMutation({
    mutationFn: createSector,
    onSuccess: (response) => {
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success('Sector creado correctamente');
      invalidate();
      reset(EMPTY_VALUES);
    },
    onError: () => toast.error('Error inesperado al crear el sector'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SectorFormValues }) => updateSector({ ...data, id }),
    onSuccess: (response) => {
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success('Sector actualizado correctamente');
      invalidate();
      setMode('create');
      setSelectedSector(null);
      reset(EMPTY_VALUES);
    },
    onError: () => toast.error('Error inesperado al actualizar el sector'),
  });

  // El modo/sector seleccionado llegan por props desde la tabla: sincronizar el form con ellos.
  useEffect(() => {
    reset(toFormValues(mode === 'edit' ? selectedSector : null));
  }, [mode, selectedSector, reset]);

  const handleSubmit = (values: SectorFormValues) => {
    if (mode === 'edit' && selectedSector) {
      updateMutation.mutate({ id: selectedSector.sector_id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleCancel = () => {
    reset(EMPTY_VALUES);
    if (mode === 'edit') {
      setSelectedSector(null);
      setMode('create');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <PermissionGuard module="comercial" tab="sector" action={mode === 'create' ? 'create' : 'update'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-[300px]">
          <h2 className="text-xl font-bold mb-4">{mode === 'create' ? 'Crear Sector' : 'Editar Sector'}</h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Sector</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Nombre del sector" />
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
                  <Input type="text" {...field} placeholder="Descripción breve" />
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
                    <SelectTrigger>
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

          <div className="flex gap-4">
            <Button type="submit" variant="brand" disabled={isPending}>
              {isPending ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Actualizar'}
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

export default SectorForm;
