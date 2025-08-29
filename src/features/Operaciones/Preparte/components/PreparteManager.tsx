'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  checkDailyReportExists,
  createDailyReport,
  createDailyReportRow,
} from '@/features/Operaciones/PartesDiarios/actions/actions';
import {
  createPreparte,
  deletePreparte,
  getLastOrderNumber,
  updatePreparte,
} from '@/features/Operaciones/Preparte/actions/preparte';
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
};

// Tipo de datos para los prepartes
export type PreparteItem = {
  id: string;
  cliente_id: string;
  contrato_id: string;
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
  status: 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'confirmado';
  cancel_reason?: string;
  rejected_reason?: string;
  reprogram_reason?: string;
  reprogram?: Date;
  quantity?: number;
  numero_pedido?: string;
};

interface PreparteManagerProps {
  items: PreparteItem[];
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

export function PreparteManager({ items, itemsList, Customers, contratos, prepartes }: PreparteManagerProps) {
  const [item, setItem] = useState<PreparteItem[]>(items);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PreparteItem | null>(null);
  const [open, setOpen] = useState(false);
  const [savedVisibility, setSavedVisibility] = useState<VisibilityState>({});
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
  });
  const router = useRouter();
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
        // Update existing preparte
        const updatedPreparte = {
          ...formData,
          id: currentItem.id,
          item: formData.item[0]?.id || null,
          quantity: formData.item[0]?.quantity || 1,
          executionDate:
            typeof formData.executionDate === 'object'
              ? formData.executionDate.from.toISOString()
              : formData.executionDate,
          updated_at: new Date().toISOString(),
          numero_pedido: formData.numero_pedido,
          // Si el estado es 'reprogramado', guardamos el ID del preparte original
          reprogram: formData.status === 'reprogramado' ? currentItem.id : formData.reprogram,
        };

        await updatePreparte(currentItem.id, updatedPreparte as any);
        toast.success('Pedido actualizado correctamente');
      } else {
        // Generar número de pedido
        const numeroPedido = await generateOrderNumber();

        // Create new prepartes
        const dates = formData.executionDate.to
          ? getDatesInRange(new Date(formData.executionDate.from), new Date(formData.executionDate.to))
          : [new Date(formData.executionDate.from)];

        const prepartesToCreate = formData.item.flatMap((item) =>
          dates.map((date) => ({
            cliente_id: formData.cliente_id,
            contrato_id: formData.contrato_id,
            tipo: formData.tipo,
            jornada: formData.jornada,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            solicitante: formData.solicitante,
            status: 'pendiente',
            item: item.id,
            quantity: item.quantity,
            observaciones: formData.observaciones || null,
            executionDate: date.toISOString(),
            requestDate: formData.requestDate.toISOString(),
            numero_pedido: numeroPedido, // Añadir el número de pedido generado
          }))
        );
        console.log(prepartesToCreate);
        const createdPrepartes = await createPreparte(prepartesToCreate as any);
        toast.success(
          `Se crearon ${createdPrepartes.length} pedidos correctamente con el número de pedido ${numeroPedido}`
        );
      }

      // Reset form and close
      setFormData({
        id: '',
        cliente_id: '',
        contrato_id: '',
        item: [],
        requestDate: new Date(),
        executionDate: { from: new Date() },
        tipo: '',
        jornada: '',
        start_time: '',
        end_time: '',
        solicitante: '',
        status: 'pendiente',
        observaciones: '',
      });
      setOpen(false);
      setIsEditing(false);
      setCurrentItem(null);
      router.refresh();
    } catch (error) {
      console.error('Error saving preparte:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el pedido');
    }
  };
  const handleEdit = (item: PreparteItem) => {
    // Convert the item string to the expected array format
    console.log(item);
    const itemArray =
      typeof item.item === 'string' ? [{ id: item.item, quantity: item.quantity || 1 }] : item.item || [];
    console.log(itemArray);
    setFormData({
      id: item.id,
      cliente_id: item.cliente_id,
      contrato_id: item.contrato_id || '',
      item: itemArray, // Use the converted array
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
    });

    setCurrentItem(item);
    setIsEditing(true);
    setOpen(true);
    router.refresh();
  };
  const handleConfirm = async (item: itemDaily) => {
    console.log(item);
    try {
      // 1. Formatear la fecha de ejecución
      const executionDate = format(new Date(item.executionDate), 'yyyy-MM-dd');
      console.log(executionDate);
      // 2. Verificar si ya existe un parte diario para esta fecha
      const existingReports = await checkDailyReportExists([executionDate]);
      let dailyReportId = existingReports[0]?.id;
      console.log(dailyReportId);
      // 3. Si no existe, crear un nuevo parte diario
      if (!dailyReportId) {
        const newReport = await createDailyReport([executionDate]);
        if (!newReport?.[0]?.id) {
          throw new Error('No se pudo crear el parte diario');
        }
        dailyReportId = newReport[0].id;
      }

      // 4. Crear la fila en el parte diario
      const dailyReportData = {
        daily_report_id: dailyReportId,
        customer_id: item.cliente_id,
        service_id: item.contrato_id,
        item_id: item.item,
        ...(item.start_time && { start_time: item.start_time }), // Only include if not empty
        ...(item.end_time && { end_time: item.end_time }), // Only include if not empty
        working_day: item.jornada,
        description: item.description || '',
        status: 'sin_recursos_asignados',
      };
      console.log(dailyReportData);
      await createDailyReportRow([dailyReportData as any]);

      // 5. Actualizar el estado del preparte a 'confirmado'
      await updatePreparte(item.id, {
        ...item,
        status: 'confirmado',
      });

      toast.success('Pedido confirmado y enviado al parte diario');
      // Actualizar la lista de prepartes
      router.refresh();
    } catch (error) {
      console.error('Error al confirmar el pedido:', error);
      toast.error(error instanceof Error ? error.message : 'Error al confirmar el pedido');
    }
  };

  const handleDelete = (id: string) => {
    deletePreparte(id);
    setItem((prev) => prev.filter((item) => item.id !== id));
    toast.success('Pedido eliminado correctamente');
    router.refresh();
  };

  return (
    <div className="space-y-6 w-full max-w-[100vw] px-4">
      <div className="overflow-y-auto flex justify-between items-center w-full">
        <h2 className="text-2xl font-bold">Gestión de Pedidos</h2>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pedido
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto w-[750px] max-w-[75vw] sm:max-w-[75vw]">
            <SheetHeader className="mb-6">
              <SheetTitle>{isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}</SheetTitle>
            </SheetHeader>
            {/* <div className="space-y-4 rounded-lg dark:bg-slate-900 bg-slate-50 p-4 w-full"> */}
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
                });
              }}
            />
            {/* </div>  */}
          </SheetContent>
        </Sheet>
      </div>

      <Card className="w-full max-w-full">
        <CardContent className="p-2">
          <div className="w-full overflow-x-auto">
            <PreparteTable
              data={prepartes}
              Customers={Customers}
              contratos={contratos}
              items={itemsList}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConfirm={handleConfirm as any}
              savedVisibility={savedVisibility}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
