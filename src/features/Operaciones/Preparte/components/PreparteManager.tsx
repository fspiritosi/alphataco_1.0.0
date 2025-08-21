'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, CalendarIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Tipo de datos para los clientes
type Cliente = {
  id: string;
  name: string;
};

// Tipo de datos para los prepartes
type PreparteItem = {
  id: string;
  clienteId: string;
  clienteName: string;
  requestDate: Date;
  executionDate: Date;
  observaciones: string;
};

// Datos mock de clientes
const clientesMock: Cliente[] = [
  { id: '1', name: 'Cliente A' },
  { id: '2', name: 'Cliente B' },
  { id: '3', name: 'Cliente C' },
  { id: '4', name: 'Cliente D' },
  { id: '5', name: 'Cliente E' },
];

export function PreparteManager() {
  const [items, setItems] = useState<PreparteItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<PreparteItem | null>(null);
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState<{
    clienteId: string;
    requestDate: Date;
    executionDate: Date;
    observaciones: string;
  }>({
    clienteId: '',
    requestDate: new Date(),
    executionDate: new Date(),
    observaciones: '',
  });

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clienteId) {
      alert('Por favor seleccione un cliente');
      return;
    }

    const cliente = clientesMock.find((c) => c.id === formData.clienteId);

    if (isEditing && currentItem) {
      // Actualizar elemento existente
      setItems((prev) =>
        prev.map((item) =>
          item.id === currentItem.id
            ? {
                ...item,
                clienteId: formData.clienteId,
                clienteName: cliente?.name || '',
                requestDate: formData.requestDate,
                executionDate: formData.executionDate,
                observaciones: formData.observaciones,
              }
            : item
        )
      );
    } else {
      // Agregar nuevo elemento
      const newItem: PreparteItem = {
        id: Date.now().toString(),
        clienteId: formData.clienteId,
        clienteName: cliente?.name || '',
        requestDate: formData.requestDate,
        executionDate: formData.executionDate,
        observaciones: formData.observaciones,
      };
      setItems((prev) => [...prev, newItem]);
    }

    // Resetear formulario y cerrar sheet
    setFormData({
      clienteId: '',
      requestDate: new Date(),
      executionDate: new Date(),
      observaciones: '',
    });
    setCurrentItem(null);
    setOpen(false);
    setIsEditing(false);
  };

  const handleEdit = (item: PreparteItem) => {
    setCurrentItem(item);
    setFormData({
      clienteId: item.clienteId,
      requestDate: item.requestDate,
      executionDate: item.executionDate,
      observaciones: item.observaciones,
    });
    setIsEditing(true);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentItem(null);
      setIsEditing(false);
      setFormData({
        clienteId: '',
        requestDate: new Date(),
        executionDate: new Date(),
        observaciones: '',
      });
    }
    setOpen(open);
  };

  return (
    <div className="space-y-6 w-full max-w-[100vw] px-4">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-2xl font-bold">Gestión de Prepartes</h2>
        <Sheet open={open} onOpenChange={handleOpenChange}>
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Selector de Clientes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Select value={formData.clienteId} onValueChange={(value) => handleInputChange('clienteId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente">
                        {formData.clienteId ? (
                          clientesMock.find((c) => c.id === formData.clienteId)?.name
                        ) : (
                          <span className="flex items-center">
                            <Building className="mr-2 h-4 w-4" />
                            Seleccionar cliente
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clientesMock.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha de Solicitud */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Solicitud</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.requestDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.requestDate ? (
                          format(formData.requestDate, 'PPP', { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.requestDate}
                        onSelect={(date) => date && handleInputChange('requestDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Fecha de Ejecución Solicitada */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Ejecución Solicitada</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.executionDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.executionDate ? (
                          format(formData.executionDate, 'PPP', { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.executionDate}
                        onSelect={(date) => date && handleInputChange('executionDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Campo de Observaciones */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observaciones</label>
                  <Textarea
                    placeholder="Ingrese observaciones adicionales..."
                    value={formData.observaciones}
                    onChange={(e) => handleInputChange('observaciones', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{isEditing ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="w-full overflow-hidden">
        <CardContent className="p-0">
          {items.length > 0 ? (
            <div className="relative w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px] whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="min-w-[180px] whitespace-nowrap">Fecha de Solicitud</TableHead>
                    <TableHead className="min-w-[180px] whitespace-nowrap">Fecha de Ejecución</TableHead>
                    <TableHead className="min-w-[300px]">Observaciones</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">{item.clienteName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(item.requestDate, 'PPP', { locale: es })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(item.executionDate, 'PPP', { locale: es })}
                      </TableCell>
                      <TableCell className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.observaciones}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No hay prepartes registrados. Crea uno nuevo para comenzar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
