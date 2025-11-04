import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useEffect, useState } from 'react';
import { updateMultiplePreparteStatus } from '../actions/preparte';
import { PreparteItem } from './PreparteManager';

interface PreparteBulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRows: PreparteItem[];
  onSuccess?: () => void;
}

export function PreparteBulkStatusModal({ isOpen, onClose, selectedRows, onSuccess }: PreparteBulkStatusModalProps) {
  const [status, setStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [confirmedBy, setConfirmedBy] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Reiniciar formulario al abrir/cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setStatus('');
      setReason('');
      setConfirmedBy('');
    }
  }, [isOpen]);

  // Verificar si el formulario es válido
  const isFormValid = () => {
    if (!status) return false;
    // Si el estado requiere motivo, verificar que esté presente
    if ((status === 'cancelado' || status === 'rechazado' || status === 'reprogramado') && !reason.trim()) {
      return false;
    }
    // Si el estado es confirmado, verificar que esté presente el confirmante
    if (status === 'confirmado' && !confirmedBy.trim()) {
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Obtener los IDs de los prepartes seleccionados
      const selectedIds = selectedRows.map((row) => row.id);

      // Preparar los datos de actualización
      const updateData: any = { status };

      // Agregar el campo de motivo según el estado
      if (status === 'cancelado') {
        updateData.cancel_reason = reason;
      } else if (status === 'rechazado') {
        updateData.rejected_reason = reason;
      } else if (status === 'reprogramado') {
        updateData.reprogram_reason = reason;
      } else if (status === 'confirmado') {
        updateData.confirmed_by = confirmedBy;
      }

      // Actualizar el estado de todos los prepartes seleccionados
      await updateMultiplePreparteStatus(selectedIds, updateData);

      toast({
        title: 'Éxito',
        description: `Se actualizó el estado de ${selectedRows.length} pedido${selectedRows.length > 1 ? 's' : ''} a "${status}".`,
      });

      // Llamar onSuccess para refrescar la tabla
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Error al actualizar estados:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al actualizar los estados.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar si el estado seleccionado requiere motivo
  const requiresReason = status === 'cancelado' || status === 'rechazado' || status === 'reprogramado';
  // Determinar si el estado seleccionado requiere confirmante
  const requiresConfirmant = status === 'confirmado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cambiar estado masivamente</DialogTitle>
          <DialogDescription>
            Estás cambiando el estado de {selectedRows.length} pedido{selectedRows.length > 1 ? 's' : ''} seleccionado
            {selectedRows.length > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Lista de prepartes seleccionados */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Pedidos seleccionados:</h4>
            <div className="max-h-[150px] overflow-y-auto border rounded-md p-2">
              <ul className="text-sm space-y-1">
                {selectedRows.map((row) => (
                  <li key={row.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md flex justify-between">
                    <span>{row.numero_pedido || 'Sin número'}</span>
                    <span className="text-muted-foreground capitalize">
                      Estado actual: {row.status?.replaceAll('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Selector de nuevo estado */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="status">Nuevo estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Seleccionar nuevo estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="reprogramado">Reprogramado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo de motivo (condicional) */}
          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo{' '}
                {status === 'cancelado'
                  ? 'de cancelación'
                  : status === 'rechazado'
                    ? 'de rechazo'
                    : 'de reprogramación'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Ingrese el motivo ${status === 'cancelado' ? 'de cancelación' : status === 'rechazado' ? 'de rechazo' : 'de reprogramación'}`}
                required
              />
            </div>
          )}

          {/* Campo de confirmante (condicional) */}
          {requiresConfirmant && (
            <div className="space-y-2">
              <Label htmlFor="confirmedBy">
                Confirmado por <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmedBy"
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
                placeholder="Ingrese el nombre de quien confirma"
                required
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid() || isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
