'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createClothingSize, updateClothingSize } from '@/features/Clothing/actions/catalog.server';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ClothingSizeListItem } from '../ClothingSizesList/actions.server';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('ClothingSizeForm');

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50, 'El nombre no puede superar los 50 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface ClothingSizeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the form is in edit mode */
  size?: ClothingSizeListItem | null;
  /** Called after a successful create/update */
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClothingSizeForm({ open, onOpenChange, size, onSuccess }: ClothingSizeFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!size;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: size?.name ?? '',
    },
  });

  // Reset form when size changes (switching between create/edit)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ name: '' });
    } else if (size) {
      form.reset({ name: size.name });
    }
    onOpenChange(nextOpen);
  };

  async function onSubmit(values: FormValues) {
    logger.debug(isEditing ? 'Updating clothing size' : 'Creating clothing size', {
      data: { name: values.name, id: size?.id },
    });

    try {
      if (isEditing && size) {
        await updateClothingSize(size.id, values.name);
        toast.success('Talle actualizado exitosamente');
      } else {
        await createClothingSize(values.name);
        toast.success('Talle creado exitosamente');
      }

      await queryClient.invalidateQueries({ queryKey: ['clothing-sizes'] });
      onSuccess?.();
      handleOpenChange(false);
    } catch (error) {
      logger.error('Error saving clothing size', { data: { error } });
      const message =
        error instanceof Error && error.message.includes('Unique')
          ? 'Ya existe un talle con ese nombre'
          : 'Error al guardar el talle. Por favor, intente de nuevo.';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar talle' : 'Nuevo talle'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modificá el nombre del talle de indumentaria.'
              : 'Ingresá el nombre del nuevo talle de indumentaria.'}
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
                    <Input placeholder="Ej: S, M, L, XL, 42, 44..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear talle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
