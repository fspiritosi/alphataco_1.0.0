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
  updateDailyReportRowBody,
  updateDailyReportRowStatus,
} from '../actions/actions';
import { DailyReportRow } from './DayliReportDetailTable';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRows: DailyReportRow[];
  onSuccess?: (updatedRowIds?: string[]) => void; // Callback para refrescar la tabla después de actualizar
}

export function BulkEditModal({ isOpen, onClose, selectedRows, onSuccess }: BulkEditModalProps) {
  // Estados para Jornadas 24hs
  const [status24hs, setStatus24hs] = useState<string>('');
  const [cancelReason24hs, setCancelReason24hs] = useState<string>('');
  const [rescheduleDate24hs, setRescheduleDate24hs] = useState<Date | undefined>(undefined);

  // Estados para sub-secciones de Jornadas 24hs
  const [statusCompletarDiurno, setStatusCompletarDiurno] = useState<string>('');
  const [cancelReasonCompletarDiurno, setCancelReasonCompletarDiurno] = useState<string>('');
  const [rescheduleDateCompletarDiurno, setRescheduleDateCompletarDiurno] = useState<Date | undefined>(undefined);

  const [statusCompletarNocturno, setStatusCompletarNocturno] = useState<string>('');
  const [cancelReasonCompletarNocturno, setCancelReasonCompletarNocturno] = useState<string>('');
  const [rescheduleDateCompletarNocturno, setRescheduleDateCompletarNocturno] = useState<Date | undefined>(undefined);

  // Estados para Otras Jornadas
  const [statusOtras, setStatusOtras] = useState<string>('');
  const [cancelReasonOtras, setCancelReasonOtras] = useState<string>('');
  const [rescheduleDateOtras, setRescheduleDateOtras] = useState<Date | undefined>(undefined);

  const [seccionCompletada, setSeccionCompletada] = useState<string | null>(null);
  const [guardandoSeccion, setGuardandoSeccion] = useState<string | null>(null);
  const [seccionesProcesadas, setSeccionesProcesadas] = useState<Set<string>>(new Set());

  // Agrupar registros por tipo de jornada y estado de turnos
  const jornadas24hs = selectedRows.filter(
    (row) => row.working_day === 'jornada 24 horas' && row.completed_day !== true && row.completed_night !== true
  );
  const otrasJornadas = selectedRows.filter((row) => row.working_day !== 'jornada 24 horas');

  // Obtener tipos únicos de jornadas en otrasJornadas para el título
  const tiposOtrasJornadas = [...new Set(otrasJornadas.map((row) => row.working_day))];

  // Sub-secciones de Jornadas 24hs según estado de turnos (para completar turnos pendientes)
  const jornadas24hsCompletarDiurno = selectedRows.filter(
    (row) => row.working_day === 'jornada 24 horas' && row.completed_night === true && row.completed_day !== true
  );
  const jornadas24hsCompletarNocturno = selectedRows.filter(
    (row) => row.working_day === 'jornada 24 horas' && row.completed_day === true && row.completed_night !== true
  );

  // Fecha mínima para reprogramación (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reiniciar formulario al abrir/cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      // Limpiar estados de Jornadas 24hs
      setStatus24hs('');
      setCancelReason24hs('');
      setRescheduleDate24hs(undefined);

      // Limpiar estados de sub-secciones de Jornadas 24hs
      setStatusCompletarDiurno('');
      setCancelReasonCompletarDiurno('');
      setRescheduleDateCompletarDiurno(undefined);

      setStatusCompletarNocturno('');
      setCancelReasonCompletarNocturno('');
      setRescheduleDateCompletarNocturno(undefined);

      // Limpiar estados de Otras Jornadas
      setStatusOtras('');
      setCancelReasonOtras('');
      setRescheduleDateOtras(undefined);

      // Limpiar feedback
      setSeccionCompletada(null);
      setGuardandoSeccion(null);
      setSeccionesProcesadas(new Set());
    }
  }, [isOpen]);

  // Las funciones de validación específicas por sección reemplazan la función genérica

  // Verificar si el formulario de Jornadas 24hs es válido
  const isFormValid24hs = () => {
    if (!status24hs) return false;

    if (status24hs === 'cancelado' && !cancelReason24hs) return false;

    if (status24hs === 'reprogramado' && !rescheduleDate24hs) return false;

    return true;
  };

  // Verificar si el formulario de Completar Diurno es válido
  const isFormValidCompletarDiurno = () => {
    if (!statusCompletarDiurno) return false;

    if (statusCompletarDiurno === 'cancelado' && !cancelReasonCompletarDiurno) return false;

    if (statusCompletarDiurno === 'reprogramado' && !rescheduleDateCompletarDiurno) return false;

    return true;
  };

  // Verificar si el formulario de Completar Nocturno es válido
  const isFormValidCompletarNocturno = () => {
    if (!statusCompletarNocturno) return false;

    if (statusCompletarNocturno === 'cancelado' && !cancelReasonCompletarNocturno) return false;

    if (statusCompletarNocturno === 'reprogramado' && !rescheduleDateCompletarNocturno) return false;

    return true;
  };

  // Verificar si el formulario de Otras Jornadas es válido
  const isFormValidOtras = () => {
    if (!statusOtras) return false;

    if (statusOtras === 'cancelado' && !cancelReasonOtras) return false;

    return true;
  };

  const handleSave = async (tipoSeccion: '24hs' | 'completar-diurno' | 'completar-nocturno' | 'otras') => {
    // Validar según la sección
    if (tipoSeccion === '24hs' && !isFormValid24hs()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos para Jornadas 24hs.',
        variant: 'destructive',
      });
      return;
    }

    if (tipoSeccion === 'completar-diurno' && !isFormValidCompletarDiurno()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos para Completar Diurno.',
        variant: 'destructive',
      });
      return;
    }

    if (tipoSeccion === 'completar-nocturno' && !isFormValidCompletarNocturno()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos para Completar Nocturno.',
        variant: 'destructive',
      });
      return;
    }

    if (tipoSeccion === 'otras' && !isFormValidOtras()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos para Otras Jornadas.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGuardandoSeccion(tipoSeccion);

      // Determinar qué registros actualizar según la sección
      let registrosAActualizar: DailyReportRow[] = [];
      let statusToUse: string = '';
      let cancelReasonToUse: string = '';
      let rescheduleDateToUse: Date | undefined;

      if (tipoSeccion === '24hs') {
        registrosAActualizar = jornadas24hs;
        statusToUse = status24hs;
        cancelReasonToUse = cancelReason24hs;
        rescheduleDateToUse = rescheduleDate24hs;
      } else if (tipoSeccion === 'completar-diurno') {
        registrosAActualizar = jornadas24hsCompletarDiurno;
        statusToUse = statusCompletarDiurno;
        cancelReasonToUse = cancelReasonCompletarDiurno;
        rescheduleDateToUse = rescheduleDateCompletarDiurno;
      } else if (tipoSeccion === 'completar-nocturno') {
        registrosAActualizar = jornadas24hsCompletarNocturno;
        statusToUse = statusCompletarNocturno;
        cancelReasonToUse = cancelReasonCompletarNocturno;
        rescheduleDateToUse = rescheduleDateCompletarNocturno;
      } else if (tipoSeccion === 'otras') {
        registrosAActualizar = otrasJornadas;
        statusToUse = statusOtras;
        cancelReasonToUse = cancelReasonOtras;
        rescheduleDateToUse = undefined; // Otras jornadas no tienen reprogramación
      }

      // Crear objeto con los datos a actualizar según el estado seleccionado
      const updateData: any = { status: statusToUse };

      if (statusToUse === 'cancelado') {
        updateData.cancel_reason = cancelReasonToUse;
      }
      const selectedRowsIds = registrosAActualizar.map((row) => row.id);

      // Para completar_diurno/nocturno: actualiza cada fila individualmente
      if (statusToUse === 'completar_diurno' || statusToUse === 'completar_nocturno') {
        // Actualizar cada fila individualmente con completed_day o completed_night en true
        for (const row of registrosAActualizar) {
          const rowData: any = {};

          // Si se está completando un turno y ambos quedan en true, forzar estado 'ejecutado'
          const completandoDiurno = statusToUse === 'completar_diurno';
          const completandoNocturno = statusToUse === 'completar_nocturno';

          const completedDay = completandoDiurno || row.completed_night ? true : row.completed_day;
          const completedNight = completandoNocturno || row.completed_day ? true : row.completed_night;

          if (completedDay && completedNight) {
            rowData.status = 'ejecutado';
          } else {
            rowData.status = row.status;
          }

          // Solo enviar las props que se quieren actualizar
          if (completandoDiurno) rowData.completed_day = true;
          if (completandoNocturno) rowData.completed_night = true;

          //  { status: 'completar_nocturno', completed_night: true }

          await updateDailyReportRowBody(row.id, rowData);
        }
      } else {
        // Para otros estados: actualiza status masivamente
        await updateDailyReportRowStatus(selectedRowsIds, updateData.status);
      }

      // Si es reprogramación, también crear copias en la nueva fecha
      if (statusToUse === 'reprogramado' && rescheduleDateToUse) {
        // Convertir la fecha a formato 'yyyy-MM-dd'
        const formattedDate = format(rescheduleDateToUse, 'yyyy-MM-dd');

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
        const newRows = registrosAActualizar.map((row) => ({
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
        description: `Se actualizó el estado de ${registrosAActualizar.length} registros a "${statusToUse}".`,
      });

      // Marcar sección como procesada
      setSeccionesProcesadas((prev) => new Set(prev).add(tipoSeccion));

      // Mostrar feedback de sección completada
      setSeccionCompletada(tipoSeccion);

      // Limpiar el feedback después de 3 segundos
      setTimeout(() => setSeccionCompletada(null), 3000);

      // Llamar onSuccess con los IDs de las filas actualizadas para deseleccionarlas
      // Asegurar que se llamen todos los IDs acumulados de todas las secciones procesadas
      if (onSuccess) {
        onSuccess(selectedRowsIds);
      }

      // Cerrar el modal si solo queda esta sección activa
      if (
        (tipoSeccion === '24hs' &&
          otrasJornadas.length === 0 &&
          jornadas24hsCompletarDiurno.length === 0 &&
          jornadas24hsCompletarNocturno.length === 0) ||
        (tipoSeccion === 'otras' &&
          jornadas24hs.length === 0 &&
          jornadas24hsCompletarDiurno.length === 0 &&
          jornadas24hsCompletarNocturno.length === 0) ||
        (tipoSeccion === 'completar-diurno' &&
          jornadas24hs.length === 0 &&
          otrasJornadas.length === 0 &&
          jornadas24hsCompletarNocturno.length === 0) ||
        (tipoSeccion === 'completar-nocturno' &&
          jornadas24hs.length === 0 &&
          otrasJornadas.length === 0 &&
          jornadas24hsCompletarDiurno.length === 0)
      ) {
        onClose();
      }
    } catch (error) {
      console.error('Error al actualizar registros:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al actualizar los registros.',
        variant: 'destructive',
      });
    } finally {
      setGuardandoSeccion(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Actualización masiva de estado</DialogTitle>
          <DialogDescription>
            Estás actualizando el estado de {selectedRows.length} registros seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Información de registros seleccionados agrupados */}

          {/* Sección Jornadas 24hs */}
          {jornadas24hs.length > 0 && (
            <div className={`mb-6 ${seccionesProcesadas.has('24hs') ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Jornadas 24 horas ({jornadas24hs.length} registros)</h3>
                {seccionCompletada === '24hs' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">✓ Actualizada</span>
                )}
              </div>
              <div className="max-h-[150px] overflow-y-auto mb-4 border rounded-md p-2">
                <ul className="text-sm space-y-1">
                  {jornadas24hs.map((row) => (
                    <li key={row.id} className="p-2 bg-white rounded-md flex justify-between">
                      <span>{row.customer}</span>
                      <span className="text-muted-foreground">
                        Estado actual:{' '}
                        {row.completed_day || row.completed_night
                          ? 'Ejecutado parcial'
                          : row.status.split('_').join(' ')[0].toUpperCase() + row.status.split('_').join(' ').slice(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector de estado para Jornadas 24hs */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="status-24hs">Nuevo estado para Jornadas 24hs</Label>
                <Select value={status24hs} onValueChange={setStatus24hs}>
                  <SelectTrigger id="status-24hs">
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
                    <SelectItem className="hover:bg-accent" value="completar_diurno">
                      Completar Diurno
                    </SelectItem>
                    <SelectItem className="hover:bg-accent" value="completar_nocturno">
                      Completar Nocturno
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo condicional para razón de cancelación - 24hs */}
              {status24hs === 'cancelado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="cancel-reason-24hs">
                    Razón de cancelación <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cancel-reason-24hs"
                    value={cancelReason24hs}
                    onChange={(e) => setCancelReason24hs(e.target.value)}
                    placeholder="Ingrese la razón de cancelación"
                    required
                  />
                </div>
              )}

              {/* Campo condicional para fecha de reprogramación - 24hs */}
              {status24hs === 'reprogramado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="reschedule-date-24hs">
                    Fecha de reprogramación <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !rescheduleDate24hs && 'text-muted-foreground'
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {rescheduleDate24hs ? format(rescheduleDate24hs, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={rescheduleDate24hs}
                        onSelect={setRescheduleDate24hs}
                        fromDate={tomorrow}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="border-t pt-3">
                <Button
                  onClick={() => handleSave('24hs')}
                  disabled={guardandoSeccion !== null || !isFormValid24hs()}
                  size="sm"
                  className="w-full"
                >
                  {guardandoSeccion === '24hs' ? 'Guardando...' : 'Guardar Jornadas 24hs'}
                </Button>
              </div>
            </div>
          )}

          {/* Sub-sección Completar Diurno */}
          {jornadas24hsCompletarDiurno.length > 0 && (
            <div
              className={`mb-6 ${seccionesProcesadas.has('completar-diurno') ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  Jornadas 24hs - Turno Diurno Completado ({jornadas24hsCompletarDiurno.length} registros)
                </h3>
                {seccionCompletada === 'completar-diurno' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">✓ Actualizada</span>
                )}
              </div>
              <div className="max-h-[150px] overflow-y-auto mb-4 border rounded-md p-2">
                <ul className="text-sm space-y-1">
                  {jornadas24hsCompletarDiurno.map((row) => (
                    <li key={row.id} className="p-2 bg-white rounded-md flex justify-between">
                      <span>{row.customer}</span>
                      <span className="text-muted-foreground">
                        Estado actual:{' '}
                        {row.completed_day || row.completed_night
                          ? 'Ejecutado parcial'
                          : row.status.split('_').join(' ')[0].toUpperCase() + row.status.split('_').join(' ').slice(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector de estado para Completar Diurno */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="status-completar-diurno">Acción para completar turno nocturno</Label>
                <Select value={statusCompletarDiurno} onValueChange={setStatusCompletarDiurno}>
                  <SelectTrigger id="status-completar-diurno">
                    <SelectValue placeholder="Seleccionar nuevo estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="hover:bg-accent" value="completar_nocturno">
                      Completar Nocturno
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo condicional para razón de cancelación - Completar Diurno */}
              {statusCompletarDiurno === 'cancelado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="cancel-reason-completar-diurno">
                    Razón de cancelación <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cancel-reason-completar-diurno"
                    value={cancelReasonCompletarDiurno}
                    onChange={(e) => setCancelReasonCompletarDiurno(e.target.value)}
                    placeholder="Ingrese la razón de cancelación"
                    required
                  />
                </div>
              )}

              {/* Campo condicional para fecha de reprogramación - Completar Diurno */}
              {statusCompletarDiurno === 'reprogramado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="reschedule-date-completar-diurno">
                    Fecha de reprogramación <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !rescheduleDateCompletarDiurno && 'text-muted-foreground'
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {rescheduleDateCompletarDiurno
                          ? format(rescheduleDateCompletarDiurno, 'PPP', { locale: es })
                          : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={rescheduleDateCompletarDiurno}
                        onSelect={setRescheduleDateCompletarDiurno}
                        fromDate={tomorrow}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="border-t pt-3">
                <Button
                  onClick={() => handleSave('completar-diurno')}
                  disabled={guardandoSeccion !== null || !isFormValidCompletarDiurno()}
                  size="sm"
                  className="w-full"
                >
                  {guardandoSeccion === 'completar-diurno' ? 'Guardando...' : 'Guardar Completar Diurno'}
                </Button>
              </div>
            </div>
          )}

          {/* Sub-sección Completar Nocturno */}
          {jornadas24hsCompletarNocturno.length > 0 && (
            <div
              className={`mb-6 ${seccionesProcesadas.has('completar-nocturno') ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  Jornadas 24hs - Turno Nocturno Completado ({jornadas24hsCompletarNocturno.length} registros)
                </h3>
                {seccionCompletada === 'completar-nocturno' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">✓ Actualizada</span>
                )}
              </div>
              <div className="max-h-[150px] overflow-y-auto mb-4 border rounded-md p-2">
                <ul className="text-sm space-y-1">
                  {jornadas24hsCompletarNocturno.map((row) => (
                    <li key={row.id} className="p-2 bg-white rounded-md flex justify-between">
                      <span>{row.customer}</span>
                      <span className="text-muted-foreground">
                        Estado actual:{' '}
                        {row.completed_day || row.completed_night
                          ? 'Ejecutado parcial'
                          : row.status.split('_').join(' ')[0].toUpperCase() + row.status.split('_').join(' ').slice(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector de estado para Completar Nocturno */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="status-completar-nocturno">Acción para completar turno diurno</Label>
                <Select value={statusCompletarNocturno} onValueChange={setStatusCompletarNocturno}>
                  <SelectTrigger id="status-completar-nocturno">
                    <SelectValue placeholder="Seleccionar nuevo estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="hover:bg-accent" value="completar_diurno">
                      Completar Diurno
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo condicional para razón de cancelación - Completar Nocturno */}
              {statusCompletarNocturno === 'cancelado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="cancel-reason-completar-nocturno">
                    Razón de cancelación <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cancel-reason-completar-nocturno"
                    value={cancelReasonCompletarNocturno}
                    onChange={(e) => setCancelReasonCompletarNocturno(e.target.value)}
                    placeholder="Ingrese la razón de cancelación"
                    required
                  />
                </div>
              )}

              {/* Campo condicional para fecha de reprogramación - Completar Nocturno */}
              {statusCompletarNocturno === 'reprogramado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="reschedule-date-completar-nocturno">
                    Fecha de reprogramación <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !rescheduleDateCompletarNocturno && 'text-muted-foreground'
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {rescheduleDateCompletarNocturno
                          ? format(rescheduleDateCompletarNocturno, 'PPP', { locale: es })
                          : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={rescheduleDateCompletarNocturno}
                        onSelect={setRescheduleDateCompletarNocturno}
                        fromDate={tomorrow}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="border-t pt-3">
                <Button
                  onClick={() => handleSave('completar-nocturno')}
                  disabled={guardandoSeccion !== null || !isFormValidCompletarNocturno()}
                  size="sm"
                  className="w-full"
                >
                  {guardandoSeccion === 'completar-nocturno' ? 'Guardando...' : 'Guardar Completar Nocturno'}
                </Button>
              </div>
            </div>
          )}

          {/* Separador entre secciones */}
          {jornadas24hs.length > 0 && otrasJornadas.length > 0 && <div className="border-b mb-6"></div>}

          {/* Sección Otras Jornadas */}
          {otrasJornadas.length > 0 && (
            <div className={`mb-6 ${seccionesProcesadas.has('otras') ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  {tiposOtrasJornadas.length > 0 ? tiposOtrasJornadas.join(', ') : 'Demás Registros'} (
                  {otrasJornadas.length} registros)
                </h3>
                {seccionCompletada === 'otras' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">✓ Actualizada</span>
                )}
              </div>
              <div className="max-h-[150px] overflow-y-auto mb-4 border rounded-md p-2">
                <ul className="text-sm space-y-1">
                  {otrasJornadas.map((row) => (
                    <li key={row.id} className="p-2 bg-white rounded-md flex justify-between">
                      <span>{row.customer}</span>
                      <span className="text-muted-foreground">
                        Estado actual:{' '}
                        {row.completed_day || row.completed_night
                          ? 'Ejecutado parcial'
                          : row.status.split('_').join(' ')[0].toUpperCase() + row.status.split('_').join(' ').slice(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector de estado para Demás Registros */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="status-otros">Nuevo estado para Demás Registros</Label>
                <Select value={statusOtras} onValueChange={setStatusOtras}>
                  <SelectTrigger id="status-otros">
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

              {/* Campo condicional para razón de cancelación - Otras */}
              {statusOtras === 'cancelado' && (
                <div className="space-y-2 mb-4">
                  <Label htmlFor="cancel-reason-otras">
                    Razón de cancelación <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cancel-reason-otras"
                    value={cancelReasonOtras}
                    onChange={(e) => setCancelReasonOtras(e.target.value)}
                    placeholder="Ingrese la razón de cancelación"
                    required
                  />
                </div>
              )}

              {/* Otras Jornadas no tiene opción de reprogramación */}

              <div className="border-t pt-3">
                <Button
                  onClick={() => handleSave('otras')}
                  disabled={guardandoSeccion !== null || !isFormValidOtras()}
                  size="sm"
                  className="w-full"
                >
                  {guardandoSeccion === 'otras' ? 'Guardando...' : 'Guardar Otras Jornadas'}
                </Button>
              </div>
            </div>
          )}

          {/* Los selectores de estado ahora están en cada sección */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardandoSeccion !== null}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
