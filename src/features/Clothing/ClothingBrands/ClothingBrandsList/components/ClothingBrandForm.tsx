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
import { createClothingBrand, updateClothingBrand } from '@/features/Clothing/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ClothingBrandListItem } from '../actions.server';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('ClothingBrandForm');

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre no puede superar los 100 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface ClothingBrandFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the form is in edit mode */
  brand?: ClothingBrandListItem | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClothingBrandForm({ open, onOpenChange, brand }: ClothingBrandFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!brand;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: brand?.name ?? '',
    },
  });

  // Reset form when brand changes (switching between create/edit)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ name: '' });
    } else if (brand) {
      form.reset({ name: brand.name });
    }
    onOpenChange(nextOpen);
  };

  async function onSubmit(values: FormValues) {
    logger.debug(isEditing ? 'Updating clothing brand' : 'Creating clothing brand', {
      data: { name: values.name, id: brand?.id },
    });

    try {
      if (isEditing && brand) {
        await updateClothingBrand(brand.id, values.name);
        toast.success('Marca actualizada exitosamente');
      } else {
        await createClothingBrand(values.name);
        toast.success('Marca creada exitosamente');
      }

      await queryClient.invalidateQueries({ queryKey: ['clothing-brands'] });
      handleOpenChange(false);
    } catch (error) {
      logger.error('Error saving clothing brand', { data: { error } });
      const message =
        error instanceof Error && error.message.includes('Unique')
          ? 'Ya existe una marca con ese nombre'
          : 'Error al guardar la marca. Por favor, intente de nuevo.';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar marca' : 'Nueva marca'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modificá el nombre de la marca de indumentaria.'
              : 'Ingresá el nombre de la nueva marca de indumentaria.'}
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
                    <Input placeholder="Ej: Nike, Adidas, Caterpillar..." {...field} />
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
                {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear marca'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
