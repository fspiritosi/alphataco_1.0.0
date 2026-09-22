'use client';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createdContact,
  getActiveCustomerOptions,
  getContactById,
  updateContact,
} from '@/features/Empresa/Contactos/actions/contacts.server';
import { cn } from '@/lib/utils';
import { contactSchema } from '@/shared/schemas/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type ContactFormValues = z.infer<typeof contactSchema>;

const EMPTY_VALUES: ContactFormValues = {
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_charge: '',
  customer: '',
};

/**
 * Alta / edición / vista de un contacto de la empresa activa
 * (`/dashboard/company/actualCompany/contact/action?action=edit|view&id=...`).
 * Clientes y contacto se piden por server action (React Query); la empresa la resuelve el servidor.
 */
export default function ContactRegister({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const action = actionParam === 'view' || actionParam === 'edit' ? actionParam : null;
  const readOnly = Boolean(id) && action !== 'edit';

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['contact-customer-options'],
    queryFn: getActiveCustomerOptions,
    staleTime: 5 * 60 * 1000,
  });

  const { data: contact, isLoading: loadingContact } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContactById(id),
    enabled: Boolean(id),
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: EMPTY_VALUES,
    // El contacto llega asincrónico: `values` sincroniza el form sin useEffect.
    values: contact
      ? {
          contact_name: contact.contact_name ?? '',
          contact_email: contact.constact_email ?? '',
          contact_phone: contact.contact_phone ?? '',
          contact_charge: contact.contact_charge ?? '',
          customer: contact.customer_id ?? '',
        }
      : undefined,
  });

  const onSubmit = async (values: ContactFormValues) => {
    if (!values.customer || values.customer === 'undefined') {
      form.setError('customer', { message: 'Debe seleccionar un cliente válido.' });
      return;
    }

    const data = new FormData();
    data.append('id', id);
    data.append('contact_name', values.contact_name);
    data.append('contact_email', values.contact_email || '');
    data.append('contact_phone', values.contact_phone);
    data.append('contact_charge', values.contact_charge);
    data.append('customer', values.customer);

    const toastId = toast.loading(id ? 'Actualizando contacto' : 'Creando contacto');
    const response = id ? await updateContact(data) : await createdContact(data);
    if (response.status === 201 || response.status === 200) {
      toast.success(response.body, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      router.push('/dashboard/company/actualCompany');
    } else {
      toast.error(response.body, { id: toastId });
    }
  };

  if (id && loadingContact) {
    return <Skeleton className="h-64 w-full rounded-md" />;
  }

  if (id && !contact) {
    return (
      <Card className="mt-6 p-8">
        <CardTitle className="text-2xl">Contacto no encontrado</CardTitle>
        <CardDescription>El contacto no existe o no pertenece a la empresa activa.</CardDescription>
      </Card>
    );
  }

  return (
    <section className={cn('md:mx-7')}>
      <Card className="mt-6 p-8">
        <CardTitle className="text-4xl mb-3">
          {action === 'view' ? '' : action === 'edit' ? 'Editar Contacto' : 'Registrar Contacto'}
        </CardTitle>
        <CardDescription>
          {action === 'view'
            ? ''
            : action === 'edit'
              ? 'Edita este formulario con los datos de tu Contacto'
              : 'Completa este formulario con los datos de tu nuevo Contacto'}
        </CardDescription>
        <div className="mt-6 rounded-xl flex w-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-wrap gap-3 items-center w-full">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Contacto</FormLabel>
                      <FormControl>
                        <Input className="max-w-[350px] w-[300px]" placeholder="nombre del contacto" readOnly={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input className="max-w-[350px] w-[300px]" placeholder="email" readOnly={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de teléfono</FormLabel>
                      <FormControl>
                        <Input className="max-w-[350px] w-[300px]" placeholder="teléfono" readOnly={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleccione un cliente</FormLabel>
                      <Select value={field.value || undefined} onValueChange={field.onChange} disabled={readOnly || loadingCustomers}>
                        <FormControl>
                          <SelectTrigger id="customer" className="max-w-[350px] w-[300px]">
                            <SelectValue placeholder={loadingCustomers ? 'Cargando clientes...' : 'Seleccionar un cliente'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
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
                  name="contact_charge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input className="max-w-[350px] w-[300px]" placeholder="cargo en la empresa" readOnly={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {action === 'view' ? null : (
                <Button type="submit" className="mt-5" disabled={form.formState.isSubmitting}>
                  {id ? 'Editar Contacto' : 'Registrar Contacto'}
                </Button>
              )}
            </form>
          </Form>
        </div>
      </Card>
    </section>
  );
}
