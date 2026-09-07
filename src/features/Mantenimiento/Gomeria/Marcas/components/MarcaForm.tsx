'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createTireBrand, updateTireBrand, type TireBrandListItem } from '../actions/actions.server';

const logger = new Logger('MarcaForm');

// ============================================================================
// SCHEMA
// ============================================================================

const marcaFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede superar los 100 caracteres'),
});

type MarcaFormValues = z.infer<typeof marcaFormSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface MarcaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  brand?: TireBrandListItem;
  queryKey: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MarcaForm({ open, onOpenChange, companyId, brand, queryKey }: MarcaFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!brand;

  // ─── Form ─────────────────────────────────────────────────────────────────
  const form = useForm<MarcaFormValues>({
    resolver: zodResolver(marcaFormSchema),
    defaultValues: {
      name: '',
    },
  });

  // ─── Sync form when brand changes (edit mode) ──────────────────────────────
  useEffect(() => {
    if (open) {
      form.reset({ name: brand?.name ?? '' });
    }
  }, [open, brand, form]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function onSubmit(values: MarcaFormValues) {
    try {
      if (isEditing && brand) {
        await updateTireBrand(brand.id, { name: values.name });
        toast.success('Marca actualizada correctamente');
      } else {
        await createTireBrand({ name: values.name, company_id: companyId });
        toast.success('Marca creada correctamente');
      }
      await queryClient.invalidateQueries({ queryKey });
      onOpenChange(false);
    } catch (error) {
      logger.error('Error saving tire brand', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar la marca');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
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
                    <Input placeholder="Ej: Bridgestone, Michelin..." {...field} />
                  </FormControl>
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
                    : 'Crear marca'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
