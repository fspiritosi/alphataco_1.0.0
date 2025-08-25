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
  requestDate: Date;
  executionDate: Date;
  tipo: string;
  jornada: string;
  solicitante: string;
  observaciones?: string;
};

interface PreparteManagerProps {
  items: PreparteItem[];
  Customers: Cliente[];
  contratos: Contrato[];
}
interface Contrato {
  id: string;
  service_name: string;
}
export function PreparteManager({ items, Customers, contratos }: PreparteManagerProps) {
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
    requestDate: new Date(),
    executionDate: new Date(),
    tipo: '',
    jornada: '',
    solicitante: '',
    observaciones: '',
  });
  console.log(items);
  const handleInputChange = (field: keyof PreparteItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (formData: PreparteItem) => {
    // Obtener el nombre del cliente seleccionado
    const clienteSeleccionado = Customers.find((c) => c.id === formData.clienteId);
    const clienteName = clienteSeleccionado?.name || formData.clienteName || '';

    if (isEditing && currentItem?.id) {
      // Lógica para actualizar usando el estado actualizado
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
      toast('El registro ha sido actualizado correctamente.');
    } else {
      // Lógica para crear
      const newItem = {
        ...formData,
        id: Date.now().toString(),
        clienteName,
      };
      setItem((prevItems) => [...prevItems, newItem]);
      toast('El nuevo registro ha sido creado correctamente.');
    }

    // Limpiar formulario y cerrar
    setFormData({
      id: '',
      clienteId: '',
      clienteName: '',
      contratoId: '',
      requestDate: new Date(),
      executionDate: new Date(),
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

  console.log(item);

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
                      requestDate: new Date(),
                      executionDate: new Date(),
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
            <PreparteTable data={item} onEdit={handleEdit} onDelete={handleDelete} savedVisibility={savedVisibility} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
