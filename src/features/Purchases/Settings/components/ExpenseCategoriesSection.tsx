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
  createExpenseCategory,
  renameExpenseCategory,
  setExpenseCategoryActive,
  type ExpenseCategoryRow,
} from '../../actions/expense-categories.server';
import { expenseCategoryFormSchema, type ExpenseCategoryFormValues } from '../../schemas/expense-categories';

const logger = new Logger('Purchases/ExpenseCategoriesSection');

interface Props {
  categories: ExpenseCategoryRow[];
  canUpdate: boolean;
}

const lineCount = (n: number) => (n === 0 ? 'Sin usar' : n === 1 ? 'En 1 línea de comprobante' : `En ${n} líneas de comprobante`);

/** Conceptos de gasto: alta, renombre y activar/desactivar. Desactivar no los quita de los comprobantes. */
export function ExpenseCategoriesSection({ categories, canUpdate }: Props) {
  const router = useRouter();
  // `null` = cerrado, `'new'` = alta, un concepto = edicion.
  const [editing, setEditing] = useState<ExpenseCategoryRow | 'new' | null>(null);

  const form = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategoryFormSchema),
    defaultValues: { name: '' },
  });

  const openForm = (target: ExpenseCategoryRow | 'new') => {
    form.reset({ name: target === 'new' ? '' : target.name });
    setEditing(target);
  };

  const save = useMutation({
    mutationFn: async (values: ExpenseCategoryFormValues) =>
      unwrapAction(
        editing && editing !== 'new'
          ? await renameExpenseCategory(editing.id, values)
          : await createExpenseCategory(values)
      ),
    onSuccess: (_data, values) => {
      toast.success(editing === 'new' ? `Concepto ${values.name} creado` : `Concepto ${values.name} actualizado`);
      setEditing(null);
      router.refresh();
    },
    onError: (error) => {
      logger.error('Error al guardar el concepto', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el concepto');
    },
  });

  const toggle = useMutation({
    mutationFn: async (category: ExpenseCategoryRow) =>
      unwrapAction(await setExpenseCategoryActive(category.id, !category.is_active)),
    onSuccess: (_data, category) => {
      toast.success(category.is_active ? `Concepto ${category.name} desactivado` : `Concepto ${category.name} reactivado`);
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el concepto'),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Conceptos de gasto</CardTitle>
          <CardDescription>Para cargar comprobantes sin OC: luz, honorarios, fletes sueltos…</CardDescription>
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
            Todavía no hay conceptos. Hacen falta para cargar gastos sin OC.
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
                  <p className="text-xs text-muted-foreground tabular-nums">{lineCount(c.lineCount)}</p>
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
            <DialogTitle>{editing === 'new' ? 'Nuevo concepto' : 'Editar concepto'}</DialogTitle>
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
                      <Input autoFocus placeholder="Luz, Honorarios, Fletes…" {...field} />
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
