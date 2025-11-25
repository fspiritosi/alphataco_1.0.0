'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, FileText, Info, Loader2 } from 'lucide-react';
import React from 'react';
import { useCreateRemito } from '../hooks/useRemitos';
import { AddRemitDialogProps } from '../types';

export function AddRemitDialog({
  dailyReportRowId,
  isOpen,
  onClose,
  existingNumbers,
  onRemitoCreated,
}: AddRemitDialogProps) {
  const [remitNumber, setRemitNumber] = React.useState('');
  const [error, setError] = React.useState('');

  const createRemito = useCreateRemito(dailyReportRowId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!remitNumber.trim()) {
      setError('El número de remito es requerido');
      return;
    }

    if (existingNumbers.includes(remitNumber)) {
      setError('Ya existe un remito con este número');
      return;
    }

    try {
      const newRemito = await createRemito.mutateAsync(remitNumber);
      if (onRemitoCreated) {
        onRemitoCreated(newRemito.id);
      }
      handleClose();
    } catch (err) {
      setError('Error al crear el remito');
    }
  };

  const handleClose = () => {
    setRemitNumber('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Agregar Nuevo Remito</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Complete los datos para crear un nuevo remito</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-3">
            <Label htmlFor="remitNumber" className="text-sm font-semibold">
              Número de Remito <span className="text-red-500">*</span>
            </Label>
            <Input
              id="remitNumber"
              value={remitNumber}
              onChange={(e) => setRemitNumber(e.target.value)}
              placeholder="Ej: 12345 o ABC-001"
              autoFocus
              disabled={createRemito.isPending}
              className="text-base h-11"
            />
            <p className="text-xs text-muted-foreground">Ingrese un número único que identifique este remito</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              Podrá agregar y gestionar documentos después de crear el remito.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createRemito.isPending}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createRemito.isPending || !remitNumber.trim()}
              className="flex-1 sm:flex-none"
            >
              {createRemito.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Remito
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
