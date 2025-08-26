'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VisibilityState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
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
  clienteId: string;
  clienteName: string;
  contratoId: string;
  items: {
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
  solicitante: string;
  observaciones?: string;
  status?: string;
};

interface PreparteManagerProps {
  items: PreparteItem[];
  Customers: Cliente[];
  contratos: Contrato[];
  itemsList: Array<{ id: string; item_name: string }>;
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

export function PreparteManager({ items, itemsList, Customers, contratos }: PreparteManagerProps) {
  const [item, setItem] = useState<PreparteItem[]>(items);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PreparteItem | null>(null);
  const [open, setOpen] = useState(false);
  const [savedVisibility, setSavedVisibility] = useState<VisibilityState>({});
  const [formData, setFormData] = useState<PreparteItem>({
    id: '',
    clienteId: '',
    clienteName: '',
    contratoId: '',
    items: [],
    requestDate: new Date(),
    executionDate: {
      from: new Date(),
      to: undefined,
    },
    tipo: '',
    jornada: '',
    solicitante: '',
    observaciones: '',
  });

  const handleInputChange = (field: keyof PreparteItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (formData: PreparteItem) => {
    const clienteSeleccionado = Customers.find((c) => c.id === formData.clienteId);
    const clienteName = clienteSeleccionado?.name || formData.clienteName || '';

    if (isEditing && currentItem?.id) {
      setItem((prevItems) =>
        prevItems.map((item) =>
          item.id === currentItem.id
            ? {
                ...formData,
                id: currentItem.id,
                clienteName,
              }
            : item
        )
      );
      toast('Pedido actualizado correctamente');
    } else {
      // Get all dates in range
      const dates = formData.executionDate.to
        ? getDatesInRange(new Date(formData.executionDate.from), new Date(formData.executionDate.to))
        : [new Date(formData.executionDate.from)];

      // Generate a base timestamp for consistent IDs
      const timestamp = Date.now();

      // Create a new order for each item on each date
      const newItems = dates.flatMap((date, dateIndex) =>
        formData.items.map((item, itemIndex) => {
          // Create a new date object for each item to avoid reference issues
          const executionDate = new Date(date);

          return {
            ...formData,
            id: `preparte_${timestamp}_${itemIndex}_${date.getTime()}`,
            items: [{ ...item }], // Single item per order with its own reference
            executionDate: {
              from: executionDate,
              // No need for 'to' in individual items
            },
            clienteName,
            status: 'pendiente',
            requestDate: new Date(formData.requestDate), // Ensure new date object
          };
        })
      );

      setItem((prevItems) => [...prevItems, ...newItems]);
      toast(`Se han creado ${newItems.length} líneas correctamente.`);
    }

    // Reset form
    setFormData({
      id: '',
      clienteId: '',
      clienteName: '',
      contratoId: '',
      items: [],
      requestDate: new Date(),
      executionDate: {
        from: new Date(),
        to: undefined,
      },
      tipo: '',
      jornada: '',
      solicitante: '',
      observaciones: '',
    });
    setOpen(false);
    setIsEditing(false);
    setCurrentItem(null);
  };

  const handleEdit = (item: PreparteItem) => {
    // Asegurarse de que todos los campos requeridos estén presentes
    setFormData({
      id: item.id,
      clienteId: item.clienteId,
      clienteName: item.clienteName || '',
      contratoId: item.contratoId || '',
      items: item.items || [],
      requestDate: item.requestDate || new Date(),
      executionDate: item.executionDate || new Date(),
      tipo: item.tipo || '',
      jornada: item.jornada || '',
      solicitante: item.solicitante || '',
      observaciones: item.observaciones || '',
    });
    setCurrentItem(item);
    setIsEditing(true);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setItem((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 w-full max-w-[100vw] px-4">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-2xl font-bold">Gestión de Prepartes</h2>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pedido
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[600px] max-w-[60vw] sm:max-w-[60vw]">
            <SheetHeader className="mb-6">
              <SheetTitle>{isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}</SheetTitle>
            </SheetHeader>
            <Card>
              <CardContent>
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
                      clienteId: '',
                      clienteName: '',
                      contratoId: '',
                      items: [],
                      requestDate: new Date(),
                      executionDate: {
                        from: new Date(),
                        to: undefined,
                      },
                      tipo: '',
                      jornada: '',
                      solicitante: '',
                      observaciones: '',
                    });
                  }}
                />
              </CardContent>
            </Card>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="w-full max-w-full">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <PreparteTable
              data={item}
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
