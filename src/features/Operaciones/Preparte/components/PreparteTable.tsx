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
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cliente } from '@/features/Operaciones/Preparte/components/PreparteManager';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { format, isFuture, isToday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Check, Eye, Pencil } from 'lucide-react';
import { useState } from 'react';
import { updatePreparte } from '../actions/preparte';
import { Contrato, PreparteItem } from './PreparteManager';
import { Status, StatusCards } from './StatusCards';

interface PreparteTableProps {
  data: PreparteItem[];
  Customers: Cliente[];
  contratos: Contrato[];
  items: Array<{ id: string; item_name: string }>;
  onEdit: (item: PreparteItem) => void;
  onDelete: (id: string) => void;
  onConfirm: (item: PreparteItem) => void;
  savedVisibility?: VisibilityState;
  refreshKey?: number;

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

interface StatusFilter {
  value: Status | null;
  label: string;
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
    id: 'requestDate',
    accessorKey: 'requestDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Solicitud" />,
    // return (
    //   <Button
    //     variant="ghost"
    //     onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    //     className="p-0 hover:bg-transparent"
    //   >
    //     Fecha de Solicitud
    //     <ArrowUpDown className="ml-2 h-4 w-4" />
    //   </Button>
    // );

    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => {
      const requestDate = row.getValue('requestDate');
      return <div>{requestDate ? new Date(requestDate as string).toLocaleDateString() : '-'}</div>;
    },
    sortingFn: (rowA, rowB, columnId) => {
      const dateA = new Date(rowA.getValue(columnId)).getTime();
      const dateB = new Date(rowB.getValue(columnId)).getTime();
      return dateA - dateB;
    },
    enableColumnFilter: false,
  },
  {
    accessorKey: 'executionDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Ejecución" />,
    cell: ({ row }) => {
      const executionDate = row.original.executionDate;
      return <div>{executionDate ? new Date(executionDate as any).toLocaleDateString() : '-'}</div>;
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="N° Pedido" />,
    // return (
    //   <Button
    //     variant="ghost"
    //     onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    //     className="p-0 hover:bg-transparent"
    //   >
    //     N° Pedido
    //     <ArrowUpDown className="ml-2 h-4 w-4" />
    //   </Button>
    // );

    enableSorting: true,
    enableHiding: false,
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
    cell: ({ row }) => <div>{row.original.numero_pedido || '-'}</div>,
    // filterFn: (row, id, value) => {
    //   if (!value || value.length === 0) return true;
    //   return value.includes(row.getValue(id));
    // },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'cliente_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => {
      const clienteId = row.original.cliente_id;
      const cliente = Customers.find((c) => c.id === clienteId);
      return <div>{cliente?.name || clienteId || '-'}</div>;
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contrato" />,
    cell: ({ row }) => {
      const contratoId = row.original.contrato_id;
      const contrato = contratos.find((c) => c.id === contratoId);
      return <div>{contrato?.service_name || contratoId || '-'}</div>;
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'sector_service_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sector (Cliente)" />,
    cell: ({ row }) => {
      const sectorServiceId = row.original.sector_service_id;
      const clienteId = row.original.cliente_id;
      const contratoId = row.original.contrato_id;
      if (!sectorServiceId) return '-';
      const cliente = Customers.find((c) => c.id === clienteId);
      const service = cliente?.customer_services?.find((s) => s.service_id === contratoId);
      const sectorLink =
        service?.service_sectors?.find((ss) => ss.id === sectorServiceId || ss?.sectors?.id === sectorServiceId) ||
        // Fallback: search across all customers/services
        Customers.flatMap((c) => c.customer_services || [])
          .flatMap((svc) => svc.service_sectors || [])
          .find((ss) => ss.id === sectorServiceId || ss?.sectors?.id === sectorServiceId);
      if (!sectorLink?.sectors?.name) {
        const sc = cliente?.sector_customer?.find(
          (x: any) => x.id === sectorServiceId || x.sector_id === sectorServiceId
        );
        return <div>{sc?.sectors?.name || sectorServiceId || '-'}</div>;
      }
      return <div>{sectorLink?.sectors?.name || sectorServiceId || '-'}</div>;
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'areas_service_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Área (Cliente)" />,
    cell: ({ row }) => {
      const areaServiceId = row.original.areas_service_id;
      const clienteId = row.original.cliente_id;
      const contratoId = row.original.contrato_id;
      if (!areaServiceId) return '-';
      const cliente = Customers.find((c) => c.id === clienteId);
      const service = cliente?.customer_services?.find((s) => s.service_id === contratoId);
      const areaLink =
        service?.service_areas?.find((sa) => sa.id === areaServiceId || sa?.areas_cliente?.id === areaServiceId) ||
        // Fallback: search across all customers/services
        Customers.flatMap((c) => c.customer_services || [])
          .flatMap((svc) => svc.service_areas || [])
          .find((sa) => sa.id === areaServiceId || sa?.areas_cliente?.id === areaServiceId);
      return <div>{areaLink?.areas_cliente?.nombre || areaServiceId || '-'}</div>;
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'equipos_cliente',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Equipo Cliente" />,
    cell: ({ row }) => {
      const value: any = (row.original as any).equipos_cliente;
      if (!value) return '-';
      const cliente = Customers.find((c) => c.id === row.original.cliente_id);
      const equiposCatalog: Array<{ id: string; name: string }> =
        cliente?.equipos_clientes || cliente?.customer_services?.flatMap((cs) => cs.equipos_clientes || []) || [];
      const toName = (id: string) => equiposCatalog.find((e) => e.id === id)?.name || id;
      if (Array.isArray(value)) return value.length ? value.map((id) => toName(id)).join(', ') : '-';
      return <div>{typeof value === 'string' ? toName(value) : '-'}</div>;
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const cellVal: any = row.getValue(id);
      if (!value || value.length === 0) return true;
      if (Array.isArray(cellVal)) return cellVal.some((cv) => value.includes(cv));
      return value.includes(cellVal);
    },
  },
  {
    accessorKey: 'item',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
    cell: ({ row }) => {
      const itemValue = row.original.item;

      // Handle case where item is an array of objects
      if (Array.isArray(itemValue)) {
        return (
          <div>
            {itemValue.map((item, index) => (
              <div key={index}>
                {items.find((i) => i.id === item.id)?.item_name || item.id || '-'}
                {item.quantity ? ` (${item.quantity})` : ''}
              </div>
            ))}
          </div>
        );
      }

      // Handle case where item is a string ID
      const itemId = itemValue;
      if (!itemId) return <div>-</div>;

      // Find the item by ID
      const itemFila = items.find((i) => i.id === itemId);
      return <div>{itemFila?.item_name || itemId || '-'}</div>;
    },
    // filterFn: (row, id, value) => {
    //   if (!value || value.length === 0) return true;
    //   return value.includes(row.getValue(id));
    // },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cantidad" />,
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      return <div>{quantity || '-'}</div>;
    },
  },

  {
    accessorKey: 'tipo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => <div>{row.getValue('tipo')}</div>,
  },
  {
    accessorKey: 'jornada',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    cell: ({ row }) => <div>{row.getValue('jornada')}</div>,
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: 'start_time',
    header: ({ column }) => <DataTableColumnHeader column={column} title="H. Inicio" />,
    cell: ({ row }) => <div>{row.getValue('start_time')}</div>,
  },
  {
    accessorKey: 'end_time',
    header: ({ column }) => <DataTableColumnHeader column={column} title="H. Fin" />,
    cell: ({ row }) => <div>{row.getValue('end_time')}</div>,
  },
  {
    accessorKey: 'solicitante',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Solicitante" />,
    cell: ({ row }) => <div>{row.getValue('solicitante')}</div>,
  },
  {
    accessorKey: 'status',
    id: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
      type StatusType = 'pendiente' | 'confirmado' | 'cancelado' | 'rechazado' | 'vencido' | 'reprogramado' | 'default';

      const variantStatus: Record<StatusType, BadgeVariant> = {
        pendiente: 'default',
        confirmado: 'success',
        reprogramado: 'warning',
        cancelado: 'destructive',
        rechazado: 'destructive',
        vencido: 'destructive',
        default: 'default',
      };

      return (
        <div>
          <Badge
            variant={row.original.status ? variantStatus[row.original.status as StatusType] || 'default' : 'default'}
            className={cn(
              'capitalize whitespace-nowrap',
              row.original.status === 'pendiente' ? 'bg-black text-white' : ''
            )}
          >
            {row.original.status || 'Sin estado'}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)));
    },
  },
  {
    accessorKey: 'reason',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
    cell: ({ row }) => {
      const { status, cancel_reason, rejected_reason, reprogram_reason } = row.original;
      const text =
        status === 'cancelado'
          ? cancel_reason || '-'
          : status === 'rechazado'
            ? rejected_reason || '-'
            : status === 'reprogramado'
              ? reprogram_reason || '-'
              : '-';
      return (
        <div className="truncate whitespace-nowrap max-w-[320px]" title={text}>
          {text}
        </div>
      );
    },
  },

