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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useLoggedUserStore } from '@/store/loggedUser';
// import { TypeOfRepair } from '@/types/types';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { createTypeOfRepair, deleteTypeOfRepair, updateTypeOfRepair } from './actions/actions';

export function getRepairTypeColumns(onEdit: (repair: TypeOfRepair) => void): ColumnDef<TypeOfRepair>[] {
  return [
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
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="link" className="hover:text-blue-400" onClick={() => onEdit(row.original)}>
          Editar
        </Button>
      ),
      enableSorting: false,
    },
  ];
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
  const company_id = useLoggedUserStore((state) => state.actualCompany)?.id;
  const [selectedRepair, setSelectedRepair] = useState<TypeOfRepair | null>(null);
  const router = useRouter();

  const typeOfRepair = z.object({
    name: z.string({ required_error: 'El nombre es requerido' }).min(1, { message: 'Debe ingresar un nombre' }),
    description: z
      .string({ required_error: 'Una breve descripción es requerida' })
      .min(3, { message: 'Intenta explicar con un poco más de detalle' }),
    criticity: z.enum(['Alta', 'Media', 'Baja'], { required_error: 'La criticidad es requerida' }),
    is_active: z.boolean().default(true).optional(),
    company_id: z
      .string()
      .default(company_id || '')
      .optional(),
    type_of_maintenance: z.enum(['Correctivo', 'Preventivo', 'Otro']),
  });

  type Repair = z.infer<typeof typeOfRepair>;

  const form = useForm<Repair>({
    resolver: zodResolver(typeOfRepair),
    defaultValues: {
      company_id: company_id,
    },
  });

  const onSubmit = async (data: Repair) => {
    toast.promise(
      async () => {
        try {
          await createTypeOfRepair(data);
          router.refresh();
        } catch (error) {
          console.error(error);
        }
      },
      {
        loading: 'Creando tipo de reparación...',
        success: 'Tipo de reparación creado con éxito',
        error: 'Hubo un error al crear el tipo de reparación',
      }
    );
  };

  const onUpdate = async (data: Repair) => {
    toast.promise(
      async () => {
        try {
          await updateTypeOfRepair(data, selectedRepair?.id || '');
          router.refresh();
          setSelectedRepair(null);
          form.reset();
        } catch (error) {
          console.error(error);
        }
      },
      {
        loading: 'Actualizando tipo de reparación...',
        success: 'Tipo de reparación actualizado con éxito',
        error: 'Hubo un error al actualizar el tipo de reparación',
      }
    );
  };

  const onDelete = async (id: string) => {
    toast.promise(
      async () => {
        try {
          await deleteTypeOfRepair(id);
          router.refresh();
          setSelectedRepair(null);
          form.reset();
        } catch (error) {
          console.error(error);
        }
      },
      {
        loading: 'Eliminando tipo de reparación...',
        success: 'Tipo de reparación eliminado con éxito',
        error: 'Hubo un error al eliminar el tipo de reparación',
      }
    );
  };

  const handleModify = (repair: TypeOfRepair) => {
    setSelectedRepair(repair);
    form.setValue('name', repair.name);
    form.setValue('description', repair.description);
    form.setValue('criticity', repair.criticity || ('' as any));
    form.setValue('type_of_maintenance', repair.type_of_maintenance || 'Correctivo');
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
  const maintenanceOptions = createFilterOptions(
    types_of_repairs,
    (repair) => repair.type_of_maintenance
    // FileText // Icono para documentos
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="pt-6">
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
            {selectedRepair ? (
              <div className="flex justify-between mt-4">
                <Button type="submit">Actualizar tipo de reparación</Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Eliminar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro de que deseas eliminar este tipo de reparación?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer y se perderán todos los datos relacionados como las solicitudes
                        de reparaciones que tengan este tipo de reparación.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button variant={'destructive'} type="button" onClick={() => onDelete(selectedRepair.id)}>
                          Eliminar
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <Button type="submit" className="mt-4">
                Crear tipo de reparación
              </Button>
            )}
          </form>
        </Form>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="pl-6 min-w-[600px] flex flex-col gap-4" defaultSize={70}>
        <BaseDataTable
          savedVisibility={savedVisibility}
          columns={getRepairTypeColumns(handleModify)}
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
            ],
          }}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
