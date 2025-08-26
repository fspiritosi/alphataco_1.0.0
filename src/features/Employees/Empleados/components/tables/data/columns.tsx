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
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useLoggedUserStore } from '@/store/loggedUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { DotsVerticalIcon, PersonIcon } from '@radix-ui/react-icons';
import { ColumnDef } from '@tanstack/react-table';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '../../../../../../../supabase/supabase';
import { formatEmployeesForTable } from '../../utils/utils';
const formSchema = z.object({
  reason_for_termination: z.string({
    required_error: 'La razón de la baja es requerida.',
  }),
  termination_date: z.date({
    required_error: 'La fecha de baja es requerida.',
  }),
});
type Contractor =
  | {
      contractor_id?: {
        name: string;
      };
      name?: string;
    }
  | string;
export const employeeColumns: ColumnDef<ReturnType<typeof formatEmployeesForTable>[0], unknown>[] = [
  {
    id: 'actions',
    cell: ({ row }: { row: any }) => {
      const share = useLoggedUserStore((state) => state.sharedCompanies);
      const profile = useLoggedUserStore((state) => state.credentialUser?.id);
      const owner = useLoggedUserStore((state) => state.actualCompany?.owner_id.id);
      const users = useLoggedUserStore((state) => state);
      const company = useLoggedUserStore((state) => state.actualCompany?.id);

      let role = '';
      if (owner === profile) {
        role = users?.actualCompany?.owner_id?.role as string;
      } else {
        // const roleRaw = share?.filter((item: any) => Object.values(item).some((value) => typeof value === 'string' && value.includes(profile as string))).map((item: any) => item.role);
        const roleRaw = share
          ?.filter(
            (item: any) =>
              item.company_id.id === company &&
              Object.values(item).some((value) => typeof value === 'string' && value.includes(profile as string))
          )
          .map((item: any) => item.role);
        role = roleRaw?.join('');
        // role = users?.actualCompany?.share_company_users?.[0]?.role as string;
      }

      const [showModal, setShowModal] = useState(false);
      const [integerModal, setIntegerModal] = useState(false);
      const [document, setDocument] = useState('');
      const user = row.original;

      const handleOpenModal = (id: string) => {
        setDocument(id);
        setShowModal(!showModal);
      };
      const fetchDocuments = useLoggedUserStore((state) => state.documetsFetch);
      const setInactiveEmployees = useLoggedUserStore((state) => state.setInactiveEmployees);
      const setActivesEmployees = useLoggedUserStore((state) => state.setActivesEmployees);
      const setShowDeletedEmployees = useLoggedUserStore((state) => state.setShowDeletedEmployees);
      const employees = useLoggedUserStore((state) => state.employeesToShow);

      const handleOpenIntegerModal = (id: string) => {
        setDocument(id);
        setIntegerModal(!integerModal);
      };

      const { errorTranslate } = useEdgeFunctions();

      const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          reason_for_termination: undefined,
        },
      });
      const router = useRouter();

      async function reintegerEmployee() {
        const documentToUpdate = useLoggedUserStore
          ?.getState()
          ?.active_and_inactive_employees.find((e: any) => e.document_number === document)
          .documents_employees?.filter((e: any) => e.id_document_types.down_document)
          ?.map((e: any) => e.id);

        try {
          await supabase
            .from('employees')
            .update({
              is_active: true,
              termination_date: null,
              reason_for_termination: null,
            })
            .eq('document_number', document);

          documentToUpdate.forEach(async (element: string) => {
            const { data, error } = await supabase
              .from('documents_employees')
              .update({
                document_path: null,
                state: 'pendiente',
              })
              .eq('id', element);
          });

          setIntegerModal(!integerModal);
          setActivesEmployees();
          setShowDeletedEmployees(false);
          router.refresh();
          fetchDocuments();
          toast('Empleado reintegrado', { description: `El empleado ${user.full_name} ha sido reintegrado` });
        } catch (error: any) {
          const message = await errorTranslate(error?.message);
          toast('Error al reintegrar al empleado', { description: message });
        }
      }

      async function onSubmit(values: z.infer<typeof formSchema>) {
        const data = {
          ...values,
          termination_date: format(values.termination_date, 'yyyy-MM-dd'),
        };

        try {
          await supabase
            .from('employees')
            .update({
              is_active: false,
              termination_date: data.termination_date,
              reason_for_termination: data.reason_for_termination,
            })
            .eq('document_number', document)
            .select();

          setShowModal(!showModal);

          toast('Empleado eliminado', { description: `El empleado ${user.full_name} ha sido eliminado` });
          setActivesEmployees();
          router.refresh();
          fetchDocuments();
        } catch (error: any) {
          const message = await errorTranslate(error?.message);
          toast('Error al dar de baja al empleado', { description: message });
        }
      }
      const today = new Date();
      const nextMonth = addMonths(new Date(), 1);
      const [month, setMonth] = useState<Date>(nextMonth);

      const yearsAhead = Array.from({ length: 20 }, (_, index) => {
        const year = today.getFullYear() - index - 1;
        return year;
      });
      const [years, setYear] = useState(today.getFullYear().toString());

      return (
        <DropdownMenu>
          {integerModal && (
            <AlertDialog defaultOpen onOpenChange={() => setIntegerModal(!integerModal)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {`Estás a punto de reintegrar al empleado ${user.full_name}, quien fue dado de baja por ${user.reason_for_termination} el día ${user.termination_date}. Al reintegrar al empleado, se borrarán estas razones. Si estás seguro de que deseas reintegrarlo, haz clic en 'Continuar'. De lo contrario, haz clic en 'Cancelar'.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => reintegerEmployee()}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {showModal && (
            <Dialog defaultOpen onOpenChange={() => setShowModal(!showModal)}>
              <DialogContent className="dark:bg-slate-950">
                <DialogTitle>Dar de baja</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro de que deseas eliminar este empleado?
                  <br /> Completa los campos para continuar.
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
                              <FormLabel>Motivo de baja</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona la razón" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Despido sin causa">Despido sin causa</SelectItem>
                                  <SelectItem value="Renuncia">Renuncia</SelectItem>
                                  <SelectItem value="Despido con causa">Despido con causa</SelectItem>
                                  <SelectItem value="Acuerdo de partes">Acuerdo de partes</SelectItem>
                                  <SelectItem value="Fin de contrato">Fin de contrato</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>Elige la razón por la que deseas eliminar al empleado</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="termination_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Fecha de baja</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={'outline'}
                                      className={cn(
                                        ' pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, 'PPP', {
                                          locale: es,
                                        })
                                      ) : (
                                        <span>Elegir fecha</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" align="start">
                                  <Select
                                    onValueChange={(e) => {
                                      setMonth(new Date(e));
                                      setYear(e);
                                      const newYear = parseInt(e, 10);
                                      const dateWithNewYear = new Date(field.value);
                                      dateWithNewYear.setFullYear(newYear);
                                      field.onChange(dateWithNewYear);
                                      setMonth(dateWithNewYear);
                                    }}
                                    value={years || today.getFullYear().toString()}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Elegir año" />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                      <SelectItem
                                        value={today.getFullYear().toString()}
                                        disabled={years === today.getFullYear().toString()}
                                      >
                                        {today.getFullYear().toString()}
                                      </SelectItem>
                                      {yearsAhead?.map((year) => (
                                        <SelectItem key={year} value={`${year}`}>
                                          {year}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Calendar
                                    month={month}
                                    onMonthChange={setMonth}
                                    toDate={today}
                                    locale={es}
                                    mode="single"
                                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                    selected={new Date(field.value) || today}
                                    onSelect={(e) => {
                                      field.onChange(e);
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormDescription>Fecha en la que se terminó el contrato</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-4 justify-end">
                          <Button variant="destructive" type="submit">
                            Eliminar
                          </Button>
                          <DialogClose>Cancelar</DialogClose>
                        </div>
                      </form>
                    </Form>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <DropdownMenuTrigger asChild>
            {/* {role === "Invitado" ? null : ( */}
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <DotsVerticalIcon className="h-4 w-4" />
            </Button>
            {/* )} */}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Opciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.document_number)}>
              Copiar DNI
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href={`/dashboard/employee/action?action=view&employee_id=${user?.id}`}>Ver empleado</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              {role !== 'Invitado' && (
                <Link href={`/dashboard/employee/action?action=edit&employee_id=${user?.id}`}>Editar empleado</Link>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              {role !== 'Invitado' && (
                <Fragment>
                  {user.is_active ? (
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenModal(user?.document_number)}
                      className="text-sm"
                    >
                      Dar de baja
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleOpenIntegerModal(user?.document_number)}
                      className="text-sm"
                    >
                      Reintegrar Empleado
                    </Button>
                  )}
                </Fragment>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'fullName',
    id: 'Nombre',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => {
      const fullName = `${row.original.fullName}`;
      return (
        <div className="font-medium flex gap-2 items-center w-[200px] capitalize">
          <PersonIcon />
          {fullName}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const fullName = `${row.original.fullName}`.toLowerCase();

      // Verificar si el valor es un array (desde el filtro de facetas) o un string (desde el campo de búsqueda)
      if (Array.isArray(value)) {
        return value.some((val) => fullName.includes(String(val).toLowerCase()));
      }

      // Asegurar que value sea tratado como string
      return fullName.includes(String(value).toLowerCase());
    },
  },
  {
    accessorKey: 'nationality',
    id: 'Nacionalidad',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nacionalidad" />,
    cell: ({ row }) => {
      return <div>{row.original.nationality || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'born_date',
    id: 'Nacimiento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nacimiento" />,
    cell: ({ row }) => {
      return <div>{row.original.born_date ? moment(row.original.born_date).format('DD/MM/YYYY') : '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    //Cuil
    accessorKey: 'cuil',
    id: 'Cuil',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuil" />,
    cell: ({ row }) => {
      return <div>{row.original.cuil || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    //Tipo de documento
    accessorKey: 'document_type',
    id: 'Tipo de Documento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
    cell: ({ row }) => {
      return <div>{row.original.document_type}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'document_number',
    id: 'Documento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          {/* <IdCardIcon /> */}
          {row.original.document_number}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'gender',
    id: 'Genero',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Genero" />,
    cell: ({ row }) => {
      return <div>{row.original.gender || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'marital_status',
    id: 'Estado Civil',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado Civil" />,
    cell: ({ row }) => {
      return <div>{row.original.marital_status || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'level_of_education',
    id: 'Nivel de Educacion',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel de Educacion" />,
    cell: ({ row }) => {
      return <div>{row.original.level_of_education || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'street',
    id: 'Calle',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Calle" />,
    cell: ({ row }) => {
      return <div>{row.original.street || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'street_number',
    id: 'Altura',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Altura" />,
    cell: ({ row }) => {
      return <div>{row.original.street_number || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'province',
    id: 'Provincia',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
    cell: ({ row }) => {
      return <div>{row.original.province || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'city',
    id: 'Ciudad',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
    cell: ({ row }) => {
      return <div>{row.original.city || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'postal_code',
    id: 'CP',
    header: ({ column }) => <DataTableColumnHeader column={column} title="CP" />,
    cell: ({ row }) => {
      return <div>{row.original.postal_code || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'phone',
    id: 'Teléfono',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    cell: ({ row }) => {
      return <div>{row.original.phone || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'email',
    id: 'Email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      return <div>{row.original.email || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'file',
    id: 'Legajo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
    cell: ({ row }) => {
      return <div>{row.original.file || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'hierarchical_position',
    id: 'Sector',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
    cell: ({ row }) => {
      return <div>{row.original.hierarchical_position}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'company_position',
    id: 'Puesto',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
    cell: ({ row }) => {
      return <div>{row.original.company_position || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'workflow_diagram',
    id: 'Diagrama',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Diagrama" />,
    cell: ({ row }) => {
      return <div>{row.original.workflow_diagram || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    //Horas normales
    accessorKey: 'normal_hours',
    id: 'Horas',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Horas" />,
    cell: ({ row }) => {
      return <div>{row.original.normal_hours}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    //Tipo de contrato
    accessorKey: 'type_of_contract',
    id: 'Tipo de Contrato',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Contrato" />,
    cell: ({ row }) => {
      return <div>{row.original.type_of_contract}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },

  {
    accessorKey: 'contractor_employee',
    id: 'Afectaciones',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
    cell: ({ row }) => {
      const contractors = row.original.contractor_employee || [];

      // Si no hay contratistas, mostramos "Sin afectar"
      if (contractors.length === 0) {
        return <Badge>Sin afectar</Badge>;
      }

      // Define the contractor type
      // Get contractor names
      const contractorNames = contractors
        .map((contractor) => {
          if (typeof contractor === 'string') return contractor;
          return contractor?.customers?.name || '';
        })
        .filter((name): name is string => Boolean(name));

      const firstContractor = contractorNames[0] || '—';

      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex">
                <Badge>
                  {firstContractor}
                  {contractorNames.length > 1 && ` +${contractorNames.length - 1}`}
                </Badge>
              </div>
            </TooltipTrigger>
            {contractorNames.length > 1 && (
              <TooltipContent className="text-white bg-black rounded-lg p-2">
                <div className="flex flex-col gap-1">
                  {contractorNames.map((name, index) => (
                    <span key={index}>{name}</span>
                  ))}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    },
    filterFn: (row, id, filterValue) => {
      // Si no hay filtro o el array está vacío, mostramos todas las filas
      if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
        return true;
      }

      const contractors = row.original.contractor_employee || [];

      // Si no hay contratistas, no mostramos la fila
      if (contractors.length === 0) {
        return false;
      }

      // Comprobamos si algún contratista coincide con el filtro
      return contractors.some((contractor) => {
        const name = contractor?.customers?.name;
        return name && filterValue.flat().includes(name);
      });
    },
  },

  {
    accessorKey: 'date_of_admission',
    id: 'Fecha de ingreso',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de ingreso" />,
    cell: ({ row }) => {
      return <div>{row.original.date_of_admission || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'cost_center_name',
    id: 'Centro de costo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro de costo" />,
    cell: ({ row }) => {
      return <div>{row.original.cost_center_name || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'affiliate_status',
    id: 'Estado de afiliación',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de afiliación" />,
    cell: ({ row }) => {
      return <div>{row.original.affiliate_status || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'status',
    id: 'Estado',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
      type StatusType = 'Completo' | 'Incompleto' | 'Completo con doc vencida' | 'default';

      const variantStatus: Record<StatusType, BadgeVariant> = {
        Completo: 'success',
        Incompleto: 'destructive',
        'Completo con doc vencida': 'yellow',
        default: 'default',
      };
      return (
        <Badge
          variant={row.original.status ? variantStatus[row.original.status as StatusType] || 'default' : 'default'}
          className="capitalize"
        >
          {row.original.status || 'Sin estado'}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
];
