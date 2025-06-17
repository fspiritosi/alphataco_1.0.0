// BulkEditModal.tsx
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  checkDailyReportExists,
  createDailyReport,
  createDailyReportRow,
  updateDailyReportRowStatus,
} from '../actions/actions';
import { DailyReportRow } from './DayliReportDetailTable';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRows: DailyReportRow[];
  onSuccess?: () => void; // Callback para refrescar la tabla después de actualizar
}

export function BulkEditModal({ isOpen, onClose, selectedRows, onSuccess }: BulkEditModalProps) {
  const [newStatus, setNewStatus] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // Fecha mínima para reprogramación (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reiniciar formulario al abrir/cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setNewStatus('');
      setCancelReason('');
      setRescheduleDate(undefined);
    }
  }, [isOpen]);

  // Verificar si el formulario es válido para habilitar el botón de guardar
  const isFormValid = () => {
    if (!newStatus) return false;

    if (newStatus === 'cancelado' && !cancelReason) return false;

    if (newStatus === 'reprogramado' && !rescheduleDate) return false;

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
      setLoading(true);

      // Crear objeto con los datos a actualizar según el estado seleccionado
      const updateData: any = { status: newStatus };

      if (newStatus === 'cancelado') {
        updateData.cancel_reason = cancelReason;
      }
      const selectedRowsIds = selectedRows.map((row) => row.id);

      // Actualizar cada fila seleccionada
      await updateDailyReportRowStatus(selectedRowsIds, updateData.status);

      // Si es reprogramación, también crear copias en la nueva fecha
      if (newStatus === 'reprogramado' && rescheduleDate) {
        // Convertir la fecha a formato 'yyyy-MM-dd'
        const formattedDate = format(rescheduleDate, 'yyyy-MM-dd');

        // Verificar si existe un parte diario para esa fecha
        const existingReports = await checkDailyReportExists([formattedDate]);
        let targetReportId: string;

        // Si no existe el parte diario, crearlo
        if (existingReports.length === 0) {
          const createdReports = await createDailyReport([formattedDate]);
          targetReportId = createdReports[0].id;
        } else {
          targetReportId = existingReports[0].id;
        }

        // Crear nuevas filas reprogramadas para cada fila seleccionada
        const newRows = selectedRows.map((row) => ({
          customer_id: row.data_to_clone.customer_id!,
          service_id: row.data_to_clone.service_id!,
          item_id: row.data_to_clone.item_id!,
          working_day: row.data_to_clone.working_day!,
          start_time: row.start_time,
          end_time: row.end_time,
          description: row.description,
          daily_report_id: targetReportId, // Asignar al nuevo parte diario
          status: 'sin_recursos_asignados' as const, // Estado inicial para las filas reprogramadas
          areas_service_id: row.data_to_clone.areas_service_id!,
          sector_service_id: row.data_to_clone.sector_service_id!,
          remit_number: row.remit_number,
          type_service: row.type_service as any,
          cancel_reason: null,
        }));

        await createDailyReportRow(newRows);
      }

      toast({
        title: 'Éxito',
        description: `Se actualizó el estado de ${selectedRows.length} registros a "${newStatus}".`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al actualizar registros:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al actualizar los registros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Actualización masiva de estado</DialogTitle>
          <DialogDescription>
            Estás actualizando el estado de {selectedRows.length} registros seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Información de registros seleccionados */}
          <div className="max-h-[200px] overflow-y-auto mb-4">
            <h3 className="text-sm font-medium mb-2">Registros seleccionados:</h3>
            <ul className="text-sm space-y-1">
              {selectedRows.map((row) => (
                <li key={row.id} className="p-2 bg-muted rounded-md flex justify-between">
                  <span>{row.customer}</span>
                  <span className="text-muted-foreground">
                    {/* Separa en guiones con el split y con en mayuscula la primera */}
                    Estado actual:{' '}
                    {row.status.split('_').join(' ')[0].toUpperCase() + row.status.split('_').join(' ').slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selector de estado */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="status">Nuevo estado</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Seleccionar nuevo estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="hover:bg-accent" value="ejecutado">
                  Ejecutado
                </SelectItem>
                <SelectItem className="hover:bg-accent" value="cancelado">
                  Cancelado
                </SelectItem>
                <SelectItem className="hover:bg-accent" value="reprogramado">
                  Reprogramado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo condicional para razón de cancelación */}
          {newStatus === 'cancelado' && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="cancel-reason">
                Razón de cancelación <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ingrese la razón de cancelación"
                required
              />
            </div>
          )}

          {/* Campo condicional para fecha de reprogramación */}
          {newStatus === 'reprogramado' && (
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">
                Fecha de reprogramación <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !rescheduleDate && 'text-muted-foreground'
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rescheduleDate ? format(rescheduleDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    fromDate={tomorrow}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !isFormValid()}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
