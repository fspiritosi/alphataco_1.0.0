'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { saveCustomer } from '../actions/customers.server';
import type { CustomerRow } from '../lib/serializers';
import { customerFormSchema, type CustomerFormValues } from '../schemas/customer';

interface CustomerFormProps {
  customer?: CustomerRow | null;
  onSuccess: (customerId: string) => void;
  readOnly?: boolean;
}

function toFormValues(customer: CustomerRow | null | undefined): CustomerFormValues {
  if (!customer) {
    return {
      name: '',
      cuit: '',
      client_email: '',
      client_phone: '',
      address: '',
      is_active: true,
      reason_for_termination: '',
      termination_date: null,
    };
  }
  return {
    name: customer.name,
    cuit: customer.cuit,
    client_email: customer.client_email ?? '',
    client_phone: customer.client_phone ?? '',
    address: customer.address ?? '',
    is_active: customer.is_active ?? true,
    reason_for_termination: customer.reason_for_termination ?? '',
    termination_date: customer.termination_date ? new Date(customer.termination_date) : null,
  };
}

export function CustomerForm({ customer, onSuccess, readOnly = false }: CustomerFormProps) {
  const isEditing = !!customer;
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: toFormValues(customer),
  });

  const onSubmit = async (values: CustomerFormValues) => {
    const result = await saveCustomer(values, customer?.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Cliente guardado correctamente');
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    onSuccess(result.data.id);
    router.refresh();
  };

  const readOnlyClass = readOnly ? 'bg-muted' : '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del cliente" {...field} readOnly={readOnly} className={readOnlyClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cuit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CUIT</FormLabel>
                <FormControl>
                  <Input placeholder="CUIT del cliente" {...field} readOnly={readOnly} className={readOnlyClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="client_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Email del cliente"
                    {...field}
                    readOnly={readOnly}
                    className={readOnlyClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="client_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input placeholder="Teléfono del cliente" {...field} readOnly={readOnly} className={readOnlyClass} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input placeholder="Dirección del cliente" {...field} readOnly={readOnly} className={readOnlyClass} />
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
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(val) => field.onChange(val === 'true')}
                    value={field.value ? 'true' : 'false'}
                    className="flex space-x-4"
                    disabled={readOnly}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="active-true" />
                      <Label htmlFor="active-true">Activo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="active-false" />
                      <Label htmlFor="active-false">Inactivo</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!form.watch('is_active') && (
            <>
              <FormField
                control={form.control}
                name="reason_for_termination"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Motivo de baja</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Motivo de la baja del cliente"
                        {...field}
                        readOnly={readOnly}
                        className={readOnlyClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termination_date"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Fecha de baja</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        readOnly={readOnly}
                        className={readOnlyClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
        {!readOnly && (
          <div className="flex justify-end space-x-4">
            <Button type="submit" variant="gh_orange" disabled={form.formState.isSubmitting}>
              {isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
