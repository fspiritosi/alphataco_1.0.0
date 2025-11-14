'use client';

import SimpleDocument from '@/components/SimpleDocument';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { useLoggedUserStore } from '@/store/loggedUser';
import { ExclamationTriangleIcon, PersonIcon } from '@radix-ui/react-icons';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import Link from 'next/link';
import { useState } from 'react';
import { fetchEmployeeExpiringDocuments } from '../actions/server-actions';
import { DataTableOptions } from './data-table-options';

// 🔑 CRÍTICO: Tipo inferido automáticamente del retorno de la función del servidor
type EmployeeExpiringDocData = Awaited<ReturnType<typeof fetchEmployeeExpiringDocuments>>['rows'][0];

// 🔑 Tipo extendido para exportación
type ExtendedColumnDef<T> = ColumnDef<T> & {
  exportFormatter?: (value: any, row: T) => string;
  excludeFromExport?: boolean;
};

export const employeesExpiringColumnsServer: ExtendedColumnDef<EmployeeExpiringDocData>[] = [
  {
    id: 'actions',
    cell: ({ row }: { row: any }) => {
      return <DataTableOptions row={row} />;
    },
    excludeFromExport: true,
  },
  {
    accessorKey: 'employees.lastname',
    id: 'employees.lastname', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleados" />,
    cell: ({ row }) => {
      const employee = row.original.employees;
      if (!employee) return null;

      return (
        <Link href={`/dashboard/employee/action?action=view&employee_id=${employee.id}`} className="hover:underline">
          <div className="flex gap-2">
            <PersonIcon />
            {`${employee.lastname} ${employee.firstname}`}
          </div>
        </Link>
      );
    },
    enableHiding: false,
    filterFn: (row, _id, value) => {
      const employee = row.original.employees;
      if (!employee) return false;
      const fullName = `${employee.lastname} ${employee.firstname}`;
      return value.includes(fullName);
    },
    exportFormatter: (_value, row) => {
      const employee = row.employees;
      return employee ? `${employee.lastname} ${employee.firstname}` : '';
    },
  },
  {
    accessorKey: 'document_types.name',
    id: 'document_types.name', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documentos" />,
    cell: ({ row }) => <div>{row.original.document_types?.name || ''}</div>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (_value, row) => {
      return row.document_types?.name || '';
    },
  },
  {
    accessorKey: 'validity',
    id: 'validity', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => {
      const validity = row.original.validity;
      if (!validity) return null;

      const expirationDate = moment(validity);
      const currentDate = moment();
      const daysDifference = expirationDate.diff(currentDate, 'days');

      let iconColor = '';

      if (daysDifference < 0) {
        iconColor = 'red';
      } else if (daysDifference <= 7) {
        iconColor = 'orange';
      }

      return (
        <div className="flex gap-2 items-center">
          {iconColor && <ExclamationTriangleIcon style={{ color: iconColor }} />}
          {expirationDate.format('DD/MM/YYYY')}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (_value, row) => {
      return row.validity ? moment(row.validity).format('DD/MM/YYYY') : '';
    },
  },
  {
    accessorKey: 'created_at',
    id: 'created_at', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subido el" />,
    cell: ({ row }) => {
      const createdAt = row.original.created_at;
      return createdAt ? <div>{moment(createdAt).format('DD/MM/YYYY')}</div> : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (_value, row) => {
      return row.created_at ? moment(row.created_at).format('DD/MM/YYYY') : '';
    },
  },
  {
    id: 'review_document',
    header: 'Revisar documento',
    cell: ({ row }) => {
      const isNoPresented = row.original.state === 'pendiente';
      const role = useLoggedUserStore?.getState?.().roleActualCompany;

      const [open, setOpen] = useState(false);

      const handleOpen = () => setOpen(!open);
      const applies = 'empleado';

      if (isNoPresented) {
        return (
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              {role !== 'Invitado' && <Button variant="outline">Subir documento</Button>}
            </AlertDialogTrigger>
            <AlertDialogContent asChild>
              <AlertDialogHeader>
                <div className="max-h-[90vh] overflow-y-auto">
                  <div className="space-y-3">
                    <div>
                      <SimpleDocument
                        resource={applies}
                        handleOpen={() => handleOpen()}
                        defaultDocumentId={row.original.document_types?.id}
                        numberDocument={row.original.employees?.document_number || row.original.employees?.id}
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
        <Link href={`/dashboard/document/${row.original.id}?resource=Persona`}>
          <Button>Ver documento</Button>
        </Link>
      );
    },
    excludeFromExport: true,
  },
];
