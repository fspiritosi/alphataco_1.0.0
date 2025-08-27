'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { createPreparte, deletePreparte, updatePreparte } from '@/features/Operaciones/Preparte/actions/preparte';
import { VisibilityState } from '@tanstack/react-table';
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
  reprogram_date?: Date;
  quantity?: number;
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

  // const handleSubmit = async (formData: PreparteItem) => {
  //   try {
  //     // Get all dates in range
  //     const dates = formData.executionDate.to
  //       ? getDatesInRange(new Date(formData.executionDate.from), new Date(formData.executionDate.to))
  //       : [new Date(formData.executionDate.from)];

  //     // Prepare all prepartes to create
  //     const prepartesToCreate = formData.item
  //       .flatMap((item) =>
  //         dates.map((date) => ({
  //           cliente_id: formData.cliente_id,
  //           contrato_id: formData.contrato_id,
  //           tipo: formData.tipo,
  //           jornada: formData.jornada,
  //           start_time: formData.start_time || null,
  //           end_time: formData.end_time || null,
  //           solicitante: formData.solicitante,
  //           status: 'pendiente',
  //           item: item.id,
  //           quantity: item.quantity,
  //           observaciones: formData.observaciones || null,
  //           executionDate: date.toISOString(),
  //           requestDate: formData.requestDate.toISOString(),
  //         }))
  //       )
  //       .flat();
  //     console.log(prepartesToCreate);

  //     // Create all prepartes in a single database call
  //     const createdPrepartes = await createPreparte(prepartesToCreate as any);

  //     // Show success message with the number of created items
  //     toast.success(`Se crearon ${createdPrepartes.length} prepartes correctamente`);

  //     // Reset form
  //     // onCancel();
  //   } catch (error) {
  //     console.error('Error saving prepartes:', error);
  //     toast.error('Error al guardar los prepartes');
  //   }
  // };

  const handleSubmit = async (formData: PreparteItem) => {
    try {
      if (isEditing && currentItem?.id) {
        // Update existing preparte
        const updatedPreparte = {
          ...formData,
          id: currentItem.id,
          item: formData.item[0]?.id || null,
          quantity: formData.item[0]?.quantity || 1,
          // Convert executionDate to string if it's an object
          executionDate:
            typeof formData.executionDate === 'object'
              ? formData.executionDate.from.toISOString()
              : formData.executionDate,
          updated_at: new Date().toISOString(),
        };

        await updatePreparte(currentItem.id, updatedPreparte as any);
        toast.success('Preparte actualizado correctamente');
      } else {
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
          }))
        );

        const createdPrepartes = await createPreparte(prepartesToCreate as any);
        toast.success(`Se crearon ${createdPrepartes.length} prepartes correctamente`);
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

      // Optionally refresh the prepartes list here
      // const updatedPrepartes = await listPrepartes();
      // setItem(updatedPrepartes);
    } catch (error) {
      console.error('Error saving preparte:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el preparte');
    }
    router.refresh();
  };
  const handleEdit = (item: PreparteItem) => {
    // Convert the item string to the expected array format
    const itemArray =
      typeof item.item === 'string' ? [{ id: item.item, quantity: item.quantity || 1 }] : item.item || [];

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
    });

    setCurrentItem(item);
    setIsEditing(true);
    setOpen(true);
    router.refresh();
  };

  const handleDelete = (id: string) => {
    deletePreparte(id);
    setItem((prev) => prev.filter((item) => item.id !== id));
    toast.success('Preparte eliminado correctamente');
    router.refresh();
  };

  return (
    <div className="space-y-6 w-full max-w-[100vw] px-4">
      <div className="overflow-y-auto flex justify-between items-center w-full">
        <h2 className="text-2xl font-bold">Gestión de Prepartes</h2>
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
                  reprogram_date: new Date(),
                  observaciones: '',
                });
              }}
            />
            {/* </div>  */}
          </SheetContent>
        </Sheet>
      </div>

      <Card className="w-full max-w-full">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <PreparteTable
              data={prepartes}
              Customers={Customers}
              contratos={contratos}
              items={itemsList}
              onEdit={handleEdit}
              onDelete={handleDelete}
              savedVisibility={savedVisibility}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
