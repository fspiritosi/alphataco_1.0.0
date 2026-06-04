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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cliente } from '@/features/Operaciones/Preparte/components/PreparteManager';
import { PermissionGuard } from '@/features/Permissions';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table-server';
import { useQueryClient } from '@tanstack/react-query';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { format, isFuture, isToday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Check, Edit, Eye, Pencil, Trash2 } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updatePreparte } from '../actions/preparte';
import { PreparteBulkStatusModal } from './PreparteBulkStatusModal';
import { PreparteDetailModal } from './PreparteDetailModal';
import { Contrato, PreparteItem } from './PreparteManager';
import { Status, StatusCards } from './StatusCards';

const logger = new Logger('PreparteTable');

/**
 * Extrae el fullname del actor de una relacion preparte → profile.
 * Supabase puede tipar la relacion como array o como objeto; manejamos ambos casos.
 */
function getActorName(profile: unknown): string | null {
  if (!profile) return null;
  const candidate = Array.isArray(profile) ? profile[0] : profile;
  if (candidate && typeof candidate === 'object' && 'fullname' in candidate) {
    const name = (candidate as { fullname?: string | null }).fullname;
    return name?.trim() || null;
  }
  return null;
}

interface PreparteTableProps {
  data: PreparteItem[];
  Customers: Cliente[];
  contratos: Contrato[];
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

  // Status Cards como prop (renderizadas desde nivel superior con Suspense)
  statusCards?: React.ReactNode;

