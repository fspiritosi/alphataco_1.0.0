'use client';

import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2 } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  generateWorkOrdersForOrder,
  getOrderGenerationPreview,
  type OrderGenerationPreview,
} from '../actions/actionsServer';

const logger = new Logger('GenerateWorkOrderDialog');

interface GenerateWorkOrderDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
}

export function GenerateWorkOrderDialog({ open, onClose, orderId }: GenerateWorkOrderDialogProps) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<OrderGenerationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannedStartDate, setPlannedStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [plannedEndDate, setPlannedEndDate] = useState(moment().add(7, 'days').format('YYYY-MM-DD'));

  // Load preview when dialog opens
  useEffect(() => {
    if (open && orderId) {
      setIsLoading(true);
      getOrderGenerationPreview(orderId)
        .then(setPreview)
        .catch((error) => {
          logger.error('Error cargando preview', { data: { error } });
          toast.error('Error al cargar resumen');
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, orderId]);

  const handleGenerate = async () => {
    if (!plannedStartDate || !plannedEndDate) {
      toast.error('Las fechas son requeridas');
      return;
    }

    if (moment(plannedEndDate).isBefore(moment(plannedStartDate))) {
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateWorkOrdersForOrder(orderId, {
        plannedStartDate,
        plannedEndDate,
      });

      toast.success(`${result.length} orden(es) de trabajo generada(s) exitosamente`);
      invalidateAllMaintenanceQueries(queryClient);
      onClose();
    } catch (error) {
      logger.error('Error generando OT', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'Error al generar ordenes de trabajo');
    } finally {
      setIsGenerating(false);
    }
  };

  const vehicleDomain =
    preview?.vehicle && typeof preview.vehicle === 'object'
      ? ('domain' in preview.vehicle ? String(preview.vehicle.domain) : null) ||
        ('serie' in preview.vehicle ? String(preview.vehicle.serie) : null) ||
        '-'
      : '-';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Generar Ordenes de Trabajo
          </DialogTitle>
          <DialogDescription>Se creara una orden de trabajo por cada sector asignado</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : preview && preview.sectors.length > 0 ? (
          <div className="space-y-4">
            {/* Equipo */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Equipo:</span>
              <Badge variant="outline">{vehicleDomain}</Badge>
            </div>

            <Separator />

            {/* Resumen por sector */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Ordenes a generar ({preview.sectors.length})</h4>
              {preview.sectors.map((sector) => (
                <div key={sector.sectorId} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{sector.sectorName}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sector.items.length} items, {sector.totalRepairs} reparaciones
                    </span>
                  </div>
                  <div className="pl-2 space-y-0.5">
                    {sector.items.map((item) => (
                      <p key={item.id} className="text-xs text-muted-foreground">
                        {String(item.description || 'Sin descripcion')}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Fechas planificadas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio planificada</Label>
                <Input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin planificada</Label>
                <Input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay items elegibles para generar ordenes de trabajo
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !preview || preview.sectors.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-1" />
                Confirmar y Generar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
