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
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  createCustomerEquipment,
  updateCustomerEquipment,
  type CustomerEquipmentRow,
} from '../../actions/customer-equipment.server';
import type { CustomerRef } from '../../lib/serializers';
import {
  CUSTOMER_EQUIPMENT_TYPES,
  customerEquipmentFormSchema,
  type CustomerEquipmentFormValues,
} from '../../schemas/customer-equipment';

interface CustomerEquipmentFormProps {
  customers: CustomerRef[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  selectedEquipment: CustomerEquipmentRow | null;
  setSelectedEquipment: (equipment: CustomerEquipmentRow | null) => void;
}

const EMPTY_VALUES: CustomerEquipmentFormValues = { name: '', customer_id: '', type: 'Perforador' };

function toFormValues(equipment: CustomerEquipmentRow | null): CustomerEquipmentFormValues {
  if (!equipment) return EMPTY_VALUES;
  return { name: equipment.name, customer_id: equipment.customer_id, type: equipment.type };
}

function CustomerEquipmentForm({ customers, mode, setMode, selectedEquipment, setSelectedEquipment }: CustomerEquipmentFormProps) {
  const form = useForm<CustomerEquipmentFormValues>({
    resolver: zodResolver(customerEquipmentFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { reset } = form;
  const router = useRouter();

  // El modo/equipo seleccionado llegan por props desde la tabla: sincronizar el form con ellos.
  useEffect(() => {
    reset(toFormValues(mode === 'edit' ? selectedEquipment : null));
  }, [mode, selectedEquipment, reset]);

  const handleSubmit = async (values: CustomerEquipmentFormValues) => {
    const isEdit = mode === 'edit' && selectedEquipment;
    const response = isEdit
      ? await updateCustomerEquipment({ ...values, id: selectedEquipment.id })
      : await createCustomerEquipment(values);

    if (!response.ok) {
      toast.error(response.error);
      return;
    }

    toast.success(isEdit ? 'Equipo actualizado correctamente' : 'Equipo creado satisfactoriamente');
    reset(EMPTY_VALUES);
    setSelectedEquipment(null);
    setMode('create');
    router.refresh();
  };

  const handleCancel = () => {
    reset(EMPTY_VALUES);
    setSelectedEquipment(null);
    setMode('create');
  };

  return (
    <PermissionGuard module="comercial" tab="equipment" action={mode === 'create' ? 'create' : 'update'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-[300px]">
          <h2 className="text-xl font-bold mb-4">{mode === 'create' ? 'Crear Equipo' : 'Editar Equipo'}</h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Equipo</FormLabel>
                <FormControl>
                  <Input type="text" {...field} placeholder="Nombre del Equipo" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Equipo</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo de Equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Tipos de Equipos</SelectLabel>
                        {CUSTOMER_EQUIPMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
            <Button type="submit" variant="gh_orange" disabled={form.formState.isSubmitting}>
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

export default CustomerEquipmentForm;
