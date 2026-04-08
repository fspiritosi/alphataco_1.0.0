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
import { createClothingItem, setItemBrandSizes, updateClothingItem } from '@/features/Clothing/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ClothingItemListItem } from '../ClothingItemsList/actions.server';
import { ItemBrandSizeManager, type ItemBrandSizeManagerRef } from './ItemBrandSizeManager';

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
  const brandSizeRef = useRef<ItemBrandSizeManagerRef>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  // Sync form values when dialog opens or item changes
  // useEffect is correct here: we're synchronizing with an external prop (item)
  // that changes outside of user interaction within this component
  useEffect(() => {
    if (open && item) {
      form.reset({
        name: item.name,
        code: item.code ?? '',
        description: item.description ?? '',
      });
    } else if (open && !item) {
      form.reset({ name: '', code: '', description: '' });
    }
  }, [open, item, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ name: '', code: '', description: '' });
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
        // Create item, then save brand-size combinations with the returned ID
        const created = await createClothingItem(payload);
        const combinations = brandSizeRef.current?.getCombinations() ?? [];

        if (combinations.length > 0) {
          await setItemBrandSizes(created.id, combinations);
        }

        toast.success('Artículo creado exitosamente');
      }

      await queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
      handleOpenChange(false);
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
      <DialogContent
        className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
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

        {/* Brand-size manager — server mode (edit) or local mode (create) */}
        <div className="mt-2">
          <ItemBrandSizeManager ref={brandSizeRef} itemId={isEditing ? item!.id : undefined} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
