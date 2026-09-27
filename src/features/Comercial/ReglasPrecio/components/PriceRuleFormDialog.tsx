'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  savePriceUpdateRule,
  type ContractOption,
  type PriceUpdateRuleRow,
} from '@/features/Empresa/Clientes/actions/price-rules.server';
import { PRICE_METHOD_LABELS } from '@/features/Empresa/Clientes/lib/price-method-labels';
import {
  indexConfigSchema,
  polynomialConfigSchema,
  type PriceRuleFormValues,
} from '@/features/Empresa/Clientes/schemas/price-rule';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const logger = new Logger('features/Comercial/ReglasPrecio/PriceRuleFormDialog');

/** El `<Select>` no puede tener un item de valor `''`, así que "toda la empresa" es un centinela. */
const TODA_LA_EMPRESA = 'all';

/**
 * El form es PLANO y se traduce a `PriceRuleFormValues` (una unión discriminada) al enviar.
 *
 * Modelar la unión directamente en React Hook Form obligaría a remontar el form al cambiar de
 * método y se perderían el nombre y el alcance ya tipeados. Acá los campos de los tres métodos
 * conviven y la validación cruzada la hace el `superRefine`.
 */
const dialogSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es requerido'),
    method: z.enum(['manual', 'index', 'polynomial']),
    customerServiceId: z.string(),
    indexName: z.string(),
    components: z.array(z.object({ name: z.string(), weight: z.string() })),
  })
  .superRefine((values, ctx) => {
    if (values.method === 'index' && !values.indexName.trim()) {
      ctx.addIssue({ code: 'custom', path: ['indexName'], message: 'El nombre del índice es requerido' });
    }
    if (values.method !== 'polynomial') return;

    if (values.components.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['components'], message: 'La fórmula necesita al menos un componente' });
      return;
    }
    values.components.forEach((component, i) => {
      if (!component.name.trim()) {
        ctx.addIssue({ code: 'custom', path: ['components', i, 'name'], message: 'Requerido' });
      }
      if (!/^\d*[.,]?\d+$/.test(component.weight.trim())) {
        ctx.addIssue({ code: 'custom', path: ['components', i, 'weight'], message: 'Número entre 0 y 1' });
      }
    });

    // Los pesos tienen que sumar 1: si no, la fórmula deja de representar el precio entero. El
    // servidor lo rechaza igual, pero avisar acá evita cargar seis componentes para nada.
    const suma = values.components.reduce((acc, c) => acc + Number(c.weight.trim().replace(',', '.') || 0), 0);
    if (Math.abs(suma - 1) > 0.0001) {
      ctx.addIssue({
        code: 'custom',
        path: ['components'],
        message: `Los pesos deben sumar 1 (suman ${suma.toFixed(4)})`,
      });
    }
  });

type DialogFormValues = z.infer<typeof dialogSchema>;

function toFormValues(rule: PriceUpdateRuleRow | null): DialogFormValues {
  if (!rule) {
    return { name: '', method: 'index', customerServiceId: TODA_LA_EMPRESA, indexName: '', components: [] };
  }
  const index = indexConfigSchema.safeParse(rule.config);
  const polynomial = polynomialConfigSchema.safeParse(rule.config);
  return {
    name: rule.name,
    method: rule.method,
    customerServiceId: rule.customer_services?.id ?? TODA_LA_EMPRESA,
    indexName: index.success ? index.data.indexName : '',
    components: polynomial.success ? polynomial.data.components : [],
  };
}

/** Traduce el form plano a la unión que espera la action. */
function toActionInput(values: DialogFormValues): PriceRuleFormValues {
  const customerServiceId = values.customerServiceId === TODA_LA_EMPRESA ? null : values.customerServiceId;
  const base = { name: values.name.trim(), customerServiceId };

  if (values.method === 'index') {
    return { ...base, method: 'index', config: { indexName: values.indexName.trim() } };
  }
  if (values.method === 'polynomial') {
    return {
      ...base,
      method: 'polynomial',
      config: {
        components: values.components.map((c) => ({ name: c.name.trim(), weight: c.weight.trim().replace(',', '.') })),
      },
    };
  }
  return { ...base, method: 'manual', config: {} };
}

interface PriceRuleFormDialogProps {
  /** `null` para un alta. */
  rule?: PriceUpdateRuleRow | null;
  contracts: ContractOption[];
  triggerLabel: string;
  triggerVariant?: 'default' | 'ghost';
}

/**
 * Alta y edición de una regla de actualización de precios.
 *
 * Lo que se define acá es la ESTRUCTURA: qué método, sobre qué contrato, y con qué componentes
 * si es polinómica. Los coeficientes de cada período NO se cargan acá — se piden al ejecutar la
 * regla, porque pertenecen a la corrida y no a la fórmula.
 */
export function PriceRuleFormDialog({
  rule = null,
  contracts,
  triggerLabel,
  triggerVariant = 'default',
}: PriceRuleFormDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<DialogFormValues>({
    resolver: zodResolver(dialogSchema),
    defaultValues: toFormValues(rule),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'components' });
  const method = form.watch('method');

  const onSubmit = async (values: DialogFormValues) => {
    try {
      const result = await savePriceUpdateRule({ ...toActionInput(values), ...(rule ? { id: rule.id } : {}) });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(rule ? 'Regla actualizada' : 'Regla creada');
      setOpen(false);
      if (!rule) form.reset(toFormValues(null));
      router.refresh();
    } catch (error) {
      // La action puede rechazar (no devolver `ok: false`): sin este catch el usuario no ve nada.
      logger.error('Error al guardar la regla', { data: { error, ruleId: rule?.id } });
      toast.error('Error al guardar la regla');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reabrir un form con lo que quedó a medias de la vez anterior confunde: se descarta.
        if (!next) form.reset(toFormValues(rule));
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant={triggerVariant}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar regla' : 'Nueva regla de precios'}</DialogTitle>
          <DialogDescription>
            La regla define el método y su estructura. Los coeficientes de cada período se cargan al ejecutarla.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Actualización trimestral por CAC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PRICE_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="customerServiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alcance</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TODA_LA_EMPRESA}>Toda la empresa</SelectItem>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {method === 'manual' && (
              <p className="text-muted-foreground text-sm">
                Una regla manual no se ejecuta: declara que en ese alcance los precios se cargan uno por uno, desde el
                ítem del contrato.
              </p>
            )}

            {method === 'index' && (
              <FormField
                control={form.control}
                name="indexName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Índice de referencia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: CAC, INDEC IPC" {...field} />
                    </FormControl>
                    <FormDescription>
                      El coeficiente del período se ingresa al ejecutar la regla, no acá.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {method === 'polynomial' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Componentes de la fórmula</FormLabel>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', weight: '' })}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Agregá los componentes del precio (mano de obra, combustible, materiales…) con su peso.
                  </p>
                )}

                {fields.map((componentField, index) => (
                  <div key={componentField.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`components.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Componente" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`components.${index}.weight`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormControl>
                            <Input inputMode="decimal" placeholder="Peso (0-1)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* El error de "los pesos deben sumar 1" vive en la raíz del array. */}
                {form.formState.errors.components?.root?.message && (
                  <p className="text-destructive text-sm">{form.formState.errors.components.root.message}</p>
                )}
                {typeof form.formState.errors.components?.message === 'string' && (
                  <p className="text-destructive text-sm">{form.formState.errors.components.message}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar regla'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
