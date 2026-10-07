'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProvinces } from '@/shared/actions/countries.server';
import {
  ENABLED_RECEIVER_VAT_CONDITIONS,
  isReceiverVatConditionId,
  RECEIVER_VAT_CONDITIONS,
  type ReceiverVatConditionId,
} from '@/shared/lib/arca/catalogs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Logger } from '@/lib/logger';
import { toast } from 'sonner';
import { saveCustomer } from '../actions/customers.server';
import type { CustomerRow } from '../lib/serializers';
import { customerFormSchema, type CustomerFormValues } from '../schemas/customer';


const logger = new Logger('features/Empresa/Clientes/CustomerForm');

/**
 * Condiciones IVA que ofrece el select: las habilitadas en la v1 y, si el cliente ya tiene otra
 * guardada (p. ej. del exterior), también esa, para no perderla al editar.
 */
function vatConditionOptions(current: number | null | undefined): ReceiverVatConditionId[] {
  if (current == null || !isReceiverVatConditionId(current) || ENABLED_RECEIVER_VAT_CONDITIONS.includes(current)) {
    return ENABLED_RECEIVER_VAT_CONDITIONS;
  }
  return [...ENABLED_RECEIVER_VAT_CONDITIONS, current];
}

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
      vat_condition_id: '',
      fiscal_street: '',
      fiscal_city: '',
      fiscal_province_id: '',
      fiscal_postal_code: '',
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
    vat_condition_id: customer.vat_condition_id != null ? String(customer.vat_condition_id) : '',
    fiscal_street: customer.fiscal_street ?? '',
    fiscal_city: customer.fiscal_city ?? '',
    fiscal_province_id: customer.fiscal_province_id ?? '',
    fiscal_postal_code: customer.fiscal_postal_code ?? '',
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

  // Catálogo global: se pide una vez por sesión y lo comparten todas las instancias del form.
  const provincesQuery = useQuery({
    queryKey: ['provinces'],
    queryFn: () => getProvinces(),
    staleTime: Infinity,
  });
  const provinces = provincesQuery.data ?? [];
  const vatOptions = vatConditionOptions(customer?.vat_condition_id);

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      const result = await saveCustomer(values, customer?.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Cliente guardado correctamente');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess(result.data.id);
      router.refresh();
    } catch (error) {
      // La action puede rechazar (no devolver `ok: false`): sin este catch el usuario no ve nada.
      logger.error('Error al guardar el cliente', { data: { error } });
      toast.error('Error al guardar el cliente');
    }
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
                  <Input
                    placeholder="Ej: 30-71234567-8"
                    spellCheck={false}
                    {...field}
                    readOnly={readOnly}
                    className={readOnlyClass}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <fieldset className="flex flex-col gap-4" aria-describedby="customer-fiscal-description">
          <legend className="text-base font-semibold">Datos fiscales</legend>
          <p id="customer-fiscal-description" className="text-muted-foreground -mt-2 text-sm text-pretty">
            Se usan para facturar. Si faltan, no vas a poder emitirle facturas.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="vat_condition_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Condición frente al IVA</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={readOnly}>
                    <FormControl>
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Elegí la condición" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {vatOptions.map((id) => (
                          <SelectItem key={id} value={String(id)}>
                            {RECEIVER_VAT_CONDITIONS[id].label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fiscal_street"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Calle y número</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Av. Argentina 1234"
                      autoComplete="street-address"
                      {...field}
                      value={field.value ?? ''}
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
              name="fiscal_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localidad</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Neuquén"
                      autoComplete="address-level2"
                      {...field}
                      value={field.value ?? ''}
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
              name="fiscal_province_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={readOnly || provincesQuery.isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            provincesQuery.isPending
                              ? 'Cargando provincias…'
                              : provincesQuery.isError
                                ? 'No se pudieron cargar las provincias'
                                : 'Elegí la provincia'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={String(province.id)}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fiscal_postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código postal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Q8300"
                      autoComplete="postal-code"
                      spellCheck={false}
                      {...field}
                      value={field.value ?? ''}
                      readOnly={readOnly}
                      className={readOnlyClass}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <FormLabel>Dirección de contacto</FormLabel>
                <FormControl>
                  <Input placeholder="Dirección de contacto del cliente" {...field} readOnly={readOnly} className={readOnlyClass} />
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
            <Button type="submit" variant="brand" disabled={form.formState.isSubmitting}>
              {isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
