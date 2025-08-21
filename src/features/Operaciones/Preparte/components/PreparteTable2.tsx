// src/features/Operaciones/Preparte/components/PreparteTable2.tsx
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Image as ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

// Mock data types
type PreparteItem = {
  id: string;
  requestDate: string;
  executionDate: string;
  image?: string;
};

export function PreparteTable() {
  // Sample data
  const [items, setItems] = useState<PreparteItem[]>([
    {
      id: '1',
      requestDate: '2025-08-21',
      executionDate: '2025-08-22',
      image: '/images/equipment-1.jpg',
    },
    {
      id: '2',
      requestDate: '2025-08-22',
      executionDate: '2025-08-23',
      image: '/images/equipment-2.jpg',
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Omit<PreparteItem, 'id'>>({
    requestDate: new Date().toISOString().split('T')[0],
    executionDate: new Date().toISOString().split('T')[0],
    image: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentItem((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setItems((prev) => [...prev, { ...currentItem, id: Date.now().toString() }]);
    setCurrentItem({
      requestDate: new Date().toISOString().split('T')[0],
      executionDate: new Date().toISOString().split('T')[0],
      image: '',
    });
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Preparte</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Agregar Línea
        </Button>
      </div>

      <Card className="w-full">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de Solicitud</TableHead>
                <TableHead>Fecha de Ejecución Solicitada</TableHead>
                <TableHead>Imagen</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No hay registros de preparte.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.requestDate}</TableCell>
                    <TableCell>{item.executionDate}</TableCell>
                    <TableCell>
                      {item.image && (
                        <Button variant="ghost" size="icon" onClick={() => window.open(item.image, '_blank')}>
                          <ImageIcon className="h-5 w-5" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Side Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] sm:max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <DialogHeader>
              <DialogTitle>Nuevo Preparte</DialogTitle>
            </DialogHeader>
            <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Solicitud</label>
              <Input type="date" name="requestDate" value={currentItem.requestDate} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Ejecución Solicitada</label>
              <Input type="date" name="executionDate" value={currentItem.executionDate} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Imagen</label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} className="cursor-pointer" />
              {currentItem.image && (
                <div className="mt-2">
                  <img src={currentItem.image} alt="Vista previa" className="max-h-40 rounded" />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PreparteTable;
