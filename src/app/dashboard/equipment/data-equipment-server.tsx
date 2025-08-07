'use client';

import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
// import { fetchEmployeesData } from "@/lib/supabase-query"
import { fetchEquipmentData, querySelectDistinct } from '@/app/server/GET/probando';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEdgeFunctions } from '@/hooks/useEdgeFunctions';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { useLoggedUserStore } from '@/store/loggedUser';
import { termination_reason_enum } from '@/types/enums';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, DotsVerticalIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import React, { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiToolsFill } from 'react-icons/ri';
import { toast } from 'sonner';
import { z } from 'zod';
const formSchema = z.object({
  reason_for_termination: z.string({
    required_error: 'La razón de la baja es requerida.',
  }),
  termination_date: z.date({
    required_error: 'La fecha de baja es requerida.',
  }),
});

type Colum = VehicleWithBrand;
// Tipo inferido automáticamente del retorno de Supabase
type EquipmentTableData = Awaited<ReturnType<typeof fetchEquipmentData>>['rows'][0];

export default function TablaEquipmentServer({
  initialData,
  savedFilters,
  savedVisibility,
  types_of_vehicles = 'all',
}: {
  initialData: Awaited<ReturnType<typeof fetchEquipmentData>>;
  savedFilters: string[];
  savedVisibility: VisibilityState;
  types_of_vehicles: 'all' | 'Vehículos' | 'Otros';
}) {
  // Definición de columnas
  const columns: ColumnDef<EquipmentTableData>[] = [
    {
      id: 'actions',
      cell: ({ row }: { row: any }) => {
        const share = useLoggedUserStore((state) => state.sharedCompanies);
        const profile = useLoggedUserStore((state) => state.credentialUser?.id);
        const owner = useLoggedUserStore((state) => state.actualCompany?.owner_id.id);
        const users = useLoggedUserStore((state) => state);
        const company = useLoggedUserStore((state) => state.actualCompany?.id);
        const supabase = supabaseBrowser();

        let role = '';
        if (owner === profile) {
          role = users?.actualCompany?.owner_id?.role as string;
        } else {
          const roleRaw = share
            ?.filter(
              (item: any) =>
                item.company_id.id === company &&
                Object.values(item).some((value) => typeof value === 'string' && value.includes(profile as string))
            )
            .map((item: any) => item.role);
          role = roleRaw?.join('');
        }
        const [showModal, setShowModal] = useState(false);
        const [integerModal, setIntegerModal] = useState(false);
        const [domain, setDomain] = useState('');
        //     //const user = row.original
        const [showInactive, setShowInactive] = useState<boolean>(false);
        const [showDeletedEquipment, setShowDeletedEquipment] = useState(false);
        const equipment = row.original;

        const handleOpenModal = (id: string) => {
          setDomain(id);
          setShowModal(!showModal);
        };
        const actualCompany = useLoggedUserStore((state) => state.actualCompany);

        const handleOpenIntegerModal = (id: string) => {
          setDomain(id);
          setIntegerModal(!integerModal);
        };

        const { errorTranslate } = useEdgeFunctions();
        const form = useForm<z.infer<typeof formSchema>>({
          resolver: zodResolver(formSchema),
          defaultValues: {
            reason_for_termination: undefined,
          },
        });

        async function reintegerEquipment() {
          try {
            const { data, error } = await supabase
              .from('vehicles')
              .update({
                is_active: true,
                termination_date: null,
                reason_for_termination: null,
              })
              .eq('id', equipment.id)
              .eq('company_id', actualCompany?.id || '')
              .select();

            setIntegerModal(!integerModal);

            setShowDeletedEquipment(false);
            toast.success('Equipo reintegrado', {
              description: `El equipo ${equipment?.engine} ha sido reintegrado`,
            });
          } catch (error: any) {
            const message = await errorTranslate(error?.message);
            toast.error('Error al reintegrar el equipo', { description: message });
          }
        }

        async function onSubmit(values: z.infer<typeof formSchema>) {
          const data = {
            ...values,
            termination_date: format(values.termination_date, 'yyyy-MM-dd'),
          };

          try {
            await supabase
              .from('vehicles')
              .update({
                is_active: false,
                termination_date: data.termination_date,
                // reason_for_termination: data.reason_for_termination,
                reason_for_termination: 'otro',
              })
              .eq('id', equipment.id)
              .eq('company_id', actualCompany?.id || '')
              .select();

            setShowModal(!showModal);

            toast.success('Equipo eliminado', { description: `El equipo ${equipment.domain} ha sido dado de baja` });
          } catch (error: any) {
            const message = await errorTranslate(error?.message);
            toast.error('Error al dar de baja el equipo', { description: message });
          }
        }

        return (
          <DropdownMenu>
            {integerModal && (
              <AlertDialog defaultOpen onOpenChange={() => setIntegerModal(!integerModal)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {`Estás a punto de reintegrar al equipo ${equipment.id}, quien fue dado de baja por ${equipment.reason_for_termination} el día ${equipment.termination_date}. Al reintegrar al equipo, se borrarán estas razones. Si estás seguro de que deseas reintegrarlo, haz clic en 'Continuar'. De lo contrario, haz clic en 'Cancelar'.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => reintegerEquipment()}>Continuar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {showModal && (
              <Dialog defaultOpen onOpenChange={() => setShowModal(!showModal)}>
                <DialogContent className="dark:bg-slate-950">
                  <DialogTitle>Dar de baja Equipo</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas dar de baja este equipo?, completa los campos para continuar.
                  </DialogDescription>
                  <DialogFooter>
                    <div className="w-full">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                          <FormField
                            control={form.control}
                            name="reason_for_termination"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Motivo de Baja</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona la razón" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {/* <SelectItem value="Venta del vehículo">Venta del vehículo</SelectItem>
                                  <SelectItem value="Destrucción Total">Destrucción Total</SelectItem>
                                  <SelectItem value="Fundido">Fundido</SelectItem> */}
                                    {termination_reason_enum.map((reason) => (
                                      <SelectItem key={reason} value={reason}>
                                        {reason}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Elige la razón por la que deseas dar de baja el equipo
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="termination_date"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Fecha de Baja</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          ' pl-3 text-left font-normal'
                                          //                                       !field.value && 'text-muted-foreground'
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, 'P', {
                                            locale: es,
                                          })
                                        ) : (
                                          <span>Elegir fecha</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                      initialFocus
                                      locale={es}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>Fecha en la que se dio de baja</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-4 justify-end">
                            <Button variant="destructive" type="submit">
                              Dar de Baja
                            </Button>
                            <DialogClose>Cancelar</DialogClose>
                          </div>
                        </form>
                      </Form>
                      {/* <Button variant="destructive" onClick={() => handleDelete()}>
                     Eliminar
                   </Button> */}
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <DropdownMenuTrigger asChild>
              {/* {role === "Invitado" ? null :( */}
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <DotsVerticalIcon className="h-4 w-4" />
              </Button>
              {/* )} */}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Opciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(equipment.domain)}>
                Copiar Dominio
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link className="w-full" href={`/dashboard/equipment/action?action=view&id=${equipment?.id}`}>
                  Ver equipo
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                {role !== 'Invitado' && (
                  <Link className="w-full" href={`/dashboard/equipment/action?action=edit&id=${equipment?.id}`}>
                    Editar equipo
                  </Link>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {role !== 'Invitado' && (
                  <Fragment>
                    {equipment.is_active ? (
                      <Button variant="destructive" onClick={() => handleOpenModal(equipment?.id)} className="text-sm">
                        Dar de baja equipo
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleOpenIntegerModal(equipment.id)}
                        className="text-sm"
                      >
                        Reintegrar Equipo
                      </Button>
                    )}
                  </Fragment>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: 'domain',
      id: 'domain',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dominio" />,
      cell: ({ row }) => {
        return (
          <Link href={`/dashboard/equipment/action?action=view&id=${row.original.id}`} className="hover:underline">
            {row.original.domain}
          </Link>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'chassis',
      id: 'chassis',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chassis" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'type.name',
      id: 'type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        return <Badge>{row.original.type?.name || ''}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'sub_type.name',
      id: 'sub_type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sub Tipo" />,
      cell: ({ row }) => {
        return row.original.sub_type?.name ? <Badge>{row.original.sub_type?.name || ''}</Badge> : '-';
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'types_of_vehicles.name',
      id: 'types_of_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos de vehículos" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      cell: ({ row }) => {
        return <Badge>{row.original.types_of_vehicles?.name}</Badge>;
      },
    },
    {
      accessorKey: 'engine',
      id: 'engine',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motor" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'serie',
      id: 'serie',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Serie" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'contractor_equipment.customers.name',
      id: 'contractor_equipment.customers.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectado a" />,
      // cell: ({ row }) => {
      //   return row.original.contractor_equipment?.map((contractor) => {
      //     return <Badge key={contractor.contractor_id.id}>{contractor.contractor_id.name}</Badge>;
      //   });
      // },

      cell: ({ row }) => {
        const contractors: string[] = row.original.contractor_equipment?.map(
          (contractor) => contractor.customers?.name || ''
        );
        if (!contractors || contractors.length === 0) return null;
        const [first, ...rest] = contractors;
        if (rest.length === 0) {
          return <Badge variant="default">{first}</Badge>;
        }
        return (
          <>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default" className="cursor-pointer select-none">
                    {first} +{rest.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-col gap-1">
                    {rest.map((contractor) => (
                      <p key={contractor}>{contractor}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        // Filtrar por numero intenro o dominio
        if (filterValue === 'sin afectar' && row.original.allocated_to === null) {
          return true;
        }
        if (
          row.original.contractor_equipment?.some((contractor) => contractor.customers?.name?.includes(filterValue))
        ) {
          return true;
        } else {
          return false;
        }
      },
    },
    {
      accessorKey: 'year',
      id: 'year',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'condition',
      id: 'condition',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condición" />,
      cell: ({ row }) => {
        const variants = {
          operativo: 'success',
          'no operativo': 'destructive',
          'en reparacion': 'yellow',
          'operativo condicionado': 'info',
          default: 'default',
        };

        const conditionConfig = {
          'operativo condicionado': { color: 'bg-blue-500', icon: AlertTriangle },
          operativo: { color: 'bg-green-500', icon: CheckCircle },
          'no operativo': { color: 'bg-red-500', icon: XCircle },
          'en reparacion': { color: 'bg-yellow-500', icon: RiToolsFill },
        };

        return (
          <Badge variant={variants[row.original?.condition ?? 'default'] as 'default'}>
            {row.original?.condition &&
              React.createElement(conditionConfig[row.original?.condition]?.icon, { className: 'mr-2 size-4' })}
            {row.original.condition}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'brand_vehicles.name',
      id: 'brand_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Marca" />,
      cell: ({ row }) => {
        return <div>{row.original.brand_vehicles?.name}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'kilometer',
      id: 'kilometer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kilometros" />,
      cell: ({ row }) => {
        return <Badge variant={'outline'}>{row.original.kilometer} km</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'model_vehicles.name',
      id: 'model_vehicles.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Modelo" />,
      cell: ({ row }) => {
        return <div>{row.original.model_vehicles?.name}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'intern_number',
      id: 'intern_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Numero interno" />,
      cell: ({ row }: { row: any }) => {
        return (
          <Link href={`/dashboard/equipment/action?action=view&id=${row.original.id}`} className="hover:underline">
            {row.original.intern_number}
          </Link>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'picture',
      id: 'Foto',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Foto" />,
    },
    {
      accessorKey: 'showUnavaliableEquipment',
      id: 'Ver equipos dados de baja',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ver equipos dados de baja" />,
    },
  ];

  return (
    <BaseDataTable
      columns={columns}
      savedVisibility={savedVisibility}
      initialData={initialData}
      tableId={`equipmentServerTable-${types_of_vehicles}`}
      enableRowSelection={true}
      serverSide={true}
      fetchData={fetchEquipmentData}
      queryKey={`equipment-supabase-${types_of_vehicles}`}
      toolbarOptions={{
        initialVisibleFilters: savedFilters,
        filterableColumns: [
          {
            columnId: 'domain',
            title: 'Dominio',
            config: {
              tableName: 'vehicles',
              select: 'domain' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'domain'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'chassis',
            title: 'Chassis',
            config: {
              tableName: 'vehicles',
              select: 'chassis' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'chassis'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'status',
            title: 'Estado',
            config: {
              tableName: 'vehicles',
              select: 'status' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'status'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'type.name',
            title: 'Tipo',
            config: {
              tableName: 'vehicles',
              select: 'type.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"type": "type"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'type.name'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'sub_type.name',
            title: 'Sub Tipo',
            config: {
              tableName: 'vehicles',
              select: 'sub_type.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"sub_type": "subType"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'sub_type.name'>>>) => {
                console.log(data, 'datadata');
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'types_of_vehicles.name',
            title: 'Tipos de vehículos',
            config: {
              tableName: 'vehicles',
              select: 'types_of_vehicles.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"types_of_vehicles": "type_of_vehicle"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'types_of_vehicles.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'engine',
            title: 'Motor',
            config: {
              tableName: 'vehicles',
              select: 'engine' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'engine'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'serie',
            title: 'Serie',
            config: {
              tableName: 'vehicles',
              select: 'serie' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'serie'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'contractor_equipment.customers.name',
            title: 'Afectaciones',
            config: {
              tableName: 'vehicles' as const,
              select: 'id' as '*',
              multiJoinPaths: {
                joins: [
                  {
                    from_table: 'vehicles',
                    to_table: 'contractor_equipment',
                    from_column: 'id',
                    to_column: 'equipment_id',
                  },
                  {
                    from_table: 'contractor_equipment',
                    to_table: 'customers',
                    from_column: 'contractor_id',
                    to_column: 'id',
                  },
                ],
                final_column: 'customers.name',
              },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'id'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'year',
            title: 'Año',
            config: {
              tableName: 'vehicles',
              select: 'year' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'year'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'condition',
            title: 'Condicion',
            config: {
              tableName: 'vehicles',
              select: 'condition' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'condition'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'brand_vehicles.name',
            title: 'Marca',
            config: {
              tableName: 'vehicles',
              select: 'brand_vehicles.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"brand_vehicles": "brand"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'brand_vehicles.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'kilometer',
            title: 'Kilometros',
            config: {
              tableName: 'vehicles',
              select: 'kilometer' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'kilometer'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'model_vehicles.name',
            title: 'Modelo',
            config: {
              tableName: 'vehicles',
              select: 'model_vehicles.name' as '*',
              p_filters: { is_active: 'true' },
              relation: '{"model_vehicles": "model"}',
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'model_vehicles.name'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
          {
            columnId: 'intern_number',
            title: 'Numero Interno',
            config: {
              tableName: 'vehicles',
              select: 'intern_number' as '*',
              p_filters: { is_active: 'true' },
              mapper: (data: Awaited<ReturnType<typeof querySelectDistinct<'vehicles', 'intern_number'>>>) => {
                return data.map((value) => ({
                  label: String(value.display_value),
                  value: String(value.col_value),
                  count: value.col_count,
                }));
              },
            },
          },
        ],
        showFilterOptions: true,
      }}
    />
  );
}
