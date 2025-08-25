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
import { Button } from '@/components/ui/button';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { PreparteItem } from './PreparteManager';

interface PreparteTableProps {
  data: PreparteItem[];
  onEdit: (item: PreparteItem) => void;
  onDelete: (id: string) => void;
  savedVisibility?: VisibilityState;
}

const getColumns = (
  onEdit: (item: PreparteItem) => void,
  onDelete: (id: string) => void
): ColumnDef<PreparteItem>[] => [
  {
    accessorKey: 'clienteName',
    header: 'Cliente',
  },
  {
    accessorKey: 'contratoId',
    header: 'Contrato',
  },
  {
    accessorKey: 'items',
    header: 'Item',
    cell: ({ row }) => {
      const items = row.original.items || [];
      return items.length > 0 ? items[0].id : '-';
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    cell: ({ row }) => {
      const items = row.original.items || [];
      return items.length > 0 ? items[0].quantity : '-';
    },
  },
  {
    accessorKey: 'requestDate',
    header: 'Fecha de Solicitud',
    cell: ({ row }) => <div>{new Date(row.getValue('requestDate')).toLocaleDateString()}</div>,
  },
  {
    accessorKey: 'executionDate',
    header: 'Fecha de Ejecución',
    cell: ({ row }) => <div>{new Date(row.getValue('executionDate')).toLocaleDateString()}</div>,
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => <div>{row.getValue('tipo')}</div>,
  },
  {
    accessorKey: 'jornada',
    header: 'Jornada',
    cell: ({ row }) => <div>{row.getValue('jornada')}</div>,
  },
  {
    accessorKey: 'horario',
    header: 'Horario',
    cell: ({ row }) => <div>{row.getValue('horario')}</div>,
  },
  {
    accessorKey: 'solicitante',
    header: 'Solicitante',
    cell: ({ row }) => <div>{row.getValue('solicitante')}</div>,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <div>{row.getValue('estado')}</div>,
  },
  {
    accessorKey: 'observaciones',
    header: 'Observaciones',
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(row.original)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro que deceas eliminar este preparte?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará el registro permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(row.original.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    ),
  },
];

export function PreparteTable({ data, onEdit, onDelete, savedVisibility = {} }: PreparteTableProps) {
  console.log(data);

  return <BaseDataTable columns={getColumns(onEdit, onDelete)} data={data} savedVisibility={savedVisibility} />;
}