  {
    accessorKey: 'observaciones',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Observaciones" />,
    cell: ({ row }) => {
      const observaciones = row.original.observaciones || '-';
      return (
        <div className="truncate whitespace-nowrap max-w-[360px]" title={observaciones}>
          {observaciones}
        </div>
      );
    },
  },
  {
    accessorKey: 'preparteImage',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Imagen" />,
    cell: ({ row }) => {
      const url = row.original.preparteImage as string | undefined;
      const [open, setOpen] = useState(false);
      if (!url) return <span className="text-gray-400">-</span>;
      const isPdf = url.toLowerCase().includes('.pdf');
      return (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver {isPdf ? 'documento' : 'imagen'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Vista previa</DialogTitle>
                <DialogDescription>{isPdf ? 'Documento PDF' : 'Imagen subida del pedido'}</DialogDescription>
              </DialogHeader>
              <div className="w-full max-h-[75vh] overflow-auto flex justify-center items-center">
                {isPdf ? (
                  <iframe src={url} className="w-full h-[70vh]" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="preparte" className="max-w-full max-h-[70vh] object-contain" />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
    cell: ({ row }) => {
      const status = row.getValue('status');
      const isPending = status === 'pendiente';
      const isVencido = status === 'vencido';
      const [showDatePicker, setShowDatePicker] = useState(false);
      const [selectedDate, setSelectedDate] = useState<Date>(new Date());

      const handleConfirmWithDate = async () => {
        if (!row.original.id) return;

        const esVencido = row.original.status === 'vencido';
        const observacionesActualizadas = esVencido
          ? `Parte confirmado vencido para la fecha ${format(selectedDate, 'dd/MM/yyyy', { locale: es })}. ${row.original.observaciones || ''}`.trim()
          : row.original.observaciones;

        try {
          // Actualizar el preparte en la base de datos
          const updateData = esVencido
            ? {
                observaciones: observacionesActualizadas,
                status: 'vencido', // Mantener como vencido si es el caso
              }
            : {};

          await updatePreparte(row.original.id, updateData);

          // Enviar al parte diario
          onConfirm({
            ...row.original,
            executionDate: selectedDate as any,
            ...(esVencido && {
              observaciones: observacionesActualizadas,
              status: 'vencido', // Mantener como vencido si es el caso
            }),
          });

          setShowDatePicker(false);
        } catch (error) {
          console.error('Error al actualizar el preparte:', error);
          // Aquí podrías agregar un toast o alerta de error
        }
      };

      return (
        <div>
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
            </>
          )}

          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    {(isPending || isVencido || status === 'confirmado') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'text-green-600 hover:bg-green-50 hover:text-green-700',
                          (!isPending && !isVencido) ||
                            (isVencido && row.original.observaciones?.includes('Parte confirmado vencido'))
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        )}
                        onClick={(e) => {
                          if (isVencido) {
                            if (!row.original.observaciones?.includes('Parte confirmado vencido')) {
                              e.preventDefault();
                              setShowDatePicker(true);
                            } else {
                              e.preventDefault();
                            }
                          }
                        }}
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

          {/* Date Picker Modal for Vencido status */}
          <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Seleccionar Fecha</DialogTitle>
                <DialogDescription>Por favor selecciona una nueva fecha para este preparte vencido.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date && (isToday(date) || isFuture(date))) {
                          setSelectedDate(date);
                        }
                      }}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDatePicker(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!selectedDate || selectedDate < startOfDay(new Date())}
                  onClick={handleConfirmWithDate}
                >
                  Confirmar con fecha seleccionada
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    },
  },
];

