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
import { Contrato, PreparteItem } from './PreparteManager';

interface PreparteTableProps {
  data: PreparteItem[];
  contratos: Contrato[];
  items: Array<{ id: string; item_name: string }>;
  onEdit: (item: PreparteItem) => void;
  onDelete: (id: string) => void;
  savedVisibility?: VisibilityState;
}

const getColumns = (
  onEdit: (item: PreparteItem) => void,
  onDelete: (id: string) => void,
  contratos: Contrato[],
  items: Array<{ id: string; item_name: string }>
): ColumnDef<PreparteItem>[] => [
  {
    accessorKey: 'clienteName',
    header: 'Cliente',
  },
  {
    accessorKey: 'contratoId',
    header: 'Contrato',
    cell: ({ row }) => {
      const contratoId = row.original.contratoId;
      const contrato = contratos.find((c) => c.id === contratoId);
      return contrato?.service_name || contratoId || '-';
    },
  },
  {
    accessorKey: 'items',
    header: 'Item',
    cell: ({ row }) => {
      const itemIds = row.original.items || [];
      if (itemIds.length === 0) return '-';

      // Find the item by ID
      const item = items.find((i) => i.id === itemIds[0]?.id);
      return item?.item_name || itemIds[0]?.id || '-';
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
    cell: ({ row }) => {
      const executionDate = row.original.executionDate?.from;
      return executionDate ? new Date(executionDate).toLocaleDateString() : '-';
    },
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
    accessorKey: 'start_time',
    header: 'H. Inicio',
    cell: ({ row }) => <div>{row.getValue('start_time')}</div>,
  },
  {
    accessorKey: 'end_time',
    header: 'H. Fin',
    cell: ({ row }) => <div>{row.getValue('end_time')}</div>,
  },
  {
    accessorKey: 'solicitante',
    header: 'Solicitante',
    cell: ({ row }) => <div>{row.getValue('solicitante')}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <div>{row.getValue('status')}</div>,
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

export function PreparteTable({ data, contratos, items, onEdit, onDelete, savedVisibility = {} }: PreparteTableProps) {
  console.log(data);
  return (
    <BaseDataTable
      columns={getColumns(onEdit, onDelete, contratos, items)}
      data={data}
      savedVisibility={savedVisibility}
    />
  );
}
