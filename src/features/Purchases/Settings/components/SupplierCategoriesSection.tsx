'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { unwrapAction } from '@/features/Warehouses/lib/unwrap-action';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  createSupplierCategory,
  setSupplierCategoryActive,
  updateSupplierCategory,
  type SupplierCategoryRow,
} from '../../actions/categories.server';
import { supplierCategoryFormSchema, type SupplierCategoryFormValues } from '../../schemas/suppliers';

const logger = new Logger('Purchases/SupplierCategoriesSection');

interface Props {
  categories: SupplierCategoryRow[];
  canUpdate: boolean;
}

const supplierCount = (n: number) => (n === 0 ? 'Sin proveedores' : n === 1 ? '1 proveedor' : `${n} proveedores`);

/** Rubros de proveedor: alta, renombre y activar/desactivar. Desactivar no lo quita de los proveedores. */
export function SupplierCategoriesSection({ categories, canUpdate }: Props) {
  const router = useRouter();
  // `null` = cerrado, `'new'` = alta, un rubro = edicion.
  const [editing, setEditing] = useState<SupplierCategoryRow | 'new' | null>(null);

  const form = useForm<SupplierCategoryFormValues>({
    resolver: zodResolver(supplierCategoryFormSchema),
    defaultValues: { name: '' },
  });

  const openForm = (target: SupplierCategoryRow | 'new') => {
    form.reset({ name: target === 'new' ? '' : target.name });
    setEditing(target);
  };

  const save = useMutation({
    mutationFn: async (values: SupplierCategoryFormValues) =>
      unwrapAction(
        editing && editing !== 'new'
          ? await updateSupplierCategory(editing.id, values)
          : await createSupplierCategory(values)
      ),
    onSuccess: (_data, values) => {
      toast.success(editing === 'new' ? `Rubro ${values.name} creado` : `Rubro ${values.name} actualizado`);
      setEditing(null);
      router.refresh();
    },
    onError: (error) => {
      logger.error('Error al guardar el rubro', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el rubro');
    },
  });

  const toggle = useMutation({
    mutationFn: async (category: SupplierCategoryRow) =>
      unwrapAction(await setSupplierCategoryActive(category.id, !category.is_active)),
    onSuccess: (_data, category) => {
      toast.success(category.is_active ? `Rubro ${category.name} desactivado` : `Rubro ${category.name} reactivado`);
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el rubro'),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Rubros de proveedor</CardTitle>
          <CardDescription>Qué vende cada proveedor: repuestos, cubiertas, servicios de taller…</CardDescription>
        </div>
        {canUpdate && (
          <Button type="button" size="sm" variant="outline" onClick={() => openForm('new')}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay rubros. Los proveedores pueden cargarse sin rubro.
          </p>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={c.is_active ? 'truncate' : 'truncate text-muted-foreground'}>{c.name}</span>
                    {!c.is_active && <Badge variant="outline">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">{supplierCount(c.supplierCount)}</p>
                </div>
                {canUpdate && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Editar ${c.name}`}
                      onClick={() => openForm(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={c.is_active ? `Desactivar ${c.name}` : `Reactivar ${c.name}`}
                      onClick={() => toggle.mutate(c)}
                      disabled={toggle.isPending}
                    >
                      {c.is_active ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Nuevo rubro' : 'Editar rubro'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Repuestos, Cubiertas, Servicios de taller…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
