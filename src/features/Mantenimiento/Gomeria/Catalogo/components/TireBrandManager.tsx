'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { Logger } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Pencil, Plus, PowerOff, Tag } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createTireBrand,
  getAllTireBrands,
  toggleTireBrandActive,
  updateTireBrand,
  type TireBrandItem,
} from '../actions/actions.server';

const logger = new Logger('TireBrandManager');

// ─── Schema ───────────────────────────────────────────────────────────────────

const brandFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es demasiado largo'),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TireBrandManagerProps {
  companyId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TireBrandManager({ companyId }: TireBrandManagerProps) {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<TireBrandItem | null>(null);
  const [toggleTarget, setToggleTarget] = useState<TireBrandItem | null>(null);

  const QUERY_KEY = ['tire-brands'];

  // ─── Query ────────────────────────────────────────────────────────────────

  const { data: brands = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getAllTireBrands(),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (values: BrandFormValues) => createTireBrand({ name: values.name, company_id: companyId }),
    onSuccess: () => {
      toast.success('Marca creada exitosamente');
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      logger.error('Error creating tire brand', { data: { error: error.message } });
      toast.error(error.message ?? 'Error al crear la marca');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: BrandFormValues) => {
      if (!editingBrand) throw new Error('No hay marca seleccionada');
      return updateTireBrand(editingBrand.id, { name: values.name });
    },
    onSuccess: () => {
      toast.success('Marca actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      logger.error('Error updating tire brand', { data: { error: error.message } });
      toast.error(error.message ?? 'Error al actualizar la marca');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleTireBrandActive(id, isActive),
    onSuccess: (_, variables) => {
      const action = variables.isActive ? 'activada' : 'desactivada';
      toast.success(`Marca ${action} exitosamente`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setToggleTarget(null);
    },
    onError: (error: Error) => {
      logger.error('Error toggling tire brand', { data: { error: error.message } });
      toast.error(error.message ?? 'Error al cambiar el estado de la marca');
    },
  });

  // ─── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { name: '' },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleOpenCreate() {
    setEditingBrand(null);
    form.reset({ name: '' });
    setDialogOpen(true);
  }

  function handleOpenEdit(brand: TireBrandItem) {
    setEditingBrand(brand);
    form.reset({ name: brand.name });
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingBrand(null);
    form.reset({ name: '' });
  }

  function handleSubmit(values: BrandFormValues) {
    if (editingBrand) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Marcas de Cubiertas</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {isLoading ? '...' : brands.length}
                  </Badge>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <PermissionGuard module="mantenimiento" tab="catalogo_cubiertas" action="create">
                <Button size="sm" variant="outline" onClick={handleOpenCreate} className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nueva Marca
                </Button>
              </PermissionGuard>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : brands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Tag className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No hay marcas registradas</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Agregá una marca para poder cargar cubiertas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{brand.name}</span>
                        <Badge
                          variant={brand.is_active ? 'success' : 'outline'}
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {brand.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        <PermissionGuard module="mantenimiento" tab="catalogo_cubiertas" action="update">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenEdit(brand)}
                            title="Editar marca"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard module="mantenimiento" tab="catalogo_cubiertas" action="delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setToggleTarget(brand)}
                            title={brand.is_active ? 'Desactivar marca' : 'Activar marca'}
                          >
                            <PowerOff className="h-3 w-3" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Bridgestone" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : editingBrand ? 'Guardar cambios' : 'Crear marca'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Toggle Active / Inactive Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTarget?.is_active ? 'Desactivar marca' : 'Activar marca'}</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? `¿Deseas desactivar la marca "${toggleTarget?.name}"? No se podrá usar en nuevas cubiertas.`
                : `¿Deseas activar la marca "${toggleTarget?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toggleTarget) {
                  toggleMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.is_active });
                }
              }}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
