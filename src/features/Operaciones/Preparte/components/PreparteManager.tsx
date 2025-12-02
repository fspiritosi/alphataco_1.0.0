'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  checkDailyReportExists,
  createDailyReport,
  createDailyReportCustomerEquipmentRelations,
  createDailyReportRow,
} from '@/features/Operaciones/PartesDiarios/actions/actions';
import {
  createPreparte,
  deletePreparte,
  fetchPrepartes,
  getLastOrderNumber,
  getPreparteById,
  movePreparteFile,
  updatePreparte,
} from '@/features/Operaciones/Preparte/actions/preparte';
import { PermissionGuard } from '@/features/Permissions';
import { VisibilityState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PreparteForm } from './PreparteForm';
import { PreparteTable } from './PreparteTable';

// Tipo de datos para los clientes
export type Cliente = {
  id: string;
  name: string;
  // relaciones opcionales necesarias para sector/área/equipos (alineado con Partes Diarios)
  customer_services?: Array<{
    id: string;
    service_id: string;
    service_sectors?: Array<{
      id: string;
      service_id: string;
      sectors?: { id: string; name: string } | null;
    }>;
    service_areas?: Array<{
      id: string;
      service_id: string;
      areas_cliente?: { id: string; nombre: string } | null;
    }>;
    equipos_clientes?: Array<{
      id: string;
      name: string;
    }>;
  }>;
  // equipos a nivel de cliente
  sector_customer?: Array<{ id: string; sector_id: string; sectors?: { id: string; name: string } | null }>;
  equipos_clientes?: Array<{ id: string; name: string }>;
};

// Tipo de datos para los prepartes
export type PreparteItem = {
  id: string;
  cliente_id: string;
  contrato_id: string;
  confirmed_by?: string;
  item: {
    id: string;
    quantity: number;
  }[];
  requestDate: Date;
  executionDate: {
    from: Date;
    to?: Date;
  };
  tipo: string;
  jornada: string;
  start_time?: string;
  end_time?: string;
  solicitante: string;
  observaciones?: string;
  status: 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'confirmado' | 'vencido';
  cancel_reason?: string;
  rejected_reason?: string;
  reprogram_reason?: string;
  reprogram?: Date;
  quantity?: number;
  numero_pedido?: string;
  // nuevos campos
  sector_service_id?: string;
  areas_service_id: string;
  equipos_cliente: string[];
  preparteImage?: string;
  image_url?: string;
};

interface PreparteManagerProps {
  // items: PreparteItem[];
  Customers: Cliente[];
  contratos: Contrato[];
  itemsList: Array<{ id: string; item_name: string }>;
  prepartes: PreparteItem[];
}

export interface Contrato {
  id: string;
  service_name: string;
}

export interface itemDaily {
  id: string;
  cliente_id: string;
  contrato_id: string;
  item: string;
  start_time: string;
  end_time: string;
  jornada: string;
  description: string;
  status: string;
  executionDate: string;
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

export function PreparteManager({ itemsList, Customers, contratos, prepartes }: PreparteManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PreparteItem | null>(null);
  const [open, setOpen] = useState(false);
  const [savedVisibility] = useState<VisibilityState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formData, setFormData] = useState<PreparteItem>({
    id: '',
    cliente_id: '',
    contrato_id: '',
    item: [],
    requestDate: new Date(),
    executionDate: {
      from: new Date(),
      to: undefined,
    },
    tipo: '',
    jornada: '',
    start_time: '',
    end_time: '',
    solicitante: '',
    status: 'pendiente',
    observaciones: '',
    // defaults nuevos
    sector_service_id: '',
    areas_service_id: '',
    equipos_cliente: [],
    preparteImage: '',
    image_url: '',
  });

  const router = useRouter();

