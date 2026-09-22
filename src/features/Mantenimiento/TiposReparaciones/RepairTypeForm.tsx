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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Logger } from '@/lib/logger';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createTypeOfRepair,
  deleteTypeOfRepair,
  fetchAllWorkshopSectorsForConfig,
  fetchSectorsForRepairType,
  updateRepairTypeSectors,
  updateTypeOfRepair,
  type TypeOfRepairData,
} from './actions/actions';

/** Fila de la tabla: el tipo sale del retorno de la action, no de los tipos legacy. */
type TypeOfRepair = TypeOfRepairData;

const logger = new Logger('RepairTypeForm');

export function getRepairTypeColumns(
  onEdit: (repair: TypeOfRepair) => void,
  canEdit: boolean
): ColumnDef<TypeOfRepair>[] {
  const columns: ColumnDef<TypeOfRepair>[] = [
    {
      accessorKey: 'name',
      id: 'Nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'description',
      id: 'Descripción',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
      cell: ({ row }) => <span>{row.original.description}</span>,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'criticity',
      id: 'Criticidad',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criticidad" />,
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.criticity === 'Alta'
              ? 'destructive'
              : row.original.criticity === 'Media'
                ? 'warning'
                : 'default'
          }
        >
          {row.original.criticity}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'is_active',
      id: 'Estado',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.original.is_active ? 'Activo' : 'Inactivo';
        return value.includes(val);
      },
    },
    {
      accessorKey: 'type_of_maintenance',
      id: 'Tipo de Mantenimiento',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Mantenimiento" />,
      cell: ({ row }) => (
        <Badge variant={row.original.type_of_maintenance === 'Correctivo' ? 'warning' : 'success'}>
          {row.original.type_of_maintenance}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'autorizable',
      id: 'Autorizable',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Autorizable" />,
      cell: ({ row }) => (
        <Badge variant={row.original.autorizable ? 'warning' : 'outline'}>
          {row.original.autorizable ? 'Sí' : 'No'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        const val = row.original.autorizable ? 'Sí' : 'No';
        return value.includes(val);
      },
    },
  ];

  if (canEdit) {
    columns.push({
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    });
  }

  return columns;
}

