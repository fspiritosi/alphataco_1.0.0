'use client';

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

export function PreparteTable({ data, onEdit, onDelete, savedVisibility = {} }: PreparteTableProps) {
  const columns: ColumnDef<PreparteItem>[] = [
    {
      accessorKey: 'clienteName',
      header: 'Cliente',
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
          <Button variant="ghost" size="icon" onClick={() => onDelete(row.original.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return <BaseDataTable columns={columns} data={data} savedVisibility={savedVisibility} />;
}