  // Función para forzar refresh de la tabla
  const refreshTable = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleInputChange = (field: keyof PreparteItem, value: any) => {
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

  const handleSubmit = async (formData: PreparteItem) => {
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

        const updatedPreparte = {
          ...formData,
          id: currentItem.id,
          item: formData.item[0]?.id || null,
          quantity: 1, // Always set quantity to 1
          executionDate:
            typeof formData.executionDate === 'object'
              ? formData.executionDate.from.toISOString()
              : formData.executionDate,
          updated_at: new Date().toISOString(),
          numero_pedido: formData.numero_pedido,
          // Si el estado es 'reprogramado', guardamos el ID del preparte original
          reprogram: formData.status === 'reprogramado' ? currentItem.id : formData.reprogram,
          // incluir sector/área/equipos si existen
          sector_service_id: formData.sector_service_id ?? '',
          areas_service_id: formData.areas_service_id ?? '',
          equipos_cliente: formData.equipos_cliente ?? [],
          // persistir en columna DB (procesada)
          preparteImage: imageUrl,
        };

        await updatePreparte(currentItem.id, updatedPreparte as any);
        toast.success('Pedido actualizado correctamente');

        // Refresh de la tabla
        refreshTable();
        router.refresh();
      } else {
        // Generar número de pedido
        const numeroPedido = await generateOrderNumber();

        // Create new prepartes
        const dates = formData.executionDate.to
          ? getDatesInRange(new Date(formData.executionDate.from), new Date(formData.executionDate.to))
          : [new Date(formData.executionDate.from)];

        // Si image_url viene del formulario (ya subido), mover a la estructura final y renombrar con el número de pedido
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

        // Create one line per item with quantity 1
        const prepartesToCreate = [] as any[];

        for (const item of formData.item) {
          // For each quantity of the item, create a separate line
          for (let i = 0; i < (item.quantity || 1); i++) {
            // For each date in the range
            for (const date of dates) {
              prepartesToCreate.push({
                cliente_id: formData.cliente_id,
                contrato_id: formData.contrato_id,
                tipo: formData.tipo,
                jornada: formData.jornada,
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                solicitante: formData.solicitante,
                status: 'pendiente',
                item: item.id,
                quantity: 1, // Always 1 per line
                observaciones: formData.observaciones || null,
                executionDate: date.toISOString(),
                requestDate: formData.requestDate.toISOString(),
                numero_pedido: numeroPedido,
                sector_service_id: formData.sector_service_id ?? '',
                areas_service_id: formData.areas_service_id ?? '',
                equipos_cliente: formData.equipos_cliente ?? [],
                // persistir en columna DB (misma URL para todas las filas del mismo pedido)
                preparteImage: uploadedUrl || null,
              });
            }
          }
        }

        const createdPrepartes = await createPreparte(prepartesToCreate as any);
        toast.success(
          `Se crearon ${createdPrepartes.length} pedidos correctamente con el número de pedido ${numeroPedido}`
        );

        // Refresh de la tabla
        refreshTable();
        router.refresh();
      }

      // Reset form and close
      setFormData({
        id: '',
        cliente_id: '',
        contrato_id: '',
        item: [],
        requestDate: new Date(),
        executionDate: {
          from: new Date(),
          to: undefined,
        },
        tipo: '',
        jornada: '',
        start_time: '',
        end_time: '',
        solicitante: '',
        status: 'pendiente',
        cancel_reason: '',
        reprogram: new Date(),
        observaciones: '',
        sector_service_id: '',
        areas_service_id: '',
        equipos_cliente: [],
        preparteImage: '',
        image_url: '',
      });
      setOpen(false);
      setIsEditing(false);
      setCurrentItem(null);
    } catch (error) {
      console.error('Error saving preparte:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el pedido');
    }
  };

  const handleEdit = (item: PreparteItem) => {
    // Convert the item string to the expected array format
    const itemArray =
      typeof item.item === 'string' ? [{ id: item.item, quantity: item.quantity || 1 }] : item.item || [];

    // Normalize sector/area/equipos for edit UI
    const cliente = Customers.find((c) => c.id === item.cliente_id);
    const service = cliente?.customer_services?.find((s) => s.service_id === item.contrato_id);

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

    setFormData({
      id: item.id,
      cliente_id: item.cliente_id,
      contrato_id: item.contrato_id || '',
      item: itemArray,
      requestDate: item.requestDate ? new Date(item.requestDate) : new Date(),
      executionDate: item.executionDate ? { from: new Date(item.executionDate as any) } : { from: new Date() },
      tipo: item.tipo || '',
      jornada: item.jornada || '',
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      solicitante: item.solicitante || '',
      status: item.status || 'pendiente',
      quantity: item.quantity || 1,
      observaciones: item.observaciones || '',
      numero_pedido: item.numero_pedido || '',
      // nuevos campos (mapped for UI expectations)
      sector_service_id: sectorForForm,
      areas_service_id: areaForForm,
      equipos_cliente: equiposForForm,
      preparteImage: item.preparteImage || '',
      image_url: '',
    });

    setCurrentItem(item);
    setIsEditing(true);
    setOpen(true);
  };

  const handleConfirm = async (item: PreparteItem) => {
    try {
      // 1. Format execution date
      const execSrc: any = item.executionDate;
      const execDateInput = typeof execSrc === 'object' && execSrc?.from ? execSrc.from : execSrc;
      const executionDate = format(new Date(execDateInput), 'yyyy-MM-dd');

      // 2. Check if daily report exists for this date
      const existingReports = await checkDailyReportExists([executionDate]);
      let dailyReportId = existingReports[0]?.id;

      // 3. Create new daily report if it doesn't exist
      if (!dailyReportId) {
        const newReport = await createDailyReport([executionDate]);
        if (!newReport?.[0]?.id) {
          throw new Error('No se pudo crear el parte diario');
        }
        dailyReportId = newReport[0].id;
      }

      // 4. Get the current preparte record to ensure we have the latest data
      const currentItem = await getPreparteById(item.id);

      if (!currentItem) {
        throw new Error('No se pudo cargar el pedido');
      }

      // 5. Create daily report row
      const dailyReportData = {
        daily_report_id: dailyReportId,
        customer_id: currentItem.cliente_id,
        service_id: currentItem.contrato_id,
        item_id: Array.isArray(currentItem.item) ? currentItem.item[0]?.id : currentItem.item,
        start_time: currentItem.start_time || null,
        end_time: currentItem.end_time || null,
        working_day: currentItem.jornada,
        description: currentItem.observaciones || '',
        sector_service_id: currentItem.sector_service_id,
        areas_service_id: currentItem.areas_service_id,
        type_service: currentItem.tipo,
        status: 'sin_recursos_asignados',
        preparte_id: item.id,
      };

      const createdRows = await createDailyReportRow([dailyReportData as any]);
      const createdRowId = createdRows?.[0]?.id;

      if (!createdRowId) {
        throw new Error('No se pudo crear la fila en el parte diario');
      }

      // 6. Handle equipment if needed
      if (currentItem.equipos_cliente) {
        const equipmentIds = Array.isArray(currentItem.equipos_cliente)
          ? currentItem.equipos_cliente
          : [currentItem.equipos_cliente].filter(Boolean);

        if (equipmentIds.length > 0) {
          await createDailyReportCustomerEquipmentRelations(createdRowId, equipmentIds);
        }
      }

      // 7. Update preparte status
      await updatePreparte(currentItem.id, {
        status: currentItem.status === 'vencido' ? 'vencido' : 'confirmado',
        updated_at: new Date().toISOString(),
      });

      // Refresh de la tabla
      refreshTable();
      router.refresh();
      toast.success('Pedido confirmado y enviado al parte diario');
    } catch (error) {
      console.error('Error al confirmar el pedido:', error);
      toast.error(error instanceof Error ? error.message : 'Error al confirmar el pedido');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreparte(id);

      // Refresh de la tabla
      refreshTable();
      router.refresh();
      toast.success('Pedido eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
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
      console.error('Error al cargar datos:', error);
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
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <PermissionGuard module="operaciones" tab="preparte" action="create">
              <Button data-testid="nuevo-pedido-button">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Pedido
              </Button>
            </PermissionGuard>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto w-[750px] max-w-[75vw] sm:max-w-[75vw]">
            <SheetHeader className="mb-6">
              <SheetTitle>{isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}</SheetTitle>
            </SheetHeader>
            <PreparteForm
              formData={formData}
              clientes={Customers as Cliente[]}
              contratos={contratos as Contrato[]}
              isEditing={isEditing}
              onInputChange={handleInputChange}
              onSubmit={(formData: PreparteItem) => handleSubmit(formData)}
              onCancel={() => {
                setOpen(false);
                setIsEditing(false);
                setCurrentItem(null);
                setFormData({
                  id: '',
                  cliente_id: '',
                  contrato_id: '',
                  item: [],
                  requestDate: new Date(),
                  executionDate: {
                    from: new Date(),
                    to: undefined,
                  },
                  tipo: '',
                  jornada: '',
                  start_time: '',
                  end_time: '',
                  solicitante: '',
                  status: 'pendiente',
                  cancel_reason: '',
                  reprogram: new Date(),
                  observaciones: '',
                  sector_service_id: '',
                  areas_service_id: '',
                  equipos_cliente: [],
                  preparteImage: '',
                  image_url: '',
                });
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      <Card className="w-full">
        <CardContent className="p-2">
          <PreparteTable
            data={prepartes}
            Customers={Customers}
            contratos={contratos}
            items={itemsList}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onConfirm={handleConfirm}
            savedVisibility={savedVisibility}
            fetchData={handleFetchData}
            isLoading={isLoading}
            refreshKey={refreshKey}
          />
        </CardContent>
      </Card>
    </div>
  );
}