export function PreparteTable({
  data: tableData,
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
  refreshKey = 0,
}: PreparteTableProps) {
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  // Filtro de estado para inyectar al server-side
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

  // Envolver fetchData para agregar el filtro por estado como columnFilter (server-side)
  const handleFetchData = async (opts: any) => {
    return fetchData({
      ...opts,
      columnFilters: [
        ...(opts?.columnFilters || []),
        ...(statusFilter ? [{ id: 'status', value: [statusFilter] }] : []),
      ],
    });
  };

  // Usar directamente los datos de las props
  const uniqueStatuses = [...new Set(tableData.map((item) => item.status))];
  const uniqueClientIds = [...new Set(tableData.map((item) => item.cliente_id))];
  const filteredCustomers = Customers.filter((customer) => uniqueClientIds.includes(customer.id));

  const uniqueContratoIds = [...new Set(tableData.map((item) => item.contrato_id))];
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
  const allItemIds = tableData.flatMap((item) => (Array.isArray(item.item) ? item.item.map((i) => i.id) : [item.item]));
  const uniqueItemIds = [...new Set(allItemIds)];
  const filteredItems = items.filter((item) => uniqueItemIds.includes(item.id));

  return (
    <>
      <div className="flex w-full">
        <StatusCards
          data={tableData}
          onStatusClick={(status) => setStatusFilter(status)}
          selectedStatus={statusFilter}
        />
      </div>
      <BaseDataTable
        columns={getColumns(onEdit, onDelete, onConfirm, deleteItemId, setDeleteItemId, Customers, contratos, items)}
        data={tableData}
        tableId="preparte-table"
        savedVisibility={savedVisibility}
        serverSide={true}
        fetchData={handleFetchData}
        fetchAllData={fetchAllData}
        queryKey={`preparte-table-${refreshKey}-${statusFilter ?? 'all'}`} // Refetch al cambiar estado
        // isLoading={isLoading}
        toolbarOptions={{
          initialVisibleFilters: initialVisibleFilters,
          filterableColumns: [
            {
              columnId: 'cliente_id',
              title: 'Cliente',
              config: {
                tableName: 'preparte' as any,
                select: 'cliente_id' as any,
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
              columnId: 'sector_service_id',
              title: 'Sector (Cliente)',
              config: {
                tableName: 'preparte' as any,
                select: 'sector_service_id' as any,
                mapper: (data: Array<{ col_value: string; col_count: number }>) =>
                  data.map((item) => {
                    const id = item.col_value;
                    let label = id || '-';
                    for (const c of Customers) {
                      for (const svc of c.customer_services || []) {
                        const ss = svc.service_sectors?.find((x) => x.id === id || x.sectors?.id === id);
                        if (ss?.sectors?.name) {
                          label = ss.sectors.name;
                          break;
                        }
                      }
                    }
                    // Fallback: sector_customer mapping at client level
                    const sc = (Customers as any).sector_customer?.find((x: any) => x.id === id || x.sector_id === id);
                    if (sc?.sectors?.name) {
                      label = sc.sectors.name;
                    }
                    return { label, value: id, count: item.col_count };
                  }),
              },
            },
            {
              columnId: 'areas_service_id',
              title: 'Área (Cliente)',
              config: {
                tableName: 'preparte' as any,
                select: 'areas_service_id' as any,
                mapper: (data: Array<{ col_value: string; col_count: number }>) =>
                  data.map((item) => {
                    const id = item.col_value;
                    let label = id || '-';
                    for (const c of Customers) {
                      for (const svc of c.customer_services || []) {
                        const sa = svc.service_areas?.find((x) => x.id === id || x.areas_cliente?.id === id);
                        if (sa?.areas_cliente?.nombre) {
                          label = sa.areas_cliente.nombre;
                          break;
                        }
                      }
                    }
                    return { label, value: id, count: item.col_count };
                  }),
              },
            },
            {
              columnId: 'equipos_cliente',
              title: 'Equipo Cliente',
              config: {
                tableName: 'preparte' as any,
                select: 'equipos_cliente' as any,
                mapper: (data: Array<{ col_value: string; col_count: number }>) =>
                  data.map((item) => {
                    const id = item.col_value;
                    let label = id || '-';
                    // Buscar en catálogo de equipos de todos los clientes
                    outer: for (const c of Customers) {
                      const allEquipos = [
                        ...(c.equipos_clientes || []),
                        ...(c.customer_services || []).flatMap((cs) => cs.equipos_clientes || []),
                      ];
                      const eq = allEquipos.find((e) => e.id === id);
                      if (eq?.name) {
                        label = eq.name;
                        break outer;
                      }
                    }
                    return { label, value: id, count: item.col_count };
                  }),
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
            {
              columnId: 'numero_pedido',
              title: 'N° Pedido',
              config: {
                tableName: 'preparte' as any,
                select: 'numero_pedido' as any,
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
              columnId: 'item',
              title: 'Item',
              config: {
                tableName: 'preparte' as any,
                select: 'item' as any,
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
          ],
        }}
      />
    </>
  );
}
