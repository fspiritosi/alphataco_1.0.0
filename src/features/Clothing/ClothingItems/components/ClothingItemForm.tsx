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
import { Textarea } from '@/components/ui/textarea';
import { createClothingItem, updateClothingItem } from '@/features/Clothing/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ClothingItemListItem } from '../ClothingItemsList/actions.server';
import { ItemBrandSizeManager } from './ItemBrandSizeManager';

// ============================================================================
// LOGGER
// ============================================================================

const logger = new Logger('ClothingItemForm');

// ============================================================================
// SCHEMA
// ============================================================================

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(150, 'El nombre no puede superar los 150 caracteres'),
  code: z.string().max(50, 'El código no puede superar los 50 caracteres').optional().or(z.literal('')),
  description: z.string().max(500, 'La descripción no puede superar los 500 caracteres').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// PROPS
// ============================================================================

interface ClothingItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the form is in edit mode */
  item?: ClothingItemListItem | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClothingItemForm({ open, onOpenChange, item }: ClothingItemFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.name ?? '',
      code: item?.code ?? '',
      description: item?.description ?? '',
    },
  });

  // Reset form when item changes (switching between create/edit)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ name: '', code: '', description: '' });
    } else if (item) {
      form.reset({
        name: item.name,
        code: item.code ?? '',
        description: item.description ?? '',
      });
    }
    onOpenChange(nextOpen);
  };

  async function onSubmit(values: FormValues) {
    logger.debug(isEditing ? 'Updating clothing item' : 'Creating clothing item', {
      data: { name: values.name, id: item?.id },
    });

    try {
      const payload = {
        name: values.name,
        code: values.code || undefined,
        description: values.description || undefined,
      };

      if (isEditing && item) {
        await updateClothingItem(item.id, payload);
        toast.success('Artículo actualizado exitosamente');
      } else {
        await createClothingItem(payload);
        toast.success('Artículo creado exitosamente');
        // Close after create — no brand-size manager in create mode
        await queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
        handleOpenChange(false);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
    } catch (error) {
      logger.error('Error saving clothing item', { data: { error } });
      const message =
        error instanceof Error && error.message.includes('Unique')
          ? 'Ya existe un artículo con ese nombre'
          : 'Error al guardar el artículo. Por favor, intente de nuevo.';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modificá los datos del artículo de indumentaria.'
              : 'Ingresá los datos del nuevo artículo de indumentaria.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Camisa manga larga, Botas de seguridad..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Code */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Código <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: CAM-ML-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descripción <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción adicional del artículo..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {isEditing ? 'Cerrar' : 'Cancelar'}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear artículo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Brand-size manager — only visible in edit mode */}
        {isEditing && item && (
          <div className="mt-2">
            <ItemBrandSizeManager itemId={item.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
