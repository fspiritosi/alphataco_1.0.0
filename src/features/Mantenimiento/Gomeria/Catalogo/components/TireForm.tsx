'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { tireRetreadLabels, tireTreadTypeLabels } from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { TireRetreadLevel, TireTreadType } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createTire, getTireBrandsForSelect, updateTire, type TireListItem } from '../actions/actions.server';

const logger = new Logger('TireForm');

// ============================================================================
// SCHEMA
// ============================================================================

const tireFormSchema = z.object({
  serial_number: z.string().min(1, 'El número de serie es requerido'),
  brand_id: z.string().uuid('Seleccione una marca válida'),
  size: z.string().min(1, 'La medida es requerida'),
  is_new: z.boolean().default(true),
  retread_level: z.nativeEnum(TireRetreadLevel).nullable().optional(),
  tread_type: z.nativeEnum(TireTreadType, { required_error: 'Seleccione el tipo de banda' }),
  tread_depth: z.coerce.number().positive('Debe ser positivo').nullable().optional(),
});

type TireFormValues = z.infer<typeof tireFormSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface TireFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  tire?: TireListItem;
  queryKey: (string | boolean | undefined)[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TireForm({ open, onOpenChange, companyId, tire, queryKey }: TireFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!tire;

  // Load brands
  const { data: brands = [] } = useQuery({
    queryKey: ['tire-brands-select', companyId],
    queryFn: () => getTireBrandsForSelect(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const form = useForm<TireFormValues>({
    resolver: zodResolver(tireFormSchema),
    defaultValues: {
      serial_number: '',
      brand_id: '',
      size: '',
      is_new: true,
      retread_level: null,
      tread_type: undefined,
      tread_depth: null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: TireFormValues) => {
      if (isEditing && tire) {
        return updateTire(tire.id, {
          serial_number: values.serial_number,
          brand_id: values.brand_id,
          size: values.size,
          is_new: values.is_new,
          retread_level: values.retread_level ?? null,
          tread_type: values.tread_type,
          tread_depth: values.tread_depth ?? null,
        });
      } else {
        return createTire({
          serial_number: values.serial_number,
          brand_id: values.brand_id,
          size: values.size,
          is_new: values.is_new,
          retread_level: values.retread_level ?? null,
          tread_type: values.tread_type,
          tread_depth: values.tread_depth ?? null,
          company_id: companyId,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Cubierta actualizada correctamente' : 'Cubierta creada correctamente');
      queryClient.invalidateQueries({ queryKey });
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error('Error saving tire', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar la cubierta');
    },
  });

  async function onSubmit(values: TireFormValues) {
    mutation.mutate(values);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      if (tire) {
        form.reset({
          serial_number: tire.serial_number,
          brand_id: tire.brand_id,
          size: tire.size,
          is_new: tire.is_new,
          retread_level: (tire.retread_level as TireRetreadLevel | null) ?? null,
          tread_type: tire.tread_type as TireTreadType,
          tread_depth: tire.tread_depth != null ? Number(tire.tread_depth) : null,
        });
      } else {
        form.reset({
          serial_number: '',
          brand_id: '',
          size: '',
          is_new: true,
          retread_level: null,
          tread_type: undefined,
          tread_depth: null,
        });
      }
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cubierta' : 'Nueva cubierta'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Serial Number */}
            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de serie</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: ABC001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand */}
            <FormField
              control={form.control}
              name="brand_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar marca..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Size */}
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medida</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 295/80R22.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Tread Type */}
              <FormField
                control={form.control}
                name="tread_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de banda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(TireTreadType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {tireTreadTypeLabels[type] ?? type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tread Depth */}
              <FormField
                control={form.control}
                name="tread_depth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profundidad (mm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 12.5"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Is New */}
              <FormField
                control={form.control}
                name="is_new"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">{field.value ? 'Nueva' : 'Usada'}</FormLabel>
                  </FormItem>
                )}
              />

              {/* Retread Level (optional) */}
              <FormField
                control={form.control}
                name="retread_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precurado</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === '_none' ? null : (val as TireRetreadLevel))}
                      value={field.value ?? '_none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin precurado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Sin precurado</SelectItem>
                        {Object.values(TireRetreadLevel).map((level) => (
                          <SelectItem key={level} value={level}>
                            {tireRetreadLabels[level] ?? level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cubierta'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
