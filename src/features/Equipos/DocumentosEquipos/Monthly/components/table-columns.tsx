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
import { fetchMonthlyEquipmentDocumentsData } from './lib/actions/actions';

// 🔑 CRÍTICO: Tipo inferido automáticamente del retorno de Supabase
type MonthlyEquipmentDocumentData = Awaited<ReturnType<typeof fetchMonthlyEquipmentDocumentsData>>['rows'][0];

// 🔑 IMPORTANTE: Tipo extendido para exportación
type ExtendedColumnDef<TData> = ColumnDef<TData> & {
  exportFormatter?: (value: any, row: TData) => string;
  excludeFromExport?: boolean;
};

export const columnsMonthlyEquipmentDocumentServer: ExtendedColumnDef<MonthlyEquipmentDocumentData>[] = [
  // ✅ MANTENER: Columna "Equipo" (equivalente a empleado)
  {
    accessorKey: 'vehicles.domain', // 🔑 AJUSTADO: Para server data
    id: 'vehicles.domain', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo" />,
    cell: ({ row }) => (
      <Link
        href={`/dashboard/equipment/action?action=view&equipment_id=${row.original.vehicles?.id}`}
        className="hover:underline "
        target="_blank"
      >
        {/* ✅ MANTENER: Mostrar serie y dominio */}
        {row.original.vehicles?.domain || row.original.vehicles?.serie}
      </Link>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (value, row) => {
      return `${row.vehicles?.serie || ''} - ${row.vehicles?.domain || ''}`.trim();
    },
  },

  // ✅ MANTENER: Columna "Documento" (mismo nombre y comportamiento)
  {
    accessorKey: 'document_types.name', // 🔑 AJUSTADO: Para server data
    id: 'document_types.name', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    cell: ({ row }) => <span className="font-medium">{row.original.document_types?.name}</span>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    exportFormatter: (value, row) => {
      return row.document_types?.name || '';
    },
  },

  // ✅ MANTENER: Columna "Tipo de Documento" (para filtros)
  {
    accessorKey: 'document_types.name',
    id: 'Tipo de Documento',
    header: undefined, // Oculta la columna pero permite filtros
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  // ✅ MANTENER: Columna "Afectado a" (igual que empleados pero con contractor_equipment)
  {
    accessorKey: 'vehicles.contractor_equipment',
    id: 'vehicles.contractor_equipment', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Afectado a" />,
    cell: ({ row }) => {
      const allocatedTo =
        row.original.vehicles?.contractor_equipment?.map((ce: any) => ce.customers?.name).filter(Boolean) || [];
      if (allocatedTo.length === 0) return null;

      const [first, ...rest] = allocatedTo;
      if (rest.length === 0) {
        return <Badge variant="default">{first}</Badge>;
      }
      return (
        <Badge variant="default" className="cursor-pointer select-none">
          {first} +{rest.length}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      const customerNames =
        row.original.vehicles?.contractor_equipment?.map((ce: any) => ce.customers?.name).filter(Boolean) || [];
      if (!Array.isArray(customerNames) || !Array.isArray(value)) return false;
      return value.some((val) => customerNames.includes(val));
    },
    exportFormatter: (value, row) => {
      const allocatedTo =
        row.vehicles?.contractor_equipment?.map((ce: any) => ce.customers?.name).filter(Boolean) || [];
      return allocatedTo.join(', ');
    },
  },

  // ✅ MANTENER: Columna "Mandatorio" (igual que empleados)
  {
    accessorKey: 'document_types.mandatory',
    id: 'document_types.mandatory', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mandatorio" />,
    cell: ({ row }) => <span>{row.original.document_types?.mandatory ? 'Si' : 'No'}</span>,
    filterFn: (row, id, value) => {
      const mandatory = row.original.document_types?.mandatory ? 'Si' : 'No';
      return value.includes(mandatory);
    },
    exportFormatter: (value, row) => {
      return row.document_types?.mandatory ? 'Si' : 'No';
    },
  },

  // ✅ MANTENER: Columna "Estado" (mismo nombre, colores y comportamiento)
  {
    accessorKey: 'state',
    id: 'state', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      // ✅ MANTENER: Mismas variantes de color
      const variants: {
        [key: string]: 'destructive' | 'success' | 'default' | 'secondary' | 'outline' | 'yellow';
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
    exportFormatter: (value, row) => {
      return row.state || '';
    },
  },

  // ✅ MANTENER: Columna "Multirecurso" (igual que empleados)
  {
    accessorKey: 'document_types.multiresource',
    id: 'document_types.multiresource', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Multirecurso" />,
    cell: ({ row }) => <span>{row.original.document_types?.multiresource ? 'Si' : 'No'}</span>,
    filterFn: (row, id, value) => {
      const multiresource = row.original.document_types?.multiresource ? 'Si' : 'No';
      return value.includes(multiresource);
    },
    exportFormatter: (value, row) => {
      return row.document_types?.multiresource ? 'Si' : 'No';
    },
  },

  // ✅ MANTENER: Columna "Fecha" (Subido el)
  {
    accessorKey: 'created_at',
    id: 'created_at', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subido el" />,
    cell: ({ row }) => {
      const isNoPresented = row.original.state === 'pendiente';
      if (isNoPresented) {
        return 'No disponible';
      } else {
        // Usar el log más reciente o created_at
        const latestLog = row.original.documents_equipment_logs?.sort(
          (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
        const date = latestLog?.updated_at || row.original.created_at;
        return moment(date).format('DD/MM/YYYY');
      }
    },
    exportFormatter: (value, row) => {
      if (row.state === 'pendiente') return 'No disponible';
      const latestLog = row.documents_equipment_logs?.sort(
        (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0];
      const date = latestLog?.updated_at || row.created_at;
      return moment(date).format('DD/MM/YYYY');
    },
  },

  // ✅ MANTENER: Columna "Periodo" (igual que empleados)
  {
    accessorKey: 'period',
    id: 'period', // 🔑 CRÍTICO: DEBE SER IGUAL AL accessorKey
    header: ({ column }) => <DataTableColumnHeader column={column} title="Periodo" />,
    cell: ({ row }) => <span>{row.original.period || '-'}</span>,
    exportFormatter: (value, row) => {
      return row.period || '-';
    },
  },

  // ✅ MANTENER: Columna "Revisar documento" (mismo nombre y funcionalidad)
  {
    accessorKey: 'id',
    id: 'Revisar documento',
    header: 'Revisar documento',
    cell: ({ row }) => {
      const isNoPresented = row.original.state === 'pendiente';
      const role = useLoggedUserStore?.getState?.().roleActualCompany;

      const [open, setOpen] = useState(false);

      const handleOpen = () => setOpen(!open);

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
                        resource={'equipo'}
                        handleOpen={() => handleOpen()}
                        defaultDocumentId={row.original.id_document_types!}
                        // document={document}
                        numberDocument={row.original.vehicles?.serie || undefined}
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
        <Link href={`/dashboard/document/${row.original.id}?resource=${row.original.vehicles ? 'Equipos' : 'Persona'}`}>
          <Button>Ver documento</Button>
        </Link>
      );
    },
  },
];

// 🔑 IMPORTANTE: Exportar el tipo para usar en otros componentes
export type { MonthlyEquipmentDocumentData };
