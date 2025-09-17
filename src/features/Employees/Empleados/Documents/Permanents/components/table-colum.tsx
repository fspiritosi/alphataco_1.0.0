'use client';

import SimpleDocument from '@/components/SimpleDocument';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useLoggedUserStore } from '@/store/loggedUser';
import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import Link from 'next/link';
import { useState } from 'react';
import { fetchInitialPermanentDocuments } from '../lib/actions/actions';

type EmployeeData = Awaited<ReturnType<typeof fetchInitialPermanentDocuments>>['rows'][0];

export const columnsEmployeeDocumentServer: ColumnDef<EmployeeData>[] = [
  {
    accessorKey: 'employees.lastname',
    id: 'employees.lastname',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row, table }) => {
      return (
        <Link
          href={`/dashboard/employee/action?action=view&employee_id=${row.original.employees?.id}`}
          className="hover:underline"
          target="_blank"
        >
          {row.original.employees?.lastname + ' ' + row.original.employees?.firstname}
        </Link>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'document_types.name',
    id: 'document_types.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  // {
  //   accessorKey: 'intern_number',
  //   id: 'Numero Interno',
  //   header: ({ column, table, header }) => {
  //     const rowId = column.id; // Suponiendo que props.column.id contiene el id de la fila
  //     const row = table.getRowModel().rows.some((e) => e.original.intern_number);

  //     if (!row) return null;
  //     return (
  //       <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
  //         Numero interno
  //         <ArrowUpDown className="ml-2 h-4 w-4" />
  //       </Button>
  //     );
  //   },

  //   cell: ({ row, table }) => {
  //     const isHide = table.getRowModel().rows.some((e) => e.original.intern_number);
  //     if (!isHide) return null;
  //     return <p>{row.original.intern_number}</p>;
  //   },
  //   filterFn: (row, id, value) => {
  //     return value.includes(row.getValue(id));
  //   },
  // },
  // {
  //   accessorKey: 'allocated_to_names',
  //   id: 'Afectado a',
  //   header: ({ column }) => <DataTableColumnHeader column={column} title="Afectado a" />,
  //   cell: ({ row }) => {
  //     const allocatedTo: any = row.original.allocated_to_names;
  //     if (!allocatedTo || allocatedTo.length === 0) return null;
  //     const [first, ...rest] = allocatedTo;
  //     if (rest.length === 0) {
  //       return <Badge variant="default">{first}</Badge>;
  //     }
  //     return (
  //       <>
  //         <TooltipProvider delayDuration={100}>
  //           <Tooltip>
  //             <TooltipTrigger>
  //               <Badge variant="default" className="cursor-pointer select-none">
  //                 {first} +{rest.length}
  //               </Badge>
  //             </TooltipTrigger>
  //             <TooltipContent>
  //               <div className="flex flex-col gap-1">
  //                 {rest.map((prov: any) => (
  //                   <p key={prov}>{prov}</p>
  //                 ))}
  //               </div>
  //             </TooltipContent>
  //           </Tooltip>
  //         </TooltipProvider>
  //       </>
  //     );
  //   },
  //   filterFn: (row, id, value) => {
  //     const customerNames = row.getValue(id) || [];
  //     if (!Array.isArray(customerNames) || !Array.isArray(value)) return false;

  //     // Values are already customer names, just check for inclusion
  //     return value.some((val) => customerNames.includes(val));
  //   },
  // },

  {
    accessorKey: 'document_types.mandatory',
    id: 'document_types.mandatory',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mandatorio" />,
    cell: ({ row }) => {
      return <p>{row.original.document_types?.mandatory ? 'Sí' : 'No'}</p>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'state',
    id: 'state',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const variants: {
        [key: string]: 'destructive' | 'success' | 'default' | 'secondary' | 'outline' | 'yellow' | null | undefined;
      } = {
        vencido: 'yellow',
        rechazado: 'destructive',
        pendiente: 'destructive',
        aprobado: 'success',
        presentado: 'default',
      };
      return <Badge variant={variants[row.original?.state || '']}>{row.original?.state}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'document_types.multiresource',
    id: 'document_types.multiresource',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Multirecurso" />,
    cell: ({ row }) => {
      return <p>{row.original.document_types?.multiresource ? 'Sí' : 'No'}</p>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'validity',
    id: 'Vencimiento',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => {
      const hasEndDate = row.original.document_types?.explired;
      if (!hasEndDate) {
        return <Badge variant={'outline'}>No vence</Badge>;
      }

      const isNoPresented = row.original.state === 'pendiente';

      if (isNoPresented) {
        return <Badge variant={'destructive'}>Pendiente</Badge>;
      } else {
        if (row.original.validity) {
          return moment(row.original.validity).format('DD/MM/YYYY');
        } else {
          return <Badge variant={'outline'}>No vence</Badge>;
        }
      }
    },
  },
  {
    accessorKey: 'created_at',
    id: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subido el" />,
    cell: ({ row }) => {
      const isNoPresented = row.original.state === 'pendiente';

      if (isNoPresented) {
        return 'No disponible';
      } else {
        const [day, month, year] = row.original.created_at.split('/');
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        return date.toLocaleDateString();
      }
    },
  },
  {
    accessorKey: 'id',
    id: 'Revisar documento',
    header: 'Revisar documento',
    cell: ({ row }) => {
      const isNoPresented = row.original.state === 'pendiente';
      const role = useLoggedUserStore?.getState?.().roleActualCompany;

      const [open, setOpen] = useState(false);

      const handleOpen = () => setOpen(!open);
      const applies = row.original.applies === 'Persona' ? 'empleado' : 'equipo';

      if (isNoPresented) {
        return (
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              {role !== 'Invitado' && <Button variant="outline">Subir documento</Button>}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="max-h-[90vh] overflow-y-auto">
                  <div className="space-y-3">
                    <div>
                      <SimpleDocument
                        resource={'empleado'}
                        handleOpen={() => handleOpen()}
                        defaultDocumentId={row.original.id_document_types!}
                        // document={document}
                        numberDocument={row.original.employees?.document_number}
                      />
                    </div>
                  </div>
                </div>
              </AlertDialogHeader>
            </AlertDialogContent>
          </AlertDialog>
        );
      }

      return (
        <Link href={`/dashboard/document/${row.original.id}?resource=${row.original.applies}`}>
          <Button>Ver documento</Button>
        </Link>
      );
    },
  },
];
