'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  confirmPreparteToDailyReport,
  createPreparte,
  deletePreparte,
  fetchPrepartes,
  getLastOrderNumber,
  listPrepartes,
  movePreparteFile,
  updatePreparte,
  type Preparte,
} from '@/features/Operaciones/Preparte/actions/preparte';
import { PermissionGuard } from '@/features/Permissions';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { VisibilityState } from '@tanstack/react-table';
import moment from 'moment';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PreparteForm, type PreparteFormData } from './PreparteForm';
import { PreparteTable } from './PreparteTable';

import { fetchAllContracts } from '@/app/dashboard/employee/action/actions/actions';
import { fetchCustomersWithRelations } from '../actions/actions';
import type { Status } from './StatusCardServer';

const logger = new Logger('PreparteManager');

// Inferred types from server actions
export type Cliente = Awaited<ReturnType<typeof fetchCustomersWithRelations>>[number];
export type Contrato = Awaited<ReturnType<typeof fetchAllContracts>>[number];
export type PreparteItem = Awaited<ReturnType<typeof listPrepartes>>[number];

interface PreparteManagerProps {
  Customers: Cliente[];
  contratos: Contrato[];
  prepartes: PreparteItem[];
  statusCards?: React.ReactNode;
  statusFilter?: Status | null;
  onStatusFilterChange?: (status: Status | null) => void;
}