  // Estado externo del filtro de status (opcional - usa interno si no se proporciona)
  statusFilter?: Status | null;
  onStatusFilterChange?: (status: Status | null) => void;
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
  canEdit: boolean
): ColumnDef<PreparteItem>[] => {
  const columns: ColumnDef<PreparteItem>[] = [];

  // Solo agregar la columna select si el usuario tiene permisos de editar
  if (canEdit) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <div className="w-[20px]">
          <Checkbox
            disabled={table.getRowModel().rows.every((row) => !row.getCanSelect())}
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        </div>
      ),
      cell: ({ row }) => {
        return (
          <Checkbox
            disabled={!row.getCanSelect()}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    });
  }

  // Agregar el resto de las columnas
  return [
    ...columns,
    {
      id: 'requestDate',
      accessorKey: 'requestDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Solicitud" />,
      enableHiding: false,
      cell: ({ row }) => {
        const requestDate = row.getValue('requestDate');
        const data = requestDate ? moment.utc(requestDate as string).format('DD/MM/YYYY') : '-';
        return <div>{data}</div>;
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
        const isSubjectToAvailability = row.original.subject_to_availability;

        if (isSubjectToAvailability && !executionDate) {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Pendiente de fecha
            </Badge>
          );
        }

        return <div>{executionDate ? moment.utc(executionDate as string).format('DD/MM/YYYY') : '-'}</div>;
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
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
        type StatusType =
          | 'pendiente'
          | 'confirmado'
          | 'cancelado'
          | 'rechazado'
          | 'vencido'
          | 'reprogramado'
          | 'default';

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
              data-testid={`status-badge-${row.original.numero_pedido}`}
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
        const service = cliente?.customer_services?.find((s) => s.id === contratoId);
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
        const service = cliente?.customer_services?.find((s) => s.id === contratoId);
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
        const equiposCatalog: Array<{ id: string; name: string }> = cliente?.equipos_clientes || [];
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
      accessorKey: 'service_items.item_name',
      id: 'service_items.item_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => {
        const serviceItem = (row.original as Record<string, unknown>).service_items as { item_name?: string } | null;
        return <div>{serviceItem?.item_name || row.original.item || '-'}</div>;
      },
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
      cell: ({ row }) => {
        const tipo = row.getValue('tipo') as string;
        // Reemplazar guiones bajos por espacios y capitalizar cada palabra
        const formattedTipo = tipo ? tipo.replace(/_/g, ' ') : '-';
        return <div className="capitalize">{formattedTipo}</div>;
      },
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
      id: 'confirmed_by',
      accessorFn: (row) => row.confirmed_by ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Confirmado por" />,
      cell: ({ row }) => <div>{row.original.confirmed_by || '-'}</div>,
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'rejected_by_profile',
      accessorFn: (row) => getActorName(row.rejected_by_profile) ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rechazado por" />,
      cell: ({ row }) => <div>{getActorName(row.original.rejected_by_profile) ?? '-'}</div>,
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'cancelled_by_profile',
      accessorFn: (row) => getActorName(row.cancelled_by_profile) ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cancelado por" />,
      cell: ({ row }) => <div>{getActorName(row.original.cancelled_by_profile) ?? '-'}</div>,
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: 'reprogrammed_by_profile',
      accessorFn: (row) => getActorName(row.reprogrammed_by_profile) ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reprogramado por" />,
      cell: ({ row }) => <div>{getActorName(row.original.reprogrammed_by_profile) ?? '-'}</div>,
      enableSorting: false,
      enableColumnFilter: false,
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
        const isConfirmed = status === 'confirmado';
        const [showDatePicker, setShowDatePicker] = useState(false);
        const [selectedDate, setSelectedDate] = useState<Date>(new Date());
        const [showConfirmDialog, setShowConfirmDialog] = useState(false);
        const [confirmedBy, setConfirmedBy] = useState('');

        const handleConfirmWithDate = async () => {
          if (!row.original.id) return;

          const esVencido = row.original.status === 'vencido';
          const observacionesActualizadas = esVencido
            ? `Parte confirmado vencido para la fecha ${format(selectedDate, 'dd/MM/yyyy', { locale: es })}. ${row.original.observaciones || ''}`.trim()
            : row.original.observaciones;

          try {
            // Primero enviar al parte diario (con la fecha seleccionada)
            // onConfirm valida, crea la fila en el parte diario y actualiza el status
            await onConfirm({
              ...row.original,
              executionDate: selectedDate as any,
              ...(esVencido && {
                observaciones: observacionesActualizadas,
              }),
            });

            // Solo si onConfirm fue exitoso, guardar quien confirmó y las observaciones
            const updateData = esVencido
              ? {
                  observaciones: observacionesActualizadas,
                  confirmed_by: confirmedBy,
                }
              : {
                  confirmed_by: confirmedBy,
                };

            await updatePreparte(row.original.id, updateData);

            setShowDatePicker(false);
            setConfirmedBy('');
          } catch (error) {
            logger.error('Error al actualizar el preparte', { data: { error } });
            // Si onConfirm lanza excepción, no se guarda confirmed_by ni se cierra el modal
          }
        };

        const handleConfirm = async () => {
          if (!confirmedBy.trim()) {
            return; // No confirmar si no hay confirmante
          }

          try {
            // Enviar al parte diario (valida fecha, crea fila en parte diario y actualiza status)
            await onConfirm(row.original);

            // Solo si onConfirm fue exitoso, guardar quien confirmó
            await updatePreparte(row.original.id, {
              confirmed_by: confirmedBy,
            });

            setShowConfirmDialog(false);
            setConfirmedBy('');
          } catch (error) {
            logger.error('Error al confirmar el preparte', { data: { error } });
            // Si onConfirm lanza excepción, no se guarda confirmed_by ni se cierra el modal
            // El toast de error ya se muestra en handleConfirm de PreparteManager
          }
        };

        return (
          <div className="flex items-center">
            {/* Botón de detalle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <PreparteDetailModal preparteData={row.original} Customers={Customers} contratos={contratos} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver detalle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isPending && (
              <PermissionGuard module="operaciones" tab="preparte" action="update">
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
              </PermissionGuard>
            )}

            {/* Eliminar pedido — solo disponible en estado pendiente */}
            {isPending && (
              <PermissionGuard module="operaciones" tab="preparte" action="delete">
                <AlertDialog>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            data-testid={`eliminar-button-${row.original.numero_pedido}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eliminar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este pedido?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El pedido será eliminado permanentemente del gestor de
                        pedidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(row.original.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGuard>
            )}

            <PermissionGuard module="operaciones" tab="preparte" action="update">
              {(() => {
                // Verificar si el preparte tiene fecha de ejecución o está sujeto a disponibilidad
                const hasExecutionDate = !!row.original.executionDate;
                const isSubjectToAvailability = row.original.subject_to_availability === true;
                // Solo se puede confirmar si tiene fecha de ejecución
                const canConfirm = hasExecutionDate && !isSubjectToAvailability;

                // Si está sujeto a disponibilidad sin fecha, no mostrar botón de confirmar
                if (isSubjectToAvailability && !hasExecutionDate) {
                  return null;
                }

                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {(isPending || isVencido) && canConfirm ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'text-green-600 hover:bg-green-50 hover:text-green-700',
                              isVencido && row.original.observaciones?.includes('Parte confirmado vencido')
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            )}
                            onClick={() => {
                              if (isVencido && !row.original.observaciones?.includes('Parte confirmado vencido')) {
                                setShowDatePicker(true);
                              } else if (!isVencido) {
                                setShowConfirmDialog(true);
                              }
                            }}
                            data-testid={`confirmar-button-${row.original.numero_pedido}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 opacity-50 cursor-not-allowed"
                            disabled
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isConfirmed ? 'Ya confirmado' : 'Confirmar y enviar a parte diario'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </PermissionGuard>

            {/* Dialog de confirmación con campo de confirmante */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Confirmar preparte?</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas confirmar este pedido y enviarlo al parte diario? Si no existe un parte
                    diario para la fecha seleccionada, se creará uno nuevo y si existe se agregará el pedido a este.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirmedBy">
                      Confirmado por <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmedBy"
                      value={confirmedBy}
                      onChange={(e) => setConfirmedBy(e.target.value)}
                      placeholder="Ingrese el nombre de quien confirma"
                      required
                      data-testid="confirmado-por-input"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setConfirmedBy('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!confirmedBy.trim()}
                    data-testid="confirmar-modal-button"
                  >
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Date Picker Modal for Vencido status */}
            <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Seleccionar Fecha</DialogTitle>
                  <DialogDescription>
                    Por favor selecciona una nueva fecha para este preparte vencido.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Fecha de ejecución</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal mt-2',
                            !selectedDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? (
                            format(selectedDate, 'PPP', { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmedByVencido">
                      Confirmado por <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmedByVencido"
                      value={confirmedBy}
                      onChange={(e) => setConfirmedBy(e.target.value)}
                      placeholder="Ingrese el nombre de quien confirma"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDatePicker(false);
                      setConfirmedBy('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={!selectedDate || selectedDate < startOfDay(new Date()) || !confirmedBy.trim()}
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
};

export function PreparteTable({
  data: tableDataProp,
  Customers,
  contratos,
  onEdit,
  onDelete,
  onConfirm,
  savedVisibility = {},
  fetchData,
  fetchAllData,
  isLoading = false,
  statusCards,
  statusFilter: externalStatusFilter,
  onStatusFilterChange,
}: PreparteTableProps) {
  const { canUpdate } = usePermissions();
  const canEdit = canUpdate('operaciones', 'preparte');
  const queryClient = useQueryClient();
  const router = useRouter();

  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  // Filtro de estado - usa externo si se proporciona, sino usa interno
  const [internalStatusFilter, setInternalStatusFilter] = useState<Status | null>(null);
  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const setStatusFilter = onStatusFilterChange || setInternalStatusFilter;

  // Estados para edición masiva
  const [selectedRows, setSelectedRows] = useState<PreparteItem[]>([]);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);

  // Estado local para tableData
  const [tableData, setTableData] = useState<PreparteItem[]>(tableDataProp);

  // Actualizar tableData cuando cambia la prop data
  useEffect(() => {
    setTableData(tableDataProp);
  }, [tableDataProp]);

  // Envolver fetchData para agregar el filtro por estado como columnFilter (server-side)
  const handleFetchData = async (opts: any) => {
    const result = await fetchData({
      ...opts,
      columnFilters: [
        ...(opts?.columnFilters || []),
        ...(statusFilter ? [{ id: 'status', value: [statusFilter] }] : []),
      ],
    });

    // Actualizar tableData con los nuevos datos
    setTableData(result.rows);

    return result;
  };

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

  return (
    <>
      {/* Renderizar statusCards si se proporciona, sino usar el componente legacy */}
      {statusCards ? (
        statusCards
      ) : (
        <div className="flex w-full">
          <StatusCards
            data={tableDataProp}
            onStatusClick={(status) => setStatusFilter(status)}
            selectedStatus={statusFilter}
          />
        </div>
      )}
      <BaseDataTable
        columns={getColumns(onEdit, onDelete, onConfirm, deleteItemId, setDeleteItemId, Customers, contratos, canEdit)}
        data={tableData}
        tableId="preparte-table"
        savedVisibility={savedVisibility}
        serverSide={true}
        fetchData={handleFetchData}
        fetchAllData={fetchAllData}
        queryKey={`preparte-table-${statusFilter ?? 'all'}`}
        enableRowSelection={
          canEdit ? (row) => row.original.status === 'pendiente' || row.original.status === 'reprogramado' : false
        }
        onRowSelectionChange={(rows) => {
          setSelectedRows(rows);
        }}
        // isLoading={isLoading}
        toolbarOptions={{
          initialVisibleFilters: initialVisibleFilters,
          bulkAction: canEdit
            ? {
                enabled: true,
                label: 'Cambiar Estado',
                icon: <Edit className="h-4 w-4" />,
                onClick: (rows) => {
                  setSelectedRows(rows);
                  setIsBulkStatusModalOpen(true);
                },
              }
            : undefined,
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
                // p_filters: { company_id: company_id! },
                mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                  return data.map((item) => {
                    const contrato = contratos.find((c) => c.id === item.col_value);
                    const displayName = contrato?.service_name || `Contrato ${item.col_value}`;
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
                // p_filters: { company_id: company_id! },
                mapper: (data: Array<{ col_value: string; col_count: number }>) =>
                  data.map((item) => {
                    const id = item.col_value;
                    let label = id || '-';
                    for (const c of Customers) {
                      for (const svc of c.customer_services || []) {
                        const ss = svc.service_sectors?.find((x) => x.id === id || x?.sectors?.id === id);
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
                // p_filters: { company_id: company_id! },
                mapper: (data: Array<{ col_value: string; col_count: number }>) =>
                  data.map((item) => {
                    const id = item.col_value;
                    let label = id || '-';
                    for (const c of Customers) {
                      for (const svc of c.customer_services || []) {
                        const sa = svc.service_areas?.find((x) => x.id === id || x?.areas_cliente?.id === id);
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
                // p_filters: { company_id: company_id! },
                mapper: (data: Array<{ col_value: string; col_count: number }>) =>
                  data.map((item) => {
                    const id = item.col_value;
                    let label = id || '-';
                    // Buscar en catálogo de equipos de todos los clientes
                    outer: for (const c of Customers) {
                      const allEquipos = c.equipos_clientes || [];
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
                mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                  return data.map((item) => ({
                    label: String(item.col_value),
                    value: item.col_value,
                    count: item.col_count,
                  }));
                },
              },
            },
            {
              columnId: 'tipo',
              title: 'Tipo',
              config: {
                tableName: 'preparte' as any,
                select: 'tipo' as any,
                mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                  return data.map((item) => ({
                    label: String(item.col_value),
                    value: item.col_value,
                    count: item.col_count,
                  }));
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
                mapper: (data: Array<{ col_value: string; col_count: number }>) => {
                  return data.map((item) => ({
                    label: String(item.col_value),
                    value: item.col_value,
                    count: item.col_count,
                  }));
                },
              },
            },
            {
              columnId: 'service_items.item_name',
              title: 'Item',
              config: {
                tableName: 'preparte' as any,
                select: 'service_items.item_name' as any,
                relation: '{"service_items": "item"}',
                mapper: (data: Array<{ col_value: string; display_value: string; col_count: number }>) => {
                  return data.map((item) => ({
                    label: String(item.display_value || item.col_value),
                    value: String(item.col_value),
                    count: item.col_count,
                  }));
                },
              },
            },
          ],
        }}
      />

      {/* Modal de edición masiva de estados */}
      <PreparteBulkStatusModal
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        selectedRows={selectedRows}
        onSuccess={() => {
          // Limpiar selección y refrescar tabla
          setSelectedRows([]);
          setIsBulkStatusModalOpen(false);
          // Invalidar todas las queries relacionadas con preparte (consistente con refreshTable)
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              if (Array.isArray(key) && typeof key[0] === 'string') {
                return key[0].startsWith('preparte-table');
              }
              return false;
            },
          });
          queryClient.invalidateQueries({ queryKey: ['prepartes'] });
          queryClient.invalidateQueries({ queryKey: ['preparte-change-logs'] });
          queryClient.invalidateQueries({ queryKey: ['preparte-change-logs-order'] });
          // Refrescar Server Components (status cards)
          router.refresh();
        }}
      />
    </>
  );
}
