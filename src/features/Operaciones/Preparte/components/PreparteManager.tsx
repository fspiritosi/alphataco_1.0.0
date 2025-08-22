'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VisibilityState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useState } from 'react';
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
  requestDate: Date;
  executionDate: Date;
  observaciones: string;
};

interface PreparteManagerProps {
  items: PreparteItem[];
  Customers: Cliente[];
}
export function PreparteManager({ items, Customers }: PreparteManagerProps) {
  const [item, setItem] = useState<PreparteItem[]>(items);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PreparteItem | null>(null);
  const [open, setOpen] = useState(false);
  const [savedVisibility, setSavedVisibility] = useState<VisibilityState>({});
  const [formData, setFormData] = useState<PreparteItem>({
    id: '',
    clienteId: '',
    clienteName: '',
    requestDate: new Date(),
    executionDate: new Date(),
    observaciones: '',
  });
  console.log(items);
  const handleInputChange = (field: keyof PreparteItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && currentItem) {
      // Lógica para actualizar
      setItem((prevItems) =>
        prevItems.map((item) =>
          item.id === currentItem.id
            ? {
                ...formData,
                clienteName: Customers.find((c) => c.id === formData.clienteId)?.name || '',
                id: currentItem.id, // Make sure to preserve the ID
              }
            : item
        )
      );
    } else {
      // Lógica para crear nuevo
      const newItem: PreparteItem = {
        ...formData,
        id: Date.now().toString(),
        clienteName: Customers.find((c) => c.id === formData.clienteId)?.name || '',
      };
      setItem((prev) => [...prev, newItem]);
    }

    // Limpiar formulario
    setFormData({
      id: '',
      clienteId: '',
      clienteName: '',
      requestDate: new Date(),
      executionDate: new Date(),
      observaciones: '',
    });

    setOpen(false);
    setIsEditing(false);
    setCurrentItem(null);
  };

  const handleEdit = (item: PreparteItem) => {
    setFormData(item);
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
              Nuevo Preparte
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[500px] sm:w-[540px]">
            <SheetHeader className="mb-6">
              <SheetTitle>{isEditing ? 'Editar Preparte' : 'Nuevo Preparte'}</SheetTitle>
            </SheetHeader>
            <PreparteForm
              formData={formData}
              clientes={Customers as Cliente[]}
              isEditing={isEditing}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={() => {
                setOpen(false);
                setIsEditing(false);
                setCurrentItem(null);
                setFormData({
                  id: '',
                  clienteId: '',
                  clienteName: '',
                  requestDate: new Date(),
                  executionDate: new Date(),
                  observaciones: '',
                });
              }}
            />
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
