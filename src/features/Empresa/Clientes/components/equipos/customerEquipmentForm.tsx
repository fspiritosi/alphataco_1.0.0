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
import { createEquipmentCustomer, updateEquipmentCustomer } from '@/features/Empresa/Clientes/actions/create';
import { Customer, Equipment } from '@/features/Empresa/Clientes/types/types';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const EquipmentCustomerSchema = z.object({
  name: z.string().nonempty({ message: 'El nombre es requerido' }),
  customer_id: z.string().nonempty({ message: 'El cliente es requerido' }),
  type: z.enum(['Perforador', 'Perforador Spudder', 'Work over', 'Fractura', 'Coiled Tubing']),
});

type EquipmentCustomerSchema = z.infer<typeof EquipmentCustomerSchema>;

function customerEquipmentForm({
  customers,
  equipments,
  mode,
  setMode,
  selectedEquipment,
  setSelectedEquipment,
}: {
  customers: Customer[];
  equipments: Equipment[];
  mode: 'create' | 'edit';
  setMode: (mode: 'create' | 'edit') => void;
  selectedEquipment: Equipment | null;
  setSelectedEquipment: (equipment: Equipment | null) => void;
}) {
  const form = useForm<EquipmentCustomerSchema>({
    resolver: zodResolver(EquipmentCustomerSchema),
    defaultValues: {
      name: selectedEquipment?.name || '',
      customer_id: selectedEquipment?.customer_id || '',
      type: selectedEquipment?.type || 'Perforador',
    },
  });

  const { reset } = form;
  const router = useRouter();
  const handleSubmit = async (values: EquipmentCustomerSchema) => {
    try {
      if (mode === 'edit' && selectedEquipment) {
        const response = await updateEquipmentCustomer({ ...values, id: selectedEquipment.id });
        if (response?.status === 200) {
          toast.success(response.body || 'Equipo actualizado correctamente');
          reset();
          setSelectedEquipment(null);
          setMode('create');
          router.refresh();
        } else {
          toast.error(response?.body || 'Error al actualizar el Equipo');
        }
      } else {
        const response = await createEquipmentCustomer(values);
        if (response?.status === 200) {
          toast.success(response.body || 'Equipo creado satisfactoriamente');
          reset();
          router.refresh();
        } else {
          toast.error(response?.body || 'Error al crear el área');
        }
      }
    } catch (error) {
      toast.error('Error al ' + (mode === 'edit' ? 'actualizar' : 'crear') + ' el área');
    }
  };
  useEffect(() => {
    if (selectedEquipment) {
      reset({
        name: selectedEquipment.name || '',
        customer_id: selectedEquipment.customer_id || '',
        type: selectedEquipment.type || 'Perforador',
      });
    }
  }, [selectedEquipment, reset]);

  const handleCancel = () => {
    reset();
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
                        {Object.values(EquipmentCustomerSchema.shape.type.options).map((type) => (
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
            <Button type="submit" variant="gh_orange">
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

export default customerEquipmentForm;
