'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Esquema para el formulario (acepta strings para los campos numéricos)
const customerFormSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  cuit: z
    .string()
    .min(8, 'El CUIT debe tener al menos 8 caracteres.')
    .regex(/^\d+$/, 'El CUIT solo puede contener dígitos'),
  client_email: z.string().email('Por favor ingresa un email válido.').optional().or(z.literal('')),
  client_phone: z
    .string()
    .min(8, 'El teléfono debe tener al menos 8 caracteres.')
    .regex(/^\d+$/, 'El teléfono solo puede contener dígitos')
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  reason_for_termination: z.string().optional().or(z.literal('')),
  termination_date: z.date().optional().nullable(),
});

// Tipo para los valores que se enviarán a la base de datos
type CustomerDB = {
  name: string;
  cuit: number;
  client_email: string | null;
  client_phone: number | null;
  address: string | null;
  is_active: boolean | null;
  company_id: string;
  reason_for_termination: string | null;
  termination_date: string | null;
};

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: any;
  company_id: string;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export function CustomerForm({ customer, company_id, onSuccess, readOnly = false }: CustomerFormProps) {
  const supabase = supabaseBrowser();
  const isEditing = !!customer;
  const router = useRouter();
  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer
      ? {
          ...customer,
          // Convertir a los tipos correctos para el formulario
          cuit: customer.cuit ? String(customer.cuit) : '',
          client_phone: customer.client_phone ? String(customer.client_phone) : '',
          client_email: customer.client_email || '',
          address: customer.address || '',
          reason_for_termination: customer.reason_for_termination || '',
          is_active: customer.is_active ?? true,
          // Convertir string de fecha a objeto Date si existe
          termination_date: customer.termination_date ? new Date(customer.termination_date) : null,
        }
      : {
          name: '',
          cuit: '',
          client_email: '',
          client_phone: '',
          address: '',
          is_active: true,
          reason_for_termination: '',
          termination_date: null,
        },
  });

  const onSubmit = async (values: z.infer<typeof customerFormSchema>) => {
    toast.promise(
      async () => {
        // Si el cliente está activo, limpiamos los campos de baja
        if (values.is_active) {
          values.termination_date = null;
          values.reason_for_termination = '';
        }

        //Verificar si existe el cuit
        const { data: customerVerify, error: customerVerifyError } = await supabase
          .from('customers')
          .select('name')
          .eq('cuit', values.cuit)
          .single();

        if (customerVerifyError || (customerVerify && !isEditing)) {
          throw new Error(`El cliente ${customerVerify?.name} ya tiene este cuit`);
        }

        // Preparar los datos para la base de datos
        const customerData: CustomerDB = {
          name: values.name,
          cuit: Number(values.cuit),
          client_email: values.client_email || null,
          client_phone: values.client_phone ? Number(values.client_phone) : null,
          address: values.address || null,
          is_active: values.is_active,
          company_id,
          reason_for_termination: values.is_active ? null : values.reason_for_termination || null,
          termination_date: values.is_active ? null : values.termination_date?.toISOString() || null,
        };

        if (isEditing && customer) {
          // Actualizar cliente existente
          const { error } = await supabase.from('customers').update(customerData).eq('id', customer.id);

          if (error) throw error;
          toast.success('Cliente actualizado correctamente');
        } else {
          // Crear nuevo cliente
          const { error } = await supabase.from('customers').insert([customerData]);

          if (error) throw error;
          toast.success('Cliente creado correctamente');
        }

        // Refrescar la página para ver los cambios
        router.refresh();

        // Limpiar el formulario y cerrar el diálogo
        if (onSuccess) onSuccess();
        router.refresh();
      },
      {
        loading: 'Guardando cliente...',
        success: 'Cliente guardado correctamente',
        error: (error) => {
          console.error(error);
          return error || 'Error al guardar el cliente';
        },
      }
    );
  };

  // Siempre mostramos el formulario, pero lo deshabilitamos en modo de solo lectura
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
                  <Input
                    placeholder="Nombre del cliente"
                    {...field}
                    readOnly={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
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
                  <Input
                    placeholder="CUIT del cliente"
                    {...field}
                    readOnly={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
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
                    className={readOnly ? 'bg-muted' : ''}
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
                  <Input
                    placeholder="Teléfono del cliente"
                    {...field}
                    readOnly={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
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
                  <Input
                    placeholder="Dirección del cliente"
                    {...field}
                    readOnly={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
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
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(val) => field.onChange(val === 'true')}
                    value={field.value ? 'true' : 'false'}
                    className="flex space-x-4"
                    disabled={readOnly}
                    defaultValue={field.value ? 'true' : 'false'}
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
          {!form.getValues('is_active') && (
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
                        className={readOnly ? 'bg-muted' : ''}
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
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                        readOnly={readOnly}
                        className={readOnly ? 'bg-muted' : ''}
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
            <Button type="submit" className="bg-gh_orange hover:bg-gh_orange/90">
              {isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