export function RepairTypeForm({
  types_of_repairs,
  savedVisibility,
  savedFilters,
}: {
  types_of_repairs: TypeOfRepair[];
  savedVisibility: VisibilityState;
  savedFilters: string[];
}) {
  const [selectedRepair, setSelectedRepair] = useState<TypeOfRepair | null>(null);
  const router = useRouter();
  const { hasPermission } = usePermissions();

  // Verificar permisos
  const canCreate = hasPermission('equipos', 'type_of_repair', 'create');
  const canUpdate = hasPermission('equipos', 'type_of_repair', 'update');
  const canCreateOrUpdate = canCreate || canUpdate;

  const typeOfRepair = z.object({
    name: z.string({ required_error: 'El nombre es requerido' }).min(1, { message: 'Debe ingresar un nombre' }),
    description: z
      .string({ required_error: 'Una breve descripción es requerida' })
      .min(3, { message: 'Intenta explicar con un poco más de detalle' }),
    criticity: z.enum(['Alta', 'Media', 'Baja'], { required_error: 'La criticidad es requerida' }),
    is_active: z.boolean().default(true).optional(),
    type_of_maintenance: z.enum(['Correctivo', 'Preventivo', 'Otro']),
    autorizable: z.boolean().default(false).optional(),
  });

  type Repair = z.infer<typeof typeOfRepair>;

  const form = useForm<Repair>({
    resolver: zodResolver(typeOfRepair),
  });

  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  // Bloquea el boton de eliminar mientras la peticion esta en curso
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: workshopSectors = [] } = useQuery({
    queryKey: ['workshop-sectors-config'],
    queryFn: () => fetchAllWorkshopSectorsForConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const onSubmit = async (data: Repair) => {
    await toast
      .promise(
        async () => {
          // El motivo del fallo viaja como dato y se relanza aca, ya en el cliente:
          // un Error lanzado dentro de la server action pierde su mensaje en produccion.
          const result = await createTypeOfRepair(data);
          if (!result.ok) throw new Error(result.error);
          if (result.data.length > 0) {
            await updateRepairTypeSectors(result.data[0].id, selectedSectors);
          }
          setSelectedSectors([]);
          router.refresh();
        },
        {
          loading: 'Creando tipo de reparación...',
          success: 'Tipo de reparación creado con éxito',
          error: (error) => (error instanceof Error ? error.message : 'Hubo un error al crear el tipo de reparación'),
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  };

  const onUpdate = async (data: Repair) => {
    await toast
      .promise(
        async () => {
          try {
            await updateTypeOfRepair(data, selectedRepair?.id || '');
            if (selectedRepair?.id) {
              await updateRepairTypeSectors(selectedRepair.id, selectedSectors);
            }
            router.refresh();
            setSelectedRepair(null);
            setSelectedSectors([]);
            form.reset();
          } catch (error) {
            logger.error('Error en tipo de reparacion', { data: { error } });
          }
        },
        {
          loading: 'Actualizando tipo de reparación...',
          success: 'Tipo de reparación actualizado con éxito',
          error: 'Hubo un error al actualizar el tipo de reparación',
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      });
  };

  const onDelete = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(true);
    await toast
      .promise(
        async () => {
          try {
            await deleteTypeOfRepair(id);
            router.refresh();
            setSelectedRepair(null);
            setSelectedSectors([]);
            form.reset();
          } catch (error) {
            logger.error('Error en tipo de reparacion', { data: { error } });
          }
        },
        {
          loading: 'Eliminando tipo de reparación...',
          success: 'Tipo de reparación eliminado con éxito',
          error: 'Hubo un error al eliminar el tipo de reparación',
        }
      )
      .unwrap()
      .catch(() => {
        // el error ya se informa en el toast
      })
      .finally(() => setIsDeleting(false));
  };

  const handleModify = (repair: TypeOfRepair) => {
    setSelectedRepair(repair);
    form.setValue('name', repair.name);
    form.setValue('description', repair.description);
    form.setValue('criticity', (repair.criticity as 'Alta' | 'Media' | 'Baja') || 'Baja');
    form.setValue('type_of_maintenance', repair.type_of_maintenance || 'Correctivo');
    form.setValue('autorizable', repair.autorizable ?? false);

    // Load sectors for this repair type
    fetchSectorsForRepairType(repair.id).then((sectors) => {
      setSelectedSectors(sectors);
    });
  };
  const names = createFilterOptions(
    types_of_repairs,
    (repair) => repair.name
    // FileText // Icono para documentos
  );
  const criticityOptions = createFilterOptions(
    types_of_repairs,
    (repair) => repair.criticity
    // FileText // Icono para documentos
  );
  const maintenanceOptions = createFilterOptions(types_of_repairs, (repair) => repair.type_of_maintenance);
  const autorizableOptions = createFilterOptions(types_of_repairs, (repair) => (repair.autorizable ? 'Sí' : 'No'));

  return (
    <ResizablePanelGroup direction="horizontal" className="pt-6">
      {canCreateOrUpdate && (
        <>
          <ResizablePanel defaultSize={30}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(selectedRepair ? onUpdate : onSubmit)} className="space-y-4 pt-3 pr-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del tipo de reparación</FormLabel>
                      <Input placeholder="Ingresar nombre" {...field} value={field.value} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <Textarea placeholder="Ingresa una descripción" {...field} value={field.value} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="criticity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel de criticidad</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Elije el nivel de criticidad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Baja">Baja</SelectItem>
                            <SelectItem value="Media">Media</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type_of_maintenance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de mantenimiento</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Elegir tipo de mantenimiento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Preventivo">Preventivo</SelectItem>
                            <SelectItem value="Correctivo">Correctivo</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autorizable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Autorizable</FormLabel>
                        <FormDescription>
                          Requiere aprobacion del Jefe de Taller al ser agregada por un operario
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Sectores que realizan esta reparación */}
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Sectores de taller</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecciona los sectores que pueden realizar esta reparación
                    </p>
                  </div>
                  {workshopSectors.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                      {workshopSectors.map((sector) => (
                        <div key={sector.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sector-${sector.id}`}
                            checked={selectedSectors.includes(sector.id)}
                            onCheckedChange={(checked) => {
                              setSelectedSectors((prev) =>
                                checked ? [...prev, sector.id] : prev.filter((id) => id !== sector.id)
                              );
                            }}
                          />
                          <label
                            htmlFor={`sector-${sector.id}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {sector.workshops?.name ? `${sector.name} - ${sector.workshops.name}` : sector.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay sectores disponibles</p>
                  )}
                </div>
                {selectedRepair ? (
                  <div className="flex justify-between mt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Actualizar tipo de reparación
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Eliminar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Estás seguro de que deseas eliminar este tipo de reparación?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer y se perderán todos los datos relacionados como las
                            solicitudes de reparaciones que tengan este tipo de reparación.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button
                              variant={'destructive'}
                              type="button"
                              onClick={() => onDelete(selectedRepair.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <Button type="submit" className="mt-4" disabled={form.formState.isSubmitting}>
                    Crear tipo de reparación
                  </Button>
                )}
              </form>
            </Form>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel className="pl-6 min-w-[600px] flex flex-col gap-4" defaultSize={canCreateOrUpdate ? 70 : 100}>
        <BaseDataTable
          savedVisibility={savedVisibility}
          columns={getRepairTypeColumns(handleModify, canUpdate)}
          data={types_of_repairs}
          tableId="repair-type-table"
          toolbarOptions={{
            initialVisibleFilters: savedFilters || [],
            filterableColumns: [
              {
                columnId: 'Nombre',
                title: 'Nombre',
                options: names,
              },
              {
                columnId: 'Criticidad',
                title: 'Criticidad',
                options: criticityOptions,
              },
              {
                columnId: 'Tipo de Mantenimiento',
                title: 'Tipo de Mantenimiento',
                options: maintenanceOptions,
              },
              {
                columnId: 'Autorizable',
                title: 'Autorizable',
                options: autorizableOptions,
              },
            ],
          }}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
