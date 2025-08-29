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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cliente } from '@/features/Operaciones/Preparte/components/PreparteManager';
import { cn } from '@/lib/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { ArrowUpDown, Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Contrato, PreparteItem } from './PreparteManager';
interface PreparteTableProps {
  data: PreparteItem[];
  contratos: Contrato[];
  Customers: Cliente[];
  items: Array<{ id: string; item_name: string }>;
  onEdit: (item: PreparteItem) => void;
  onDelete: (id: string) => void;
  onConfirm: (item: PreparteItem) => void; // New prop
  savedVisibility?: VisibilityState;
}

const getColumns = (
  onEdit: (item: PreparteItem) => void,
  onDelete: (id: string) => void,
  onConfirm: (item: PreparteItem) => void,
  deleteItemId: string | null,
  setDeleteItemId: (id: string | null) => void,
  Customers: Cliente[],
  contratos: Contrato[],
  items: Array<{ id: string; item_name: string }>
): ColumnDef<PreparteItem>[] => [
  {
    accessorKey: 'requestDate',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Fecha de Solicitud
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => <div>{new Date(row.getValue('requestDate')).toLocaleDateString()}</div>,
    sortingFn: (rowA, rowB, columnId) => {
      const dateA = new Date(rowA.getValue(columnId)).getTime();
      const dateB = new Date(rowB.getValue(columnId)).getTime();
      return dateA - dateB;
    },
  },
  {
    accessorKey: 'executionDate',
    header: 'Fecha de Ejecución',
    cell: ({ row }) => {
      const executionDate = row.original.executionDate;
      return executionDate ? new Date(executionDate as any).toLocaleDateString() : '-';
    },
  },
  {
    accessorKey: 'cliente_id',
    header: 'Cliente',
    cell: ({ row }) => {
      const clienteId = row.original.cliente_id;
      const cliente = Customers.find((c) => c.id === clienteId);
      return cliente?.name || clienteId || '-';
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },

    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    accessorKey: 'contrato_id',
    header: 'Contrato',
    cell: ({ row }) => {
      const contratoId = row.original.contrato_id;
      const contrato = contratos.find((c) => c.id === contratoId);
      return contrato?.service_name || contratoId || '-';
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'item',
    header: 'Item',
    cell: ({ row }) => {
      const itemId = row.original.item; // Now it's a direct string ID
      if (!itemId) return '-';

      // Find the item by ID
      const itemFila = items.find((i) => (i.id as string) === itemId.toString());
      return itemFila?.item_name || itemId || '-';
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      return quantity || '-';
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
    cell: ({ row }) => {
      const status = row.getValue('status');
      let statusElement: React.ReactNode;

      switch (status) {
        case 'pendiente':
          statusElement = <Badge variant="default">Pendiente</Badge>;
          break;
        case 'reprogramado':
          statusElement = <Badge variant="warning">Reprogramado</Badge>;
          break;
        case 'cancelado':
          statusElement = <Badge variant="destructive">Cancelado</Badge>;
          break;
        case 'rechazado':
          statusElement = <Badge variant="destructive">Rechazado</Badge>;
          break;
        case 'confirmado':
          statusElement = <Badge variant="success">Confirmado</Badge>;
          break;
        default:
          statusElement = status as string;
      }

      return <div>{statusElement}</div>;
    },
    filterFn: (row, id, value) => {
      // value es el array de valores seleccionados en el filtro
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'reason',
    header: 'Motivo',
    cell: ({ row }) => {
      const { status, cancel_reason, rejected_reason, reprogram_reason } = row.original;

      if (status === 'cancelado' && cancel_reason) {
        return <div>{cancel_reason}</div>;
      } else if (status === 'rechazado' && rejected_reason) {
        return <div>{rejected_reason}</div>;
      } else if (status === 'reprogramado' && reprogram_reason) {
        return <div>{reprogram_reason}</div>;
      } else {
        return <div className="text-gray-400">-</div>;
      }
    },
  },

  {
    accessorKey: 'observaciones',
    header: 'Observaciones',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const status = row.getValue('status');
      const isPending = status === 'pendiente';

      return (
        <div className="flex space-x-2">
          {isPending && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(row.original)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Diálogo de eliminar */}
              {/* <AlertDialog
                open={deleteItemId === row.original.id}
                onOpenChange={(open) => !open && setDeleteItemId(null)}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteItemId(row.original.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eliminar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro que deseas eliminar este preparte?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminará el registro permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onDelete(row.original.id);
                        setDeleteItemId(null);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog> */}
            </>
          )}

          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    {(isPending || status === 'confirmado') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isPending}
                        className={cn(
                          'text-green-600 hover:bg-green-50 hover:text-green-700',
                          !isPending && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Confirmar y enviar a parte diario</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar preparte?</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de que deseas confirmar este pedido y enviarlo al parte diario? Si no existe un parte
                  diario para la fecha seleccionada, se creara uno nuevo y si existe se agregara el pe a este.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onConfirm(row.original)} className="bg-green-600 hover:bg-green-700">
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];

export function PreparteTable({
  data,
  Customers,
  contratos,
  items,
  onEdit,
  onDelete,
  onConfirm,
  savedVisibility = {},
}: PreparteTableProps) {
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const createUniqueOptions = (options: any[]) => {
    const uniqueOptions = options.reduce(
      (acc, option) => {
        if (!acc.some((o: any) => o.value === option.value)) {
          acc.push(option);
        }
        return acc;
      },
      [] as typeof options
    );
    return uniqueOptions;
  };
  const uniqueClientIds = [...new Set(data.map((item) => item.cliente_id))];
  const filteredCustomers = Customers.filter((customer) => uniqueClientIds.includes(customer.id));

  // Repite el mismo patrón para contratos e items
  const uniqueContratoIds = [...new Set(data.map((item) => item.contrato_id))];
  const filteredContratos = contratos.filter((contrato) => uniqueContratoIds.includes(contrato.id));

  // Para items, necesitarías aplanar el array de items primero
  const allItemIds = data.flatMap((item) => (Array.isArray(item.item) ? item.item.map((i) => i.id) : [item.item]));
  const uniqueItemIds = [...new Set(allItemIds)];
  const filteredItems = items.filter((item) => uniqueItemIds.includes(item.id));
  // const uniqueCustomers = createUniqueOptions(Customers);
  // const uniqueContratos = createUniqueOptions(contratos);
  // const uniqueItems = createUniqueOptions(items);
  console.log(data);
  return (
    <BaseDataTable
      columns={getColumns(onEdit, onDelete, onConfirm, deleteItemId, setDeleteItemId, Customers, contratos, items)}
      data={data}
      tableId="preparte-table"
      serverSide={false}
      savedVisibility={savedVisibility}
      toolbarOptions={{
        filterableColumns: [
          {
            columnId: 'cliente_id',
            title: 'Cliente',
            options: filteredCustomers.map((c: any) => ({ value: c.id, label: c.name })),
          },
          {
            columnId: 'contrato_id',
            title: 'Contrato',
            options: filteredContratos.map((c: any) => ({ value: c.id, label: c.service_name })),
          },
          {
            columnId: 'item',
            title: 'Item',
            options: filteredItems.map((c: any) => ({ value: c.id, label: c.item_name })),
          },
          {
            columnId: 'status',
            title: 'Estado',
            options: [
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'reprogramado', label: 'Reprogramado' },
              { value: 'cancelado', label: 'Cancelado' },
              { value: 'rechazado', label: 'Rechazado' },
              { value: 'confirmado', label: 'Confirmado' },
            ],
          },
        ],
      }}
    />
  );
}