// Helper function to get all dates between two dates
const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export function PreparteManager({
  Customers,
  contratos,
  prepartes,
  statusCards,
  statusFilter,
  onStatusFilterChange,
}: PreparteManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PreparteItem | null>(null);
  const [open, setOpen] = useState(false);
  const [savedVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);

  // PP-3: formData ya no tiene jornada, tipo, observaciones, executionDate ni subject_to_availability a nivel global
  // Estos campos ahora están dentro de cada item
  const [formData, setFormData] = useState<PreparteFormData>({
    id: '',
    cliente_id: '',
    contrato_id: '',
    item: [],
    requestDate: new Date(),
    solicitante: '',
    status: 'pendiente',
    // Campos del pedido general
    sector_service_id: '',
    areas_service_id: '',
    equipos_cliente: [],
  });

  const queryClient = useQueryClient();
  const router = useRouter();

  // Función para invalidar las queries de la tabla y refrescar los datos
  // Usamos router.refresh() para revalidar los datos del Server Component
  const refreshTable = () => {
    // Invalidar todas las queries relacionadas con preparte
    // El queryKey de BaseDataTable tiene formato: [queryKey, pageIndex, pageSize, sorting, filters]
    // donde queryKey es 'preparte-table-{status}' (ej: 'preparte-table-all', 'preparte-table-confirmado')
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
    // Invalidar los logs de cambios para que el detalle muestre datos actualizados
    queryClient.invalidateQueries({ queryKey: ['preparte-change-logs'] });
    queryClient.invalidateQueries({ queryKey: ['preparte-change-logs-order'] });
    // Refrescar el Server Component para actualizar las cards de estadísticas
    router.refresh();
  };

  const handleInputChange = (field: keyof PreparteFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateOrderNumber = async () => {
    const lastOrderNumber = await getLastOrderNumber();
    const lastNumber = parseInt(lastOrderNumber.split('-')[1]);
    const newNumber = String(lastNumber + 1).padStart(4, '0');
    return `PED-${newNumber}`;
  };

  const handleSubmit = async (formData: PreparteFormData) => {
    try {
      if (isEditing && currentItem?.id) {
        // Manejar la imagen si está presente
        let imageUrl: string | null = currentItem.preparteImage || null;
        if (formData.image_url && formData.image_url !== currentItem.preparteImage) {
          const cliente = Customers.find((c) => c.id === currentItem?.cliente_id);
          const contrato = contratos.find((c) => c.id === currentItem?.contrato_id);
          imageUrl = await movePreparteFile(
            formData.image_url,
            cliente?.name || 'empresa',
            contrato?.service_name || 'servicio',
            formData.numero_pedido || ''
          );
        }

        // PP-3: En edición, usar los campos del primer ítem (ya que en edición solo hay un ítem)
        const firstItem = formData.item[0];
        const itemExecutionDate = firstItem?.executionDate;
        const itemSubjectToAvailability = firstItem?.subject_to_availability ?? false;

        const updatedPreparte: Partial<Preparte> = {
          id: currentItem.id,
          cliente_id: formData.cliente_id,
          contrato_id: formData.contrato_id,
          solicitante: formData.solicitante,
          status: formData.status,
          item: firstItem?.id || null,
          quantity: firstItem?.quantity || 1,
          // PP-3: Usar campos del ítem
          jornada: firstItem?.jornada || '',
          tipo: firstItem?.tipo || '',
          observaciones: firstItem?.observaciones || '',
          start_time: firstItem?.start_time || null,
          end_time: firstItem?.end_time || null,
          executionDate:
            itemExecutionDate && typeof itemExecutionDate === 'object' && itemExecutionDate.from
              ? moment(itemExecutionDate.from).format('YYYY-MM-DD')
              : null,
          subject_to_availability: itemSubjectToAvailability,
          updated_at: new Date().toISOString(),
          requestDate: moment(formData.requestDate).format('YYYY-MM-DD'),
          numero_pedido: formData.numero_pedido,
          // Si el estado es 'reprogramado', guardamos el ID del preparte original
          reprogram: formData.status === 'reprogramado' ? currentItem.id : undefined,
          // incluir sector/área/equipos si existen
          sector_service_id: formData.sector_service_id ?? '',
          areas_service_id: formData.areas_service_id ?? '',
          equipos_cliente: formData.equipos_cliente?.[0] || null,
          // persistir en columna DB (procesada)
          preparteImage: imageUrl,
        };

        await updatePreparte(currentItem.id, updatedPreparte);
        toast.success('Pedido actualizado correctamente');

        // Refresh de la tabla
        refreshTable();
      } else {
        // Generar número de pedido
        const numeroPedido = await generateOrderNumber();

        // Si image_url viene del formulario (ya subido), mover a la estructura final
        let uploadedUrl: string | undefined = formData.image_url || undefined;
        if (formData.image_url) {
          const cliente = Customers.find((c) => c.id === formData.cliente_id);
          const contrato = contratos.find((c) => c.id === formData.contrato_id);
          uploadedUrl = await movePreparteFile(
            formData.image_url,
            cliente?.name || 'empresa',
            contrato?.service_name || 'servicio',
            numeroPedido
          );
        }

        // PP-3: Crear prepartes por cada ítem con su propia fecha
        const prepartesToCreate: Omit<Preparte, 'id'>[] = [];

        for (const item of formData.item) {
          if (!item.id) continue;

          // PP-3: Cada ítem tiene su propia configuración de fecha
          const isSubjectToAvailability = item.subject_to_availability ?? false;
          const itemExecutionDate = item.executionDate;

          if (isSubjectToAvailability) {
            // Ítem sujeto a disponibilidad: crear sin fecha
            for (let i = 0; i < (item.quantity || 1); i++) {
              prepartesToCreate.push({
                cliente_id: formData.cliente_id,
                contrato_id: formData.contrato_id,
                // PP-3: Usar campos del ítem
                tipo: item.tipo || '',
                jornada: item.jornada || '',
                start_time: item.start_time || null,
                end_time: item.end_time || null,
                observaciones: item.observaciones || '',
                solicitante: formData.solicitante,
                status: 'pendiente',
                item: item.id,
                executionDate: null, // Sin fecha
                requestDate: moment(formData.requestDate).format('YYYY-MM-DD'),
                quantity: 1,
                numero_pedido: numeroPedido,
                sector_service_id: formData.sector_service_id || null,
                areas_service_id: formData.areas_service_id || null,
                equipos_cliente: formData.equipos_cliente?.[0] || null,
                preparteImage: uploadedUrl || null,
                subject_to_availability: true,
              });
            }
          } else {
            // Ítem con fecha: crear por cada fecha en el rango
            if (!itemExecutionDate?.from) {
              toast.error(`El ítem debe tener fecha de ejecución o estar sujeto a disponibilidad`);
              return;
            }

            const dates = itemExecutionDate.to
              ? getDatesInRange(new Date(itemExecutionDate.from), new Date(itemExecutionDate.to))
              : [new Date(itemExecutionDate.from)];

            for (let i = 0; i < (item.quantity || 1); i++) {
              for (const date of dates) {
                prepartesToCreate.push({
                  cliente_id: formData.cliente_id,
                  contrato_id: formData.contrato_id,
                  // PP-3: Usar campos del ítem
                  tipo: item.tipo || '',
                  jornada: item.jornada || '',
                  start_time: item.start_time || null,
                  end_time: item.end_time || null,
                  observaciones: item.observaciones || null,
                  solicitante: formData.solicitante,
                  status: 'pendiente',
                  item: item.id,
                  quantity: 1,
                  executionDate: moment(date).format('YYYY-MM-DD'),
                  requestDate: moment(formData.requestDate).format('YYYY-MM-DD'),
                  numero_pedido: numeroPedido,
                  sector_service_id: formData.sector_service_id || null,
                  areas_service_id: formData.areas_service_id || null,
                  equipos_cliente: formData.equipos_cliente?.[0] || null,
                  preparteImage: uploadedUrl || null,
                  subject_to_availability: false,
                });
              }
            }
          }
        }

        if (prepartesToCreate.length === 0) {
          toast.error('Debe agregar al menos un ítem válido');
          return;
        }

        const createdPrepartes = await createPreparte(prepartesToCreate);

        // Contar cuántos están sujetos a disponibilidad
        const subjectToAvailabilityCount = prepartesToCreate.filter((p) => p.subject_to_availability).length;
        const withDateCount = prepartesToCreate.length - subjectToAvailabilityCount;

        let successMessage = `Se crearon ${createdPrepartes.length} pedidos con N° ${numeroPedido}`;
        if (subjectToAvailabilityCount > 0 && withDateCount > 0) {
          successMessage += ` (${withDateCount} con fecha, ${subjectToAvailabilityCount} pendientes de fecha)`;
        } else if (subjectToAvailabilityCount > 0) {
          successMessage += ` (pendientes de fecha)`;
        }

        toast.success(successMessage);

        // Refresh de la tabla
        refreshTable();
      }

      // PP-3: Reset form and close (campos por ítem ya no están a nivel global)
      setFormData({
        id: '',
        cliente_id: '',
        contrato_id: '',
        item: [],
        requestDate: new Date(),
        solicitante: '',
        status: 'pendiente',
        sector_service_id: '',
        areas_service_id: '',
        equipos_cliente: [],
      });
      setOpen(false);
      setIsEditing(false);
      setCurrentItem(null);
    } catch (error) {
      logger.error('Error saving preparte', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al guardar el pedido');
    }
  };

  const handleEdit = (item: PreparteItem) => {
    // PP-3: Convert the item string to the expected array format with date info
    // En registros existentes, la fecha está a nivel de preparte, la movemos al ítem
    const existingSubjectToAvailability = item.subject_to_availability ?? false;

    // Parsear executionDate: es string ISO (de BD) o null
    let existingExecutionDate: { from?: Date; to?: Date } | undefined = undefined;

    if (!existingSubjectToAvailability && item.executionDate) {
      existingExecutionDate = {
        from: new Date(item.executionDate),
        to: undefined,
      };
    }
    // Si subject_to_availability es true, la fecha debe quedar undefined

    const itemArray =
      typeof item.item === 'string'
        ? [
            {
              id: item.item,
              quantity: item.quantity || 1,
              // PP-3: Cargar campos del registro existente al ítem
              jornada: item.jornada || '',
              tipo: item.tipo || '',
              observaciones: item.observaciones || '',
              start_time: item.start_time || '',
              end_time: item.end_time || '',
              executionDate: existingExecutionDate,
              subject_to_availability: existingSubjectToAvailability,
            },
          ]
        : (item.item || []).map((i: any) => ({
            id: i.id || i,
            quantity: i.quantity || 1,
            jornada: i.jornada || item.jornada || '',
            tipo: i.tipo || item.tipo || '',
            observaciones: i.observaciones || item.observaciones || '',
            start_time: i.start_time || item.start_time || '',
            end_time: i.end_time || item.end_time || '',
            executionDate: i.executionDate || existingExecutionDate,
            subject_to_availability: i.subject_to_availability ?? existingSubjectToAvailability,
          }));

    // Normalize sector/area/equipos for edit UI
    const cliente = Customers.find((c) => c.id === item.cliente_id);
    const service = cliente?.customer_services?.find((s) => s.id === item.contrato_id);

    // Sector mapping -> to service_sectors.id
    let sectorForForm = item.sector_service_id || '';
    if (service?.service_sectors && service.service_sectors.length) {
      const direct = service.service_sectors.find((ss) => ss.id === sectorForForm);
      if (!direct) {
        const bySectorId = service.service_sectors.find((ss) => ss.sectors?.id === sectorForForm);
        if (bySectorId) {
          sectorForForm = bySectorId.id;
        } else {
          const sc = cliente?.sector_customer?.find(
            (x: any) => x.id === sectorForForm || x.sector_id === sectorForForm
          );
          if (sc?.sector_id) {
            const via = service.service_sectors.find((ss) => ss.sectors?.id === sc.sector_id);
            if (via) sectorForForm = via.id;
          }
        }
      }
    }

    // Area mapping -> to service_areas.id
    let areaForForm = item.areas_service_id || '';
    if (service?.service_areas && service.service_areas.length) {
      const directA = service.service_areas.find((sa) => sa.id === areaForForm);
      if (!directA) {
        const byAreaCliente = service.service_areas.find((sa) => sa.areas_cliente?.id === areaForForm);
        if (byAreaCliente) areaForForm = byAreaCliente.id;
      }
    }

    // Equipos mapping -> ensure array for multiselect
    const equiposForForm = Array.isArray(item.equipos_cliente)
      ? item.equipos_cliente
      : item.equipos_cliente
        ? [item.equipos_cliente as unknown as string]
        : [];

    // PP-3: jornada, tipo, observaciones, fecha y subject_to_availability ahora están en el itemArray
    setFormData({
      id: item.id,
      cliente_id: item.cliente_id,
      contrato_id: item.contrato_id || '',
      item: itemArray,
      requestDate: item.requestDate ? new Date(item.requestDate) : new Date(),
      solicitante: item.solicitante || '',
      status: item.status || 'pendiente',
      quantity: item.quantity || 1,
      numero_pedido: item.numero_pedido || '',
      // Campos del pedido general
      sector_service_id: sectorForForm,
      areas_service_id: areaForForm,
      equipos_cliente: equiposForForm,
      image_url: item.preparteImage || '',
      original_item_id: typeof item.item === 'string' ? item.item : undefined,
    });

    setCurrentItem(item);
    setIsEditing(true);
    setOpen(true);
  };

  const handleConfirm = async (item: PreparteItem) => {
    try {
      // executionDate puede venir como string YYYY-MM-DD de la BD o como Date
      const execDate = item.executionDate ? moment(item.executionDate) : null;

      // Verificar si está sujeto a disponibilidad y no tiene fecha
      if (item.subject_to_availability && !execDate?.isValid()) {
        toast.error(
          'Este pedido está sujeto a disponibilidad operativa. Debe asignar una fecha de ejecución antes de confirmar.',
          { duration: 5000 }
        );
        // Abrir el formulario de edición para que el usuario asigne la fecha
        handleEdit(item);
        throw new Error('Pedido sujeto a disponibilidad sin fecha asignada');
      }

      // Verificar que tenga fecha de ejecución
      if (!execDate || !execDate.isValid()) {
        toast.error('El pedido debe tener una fecha de ejecución para poder confirmarse.');
        throw new Error('El pedido no tiene fecha de ejecución válida');
      }

      // Confirmar y migrar al parte diario via server action
      await confirmPreparteToDailyReport(item.id, execDate.format('YYYY-MM-DD'));

      refreshTable();
      toast.success('Pedido confirmado y enviado al parte diario');
    } catch (error) {
      logger.error('Error al confirmar el pedido', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al confirmar el pedido');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreparte(id);

      // Refresh de la tabla
      refreshTable();
      toast.success('Pedido eliminado correctamente');
    } catch (error) {
      logger.error('Error al eliminar', { data: { error } });
      toast.error('Error al eliminar el pedido');
    }
  };

  const handleFetchData = async (opciones: {
    pageIndex: number;
    pageSize: number;
    sorting: any[];
    columnFilters: any[];
  }) => {
    try {
      setIsLoading(true);
      return await fetchPrepartes(opciones);
    } catch (error) {
      logger.error('Error al cargar datos', { data: { error } });
      return { rows: [], pageCount: 0, rowCount: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[100vw] px-4">
      <div className="overflow-y-auto flex justify-between items-center w-full">
        <h2 className="text-2xl font-bold" data-testid="preparte-title">
          Gestión de Pedidos
        </h2>
        <PermissionGuard module="operaciones" tab="preparte" action="create">
          <Button
            data-testid="nuevo-pedido-button"
            onClick={() => {
              // Limpiar el formulario al abrir para nuevo pedido
              setIsEditing(false);
              setCurrentItem(null);
              setFormData({
                id: '',
                cliente_id: '',
                contrato_id: '',
                item: [],
                requestDate: new Date(),
                solicitante: '',
                status: 'pendiente',
                sector_service_id: '',
                areas_service_id: '',
                equipos_cliente: [],
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pedido
          </Button>
        </PermissionGuard>
      </div>

      {/* Sheet fuera del contenedor flex para no afectar el layout */}
      <Sheet open={open} onOpenChange={setOpen}>
        {/* SheetTrigger vacío ya que controlamos la apertura manualmente */}
        <SheetTrigger asChild>
          <span className="hidden" />
        </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto w-[750px] max-w-[75vw] sm:max-w-[75vw]">
          <SheetHeader className="mb-6">
            <SheetTitle>{isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}</SheetTitle>
          </SheetHeader>
          <PreparteForm
            // Key para forzar remontaje cuando se cambia entre editar y crear
            key={isEditing ? `edit-${currentItem?.id}` : 'create-new'}
            formData={formData}
            clientes={Customers}
            contratos={contratos}
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onSubmit={(formData: PreparteFormData) => handleSubmit(formData)}
            onCancel={() => {
              setOpen(false);
              setIsEditing(false);
              setCurrentItem(null);
              // PP-3: Reset (campos por ítem ya no están a nivel global)
              setFormData({
                id: '',
                cliente_id: '',
                contrato_id: '',
                item: [],
                requestDate: new Date(),
                solicitante: '',
                status: 'pendiente',
                sector_service_id: '',
                areas_service_id: '',
                equipos_cliente: [],
              });
            }}
          />
        </SheetContent>
      </Sheet>

      <Card className="w-full">
        <CardContent className="p-2">
          <PreparteTable
            data={prepartes}
            Customers={Customers}
            contratos={contratos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onConfirm={handleConfirm}
            savedVisibility={savedVisibility}
            fetchData={handleFetchData}
            isLoading={isLoading}
            statusCards={statusCards}
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
