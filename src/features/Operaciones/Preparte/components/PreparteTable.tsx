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
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { ArrowUpDown, Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Contrato, PreparteItem } from './PreparteManager';

interface PreparteTableProps {
  data: PreparteItem[];
  Customers: Cliente[];
  contratos: Contrato[];
  items: Array<{ id: string; item_name: string }>;
  onEdit: (item: PreparteItem) => void;
  onDelete: (id: string) => void;
  onConfirm: (item: PreparteItem) => void;
  savedVisibility?: VisibilityState;

  // Nueva prop para la carga de datos
  fetchData: (opciones: {
    pageIndex: number; // Página actual (0-based)
    pageSize: number; // Elementos por página
    sorting: any[]; // Ordenamiento
    columnFilters: any[]; // Filtros aplicados
  }) => Promise<{
    rows: PreparteItem[]; // Datos de la página actual
    pageCount: number; // Total de páginas
    rowCount: number; // Total de registros
  }>;

  // Opcional: Para exportar todos los datos
  fetchAllData?: (opciones: { sorting: any[]; columnFilters: any[] }) => Promise<PreparteItem[]>;

  // Estado de carga
  isLoading?: boolean;
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
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      if (!value || typeof value !== 'object') return true;
      const v = value as { from?: Date | null; to?: Date | null };
      const cellVal = row.getValue(id);
      if (!cellVal) return false;
      const d = new Date(cellVal as any).getTime();
      if (Number.isNaN(d)) return false;
      const fromOk = v.from ? d >= new Date(v.from).setHours(0, 0, 0, 0) : true;
      const toOk = v.to ? d <= new Date(v.to).setHours(23, 59, 59, 999) : true;
      return fromOk && toOk;
    },
  },
  {
    accessorKey: 'executionDate',
    header: 'Fecha de Ejecución',
    cell: ({ row }) => {
      const executionDate = row.original.executionDate;
      return executionDate ? new Date(executionDate as any).toLocaleDateString() : '-';
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      if (!value || typeof value !== 'object') return true;
      const v = value as { from?: Date | null; to?: Date | null };
      const cellVal = row.getValue(id);
      if (!cellVal) return false;
      const d = new Date(cellVal as any).getTime();
      if (Number.isNaN(d)) return false;
      const fromOk = v.from ? d >= new Date(v.from).setHours(0, 0, 0, 0) : true;
      const toOk = v.to ? d <= new Date(v.to).setHours(23, 59, 59, 999) : true;
      return fromOk && toOk;
    },
  },
  {
    accessorKey: 'numero_pedido',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          N° Pedido
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    sortingFn: (rowA, rowB, columnId) => {
      // Get the values
      const valueA = rowA.getValue(columnId) as string;
      const valueB = rowB.getValue(columnId) as string;

      // If either value is missing, sort them to the end
      if (!valueA) return 1;
      if (!valueB) return -1;

      // Extract the numeric part after 'PED-'
      const numA = parseInt(valueA.split('-')[1] || '0', 10);
      const numB = parseInt(valueB.split('-')[1] || '0', 10);

      return numA - numB;
    },
    cell: ({ row }) => row.original.numero_pedido || '-',
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id) as string;
      if (!rowValue) return false;

      // If no filter value is provided, show all rows
      if (!value || (Array.isArray(value) && value.length === 0)) return true;

      // Handle both string and array of strings for the value
      const searchValues = Array.isArray(value) ? value : [value];

      // Check if any of the search values match (case insensitive)
      return searchValues.some((searchValue) => rowValue.toLowerCase().includes(searchValue.toString().toLowerCase()));
    },
    enableColumnFilter: true,
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
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
    enableColumnFilter: true,
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
    id: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
      type StatusType = 'pendiente' | 'confirmado' | 'cancelado' | 'rechazado' | 'default';

      const variantStatus: Record<StatusType, BadgeVariant> = {
        pendiente: 'default',
        confirmado: 'success',
        cancelado: 'destructive',
        rechazado: 'destructive',
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
  fetchData,
  fetchAllData,
  isLoading = false,
}: PreparteTableProps) {
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const uniqueStatuses = [...new Set(data.map((item) => item.status))];
  const uniqueClientIds = [...new Set(data.map((item) => item.cliente_id))];
  const filteredCustomers = Customers.filter((customer) => uniqueClientIds.includes(customer.id));

  const uniqueContratoIds = [...new Set(data.map((item) => item.contrato_id))];
  const filteredContratos = contratos.filter((contrato) => uniqueContratoIds.includes(contrato.id));

  const [initialVisibleFilters] = useState<string[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const savedState = localStorage.getItem('table-filters-preparte-table');
      if (!savedState) return [];
      const parsedState = JSON.parse(savedState);
      const activeFilterIds = Array.isArray(parsedState?.columnFilters)
        ? parsedState.columnFilters
            .filter((filter: any) => {
              const v = filter?.value;
              if (Array.isArray(v)) return v.length > 0;
              if (v && typeof v === 'object') return Object.keys(v).length > 0; // date-range or objects
              return Boolean(v);
            })
            .map((filter: any) => filter.id)
        : [];
      return activeFilterIds;
    } catch (_) {
      return [];
    }
  });

  // Para items, necesitarías aplanar el array de items primero
  const allItemIds = data.flatMap((item) => (Array.isArray(item.item) ? item.item.map((i) => i.id) : [item.item]));
  const uniqueItemIds = [...new Set(allItemIds)];
  const filteredItems = items.filter((item) => uniqueItemIds.includes(item.id));

  return (
    <BaseDataTable
      columns={getColumns(onEdit, onDelete, onConfirm, deleteItemId, setDeleteItemId, Customers, contratos, items)}
      data={data}
      tableId="preparte-table"
      savedVisibility={savedVisibility}
      serverSide={true} // Habilitar modo servidor
      fetchData={fetchData}
      fetchAllData={fetchAllData}
      toolbarOptions={{
        initialVisibleFilters: initialVisibleFilters,
        filterableColumns: [
          {
            columnId: 'cliente_id',
            title: 'Cliente',
            config: {
              tableName: 'preparte' as any,
              select: 'cliente_id' as any,
              // p_filters: { company_id: company_id! },
              mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                return data.map((item) => {
                  const customer = Customers.find((c) => c.id === item.col_value);
                  const displayName = customer ? customer.name : `Cliente ${item.col_value}`;
                  return {
                    label: displayName,
                    value: item.col_value,
                    count: item.col_count,
                  };
                });
              },
            },
          },
          {
            columnId: 'contrato_id',
            title: 'Contrato',
            config: {
              tableName: 'preparte' as any,
              select: 'contrato_id' as any,
              // p_filters: { company_id: company_id! },
              mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                return data.map((item) => {
                  const contrato = contratos.find((c) => c.id === item.col_value);
                  const displayName = contrato ? contrato.service_name : `Contrato ${item.col_value}`;
                  return {
                    label: displayName,
                    value: item.col_value,
                    count: item.col_count,
                  };
                });
              },
            },
          },
          {
            columnId: 'status',
            title: 'Estado',
            config: {
              tableName: 'preparte' as any,
              select: 'status' as any,
              // p_filters: { company_id: company_id! },
              mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                return data.map((item) => ({
                  label: item.col_value.charAt(0).toUpperCase() + item.col_value.slice(1),
                  value: item.col_value,
                  count: item.col_count,
                }));
              },
            },
          },
          {
            columnId: 'jornada',
            title: 'Jornada',
            config: {
              tableName: 'preparte' as any,
              select: 'jornada' as any,
              // p_filters: { company_id: company_id! },
              mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                return data.map((item) => {
                  const item1 = items.find((c) => c.id === item.col_value);
                  const displayName = item1 ? item1.item_name : `${item.col_value}`;
                  return {
                    label: displayName,
                    value: item.col_value,
                    count: item.col_count,
                  };
                });
              },
            },
          },
          {
            columnId: 'tipo',
            title: 'Tipo',
            config: {
              tableName: 'preparte' as any,
              select: 'tipo' as any,
              // p_filters: { company_id: company_id! },
              mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                return data.map((item) => {
                  const item1 = items.find((c) => c.id === item.col_value);
                  const displayName = item1 ? item1.item_name : `${item.col_value}`;
                  return {
                    label: displayName,
                    value: item.col_value,
                    count: item.col_count,
                  };
                });
              },
            },
          },
          {
            columnId: 'requestDate',
            title: 'Fecha de Solicitud',
            type: 'date-range',
            showFrom: true,
            showTo: true,
            fromPlaceholder: 'Desde',
            toPlaceholder: 'Hasta',
            // defaultValues: { from: null, to: null }, // opcional
          },
          {
            columnId: 'executionDate',
            title: 'Fecha de Ejecución',
            type: 'date-range',
            showFrom: true,
            showTo: true,
            fromPlaceholder: 'Desde',
            toPlaceholder: 'Hasta',
            // defaultValues: { from: null, to: null }, // opcional
          },
          // ... otros filtros
        ],
      }}
    />
  );
}
