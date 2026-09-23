'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tireTreadTypeLabels } from '@/features/Mantenimiento/Gomeria/shared/tire-mappers';
import { TireTreadType } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createTireType, updateTireType, type TireTypeListItem } from '../actions/actions.server';

const logger = new Logger('TipoForm');

// ============================================================================
// SCHEMA
// ============================================================================

const tireTypeFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  size: z.string().min(1, 'La medida es requerida'),
  tread_type: z.nativeEnum(TireTreadType, { required_error: 'Seleccione el tipo de banda' }),
});

type TireTypeFormValues = z.infer<typeof tireTypeFormSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface TipoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tireType?: TireTypeListItem;
  queryKey: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TipoForm({ open, onOpenChange, tireType, queryKey }: TipoFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!tireType;

  // ─── Form ─────────────────────────────────────────────────────────────────
  const form = useForm<TireTypeFormValues>({
    resolver: zodResolver(tireTypeFormSchema),
    defaultValues: {
      name: '',
      size: '',
      tread_type: undefined,
    },
  });

  // ─── Sync form when tireType changes (edit mode) ───────────────────────────
  useEffect(() => {
    if (open) {
      form.reset({
        name: tireType?.name ?? '',
        size: tireType?.size ?? '',
        tread_type: tireType?.tread_type ?? undefined,
      });
    }
  }, [open, tireType, form]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function onSubmit(values: TireTypeFormValues) {
    try {
      if (isEditing && tireType) {
        await updateTireType(tireType.id, {
          name: values.name,
          size: values.size,
          tread_type: values.tread_type,
        });
        toast.success('Tipo de cubierta actualizado correctamente');
      } else {
        await createTireType({
          name: values.name,
          size: values.size,
          tread_type: values.tread_type,
        });
        toast.success('Tipo de cubierta creado correctamente');
      }
      await queryClient.invalidateQueries({ queryKey });
      onOpenChange(false);
    } catch (error) {
      logger.error('Error saving tire type', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar el tipo de cubierta');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Tipo de Cubierta' : 'Nuevo Tipo de Cubierta'}</DialogTitle>
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
                    <Input placeholder="Ej: 295/80R22.5 Lisa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="tread_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de banda</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de banda..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(TireTreadType).map((value) => (
                        <SelectItem key={value} value={value}>
                          {tireTreadTypeLabels[value] ?? value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? isEditing
                    ? 'Guardando...'
                    : 'Creando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Crear tipo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
