'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { fetchSupervisorsForChecklist } from '@/features/Checklist/actions/actionsServer';
import { createOrUpdateMaintenanceRequest } from '@/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Check, ChevronsUpDown, Loader2, MessageSquarePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const logger = new Logger('CriticalDeviationsRepairModal');

type Deviation = {
  id: string;
  item_code: string;
  item_label: string;
  section_code: string | null;
  is_critical?: boolean;
  created_at: string;
};

type Supervisor = {
  id: string;
  fullName: string;
  email: string;
};

interface CriticalDeviationsRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  deviations: Deviation[];
  equipmentId: string;
  /** ID del checklist answer para crear la solicitud */
  checklistAnswerId?: string;
  /** ID del empleado que completó el checklist */
  employeeId?: string;
  /** ID del usuario que completó el checklist */
  userId?: string;
  /** Kilometraje del equipo */
  kilometer?: string;
}

export function CriticalDeviationsRepairModal({
  isOpen,
  onClose,
  onComplete,
  deviations,
  equipmentId,
  checklistAnswerId,
  employeeId,
  userId,
  kilometer,
}: CriticalDeviationsRepairModalProps) {
  const queryClient = useQueryClient();

  // Fetch de supervisores internamente usando useQuery
  const {
    data: supervisors = [],
    isLoading: isLoadingSupervisors,
    error: supervisorsError,
  } = useQuery({
    queryKey: ['supervisors-for-checklist'],
    queryFn: fetchSupervisorsForChecklist,
    enabled: isOpen, // Solo cargar cuando el modal está abierto
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Log para debug
  logger.debug('Render', {
    data: {
      isOpen,
      equipmentId,
      deviationsCount: deviations?.length || 0,
      supervisorsCount: supervisors?.length || 0,
      isLoadingSupervisors,
    },
  });

  // Estado del supervisor seleccionado
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [openSupervisorSelect, setOpenSupervisorSelect] = useState(false);

  // Comentarios por desvío (key: deviationId, value: comment)
  const [deviationComments, setDeviationComments] = useState<Record<string, string>>({});

  // Control de visibilidad de campos de comentario (key: deviationId, value: boolean)
  const [showCommentField, setShowCommentField] = useState<Record<string, boolean>>({});

  // Flag para evitar que onOpenChange dispare onClose después de un submit exitoso
  const submitSuccessRef = useRef(false);

  // Estado de envío
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpiar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedSupervisorId('');
      setDeviationComments({});
      setShowCommentField({});
      setIsSubmitting(false);
      submitSuccessRef.current = false;
    }
  }, [isOpen]);

  const handleUpdateDeviationComment = (deviationId: string, comment: string) => {
    setDeviationComments((prev) => ({ ...prev, [deviationId]: comment }));
  };

  const handleToggleCommentField = (deviationId: string) => {
    setShowCommentField((prev) => ({ ...prev, [deviationId]: !prev[deviationId] }));
  };

  const handleSubmit = async () => {
    logger.debug('handleSubmit inicio', {
      data: {
        deviationsCount: deviations?.length || 0,
        selectedSupervisorId,
        commentsCount: Object.keys(deviationComments).length,
      },
    });

    // Validaciones
    if (!selectedSupervisorId) {
      toast.error('Debes seleccionar un supervisor de turno');
      return;
    }

    setIsSubmitting(true);

    try {
      // Construir los desvíos con comentarios
      const deviationsWithComments = deviations.map((d) => ({
        deviationId: d.id,
        comment: deviationComments[d.id]?.trim() || '',
      }));

      logger.debug('Creando/actualizando solicitud de mantenimiento', {
        data: {
          equipmentId,
          supervisorId: selectedSupervisorId,
          deviationsCount: deviationsWithComments.length,
          hasChecklistAnswerId: !!checklistAnswerId,
        },
      });

      // Crear o actualizar la solicitud de mantenimiento
      const result = await createOrUpdateMaintenanceRequest({
        equipmentId,
        supervisorId: selectedSupervisorId,
        deviations: deviationsWithComments,
        checklistAnswerId,
        employeeId,
        userId,
        kilometer,
      });

      if (!result.ok) {
        toast.error(result.error || 'Error al registrar los desvíos');
        setIsSubmitting(false);
        return;
      }

      const message = result.created
        ? 'Solicitud de mantenimiento creada correctamente'
        : 'Solicitud actualizada correctamente';

      toast.success(message, {
        description: `Se registraron ${deviations.length} desvío(s) para revisión del supervisor.`,
      });

      // Invalidar todas las queries de mantenimiento para que las tabs se actualicen
      invalidateAllMaintenanceQueries(queryClient);

      // Marcar que el submit fue exitoso para evitar que onOpenChange dispare onClose
      submitSuccessRef.current = true;

      // Limpiar estado local antes de llamar onComplete
      setSelectedSupervisorId('');
      setDeviationComments({});
      setIsSubmitting(false);

      // Solo llamar onComplete, NO handleClose (evita doble redirección)
      onComplete();
    } catch (error) {
      logger.error('Error registrando desvíos', { data: { error } });
      toast.error('Ocurrió un error al registrar los desvíos');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Si el submit fue exitoso, no ejecutar onClose (ya se manejó con onComplete)
    if (submitSuccessRef.current) {
      submitSuccessRef.current = false;
      return;
    }
    setSelectedSupervisorId('');
    setDeviationComments({});
    setIsSubmitting(false);
    onClose();
  };

  const getSupervisorName = (supervisorId: string) => {
    return supervisors.find((s) => s.id === supervisorId)?.fullName || '';
  };

  // Separar desvíos críticos y no críticos para mostrarlos ordenados
  const criticalDeviations = deviations.filter((d) => d.is_critical);
  const nonCriticalDeviations = deviations.filter((d) => !d.is_critical);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Desvíos</DialogTitle>
          <DialogDescription>
            Se detectaron {deviations.length} item(s) con problemas. Selecciona el supervisor de turno y opcionalmente
            agrega comentarios describiendo cada desvío.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selector de Supervisor de Turno */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Supervisor de Turno *</CardTitle>
              <CardDescription>Selecciona el supervisor que revisará estos desvíos</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSupervisors ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando supervisores...
                  </div>
                </div>
              ) : supervisorsError ? (
                <p className="text-sm text-destructive">Error al cargar supervisores. Por favor, intenta de nuevo.</p>
              ) : (
                <>
                  <Popover open={openSupervisorSelect} onOpenChange={setOpenSupervisorSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn('w-full justify-between', !selectedSupervisorId && 'text-muted-foreground')}
                        disabled={isSubmitting}
                      >
                        {selectedSupervisorId ? getSupervisorName(selectedSupervisorId) : 'Seleccionar supervisor...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar supervisor..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron supervisores.</CommandEmpty>
                          <CommandGroup>
                            {supervisors.map((supervisor) => (
                              <CommandItem
                                key={supervisor.id}
                                value={supervisor.fullName}
                                onSelect={() => {
                                  setSelectedSupervisorId(supervisor.id);
                                  setOpenSupervisorSelect(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedSupervisorId === supervisor.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{supervisor.fullName}</span>
                                  <span className="text-xs text-muted-foreground">{supervisor.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {supervisors.length === 0 && !isLoadingSupervisors && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No hay supervisores disponibles. Contacta al administrador.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Lista de Desvíos - Críticos primero */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Desvíos Detectados ({deviations.length})
                {criticalDeviations.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalDeviations.length} crítico(s)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Opcionalmente puedes agregar comentarios a cada desvío</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Desvíos Críticos */}
                {criticalDeviations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Items Críticos
                    </div>
                    {criticalDeviations.map((deviation) => (
                      <DeviationItem
                        key={deviation.id}
                        deviation={deviation}
                        comment={deviationComments[deviation.id] || ''}
                        onCommentChange={(comment) => handleUpdateDeviationComment(deviation.id, comment)}
                        showComment={showCommentField[deviation.id] || false}
                        onToggleComment={() => handleToggleCommentField(deviation.id)}
                        disabled={isSubmitting}
                        isCritical
                      />
                    ))}
                  </div>
                )}

                {/* Separador si hay ambos tipos */}
                {criticalDeviations.length > 0 && nonCriticalDeviations.length > 0 && <Separator />}

                {/* Desvíos No Críticos */}
                {nonCriticalDeviations.length > 0 && (
                  <div className="space-y-3">
                    {criticalDeviations.length > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        Otros Items
                      </div>
                    )}
                    {nonCriticalDeviations.map((deviation) => (
                      <DeviationItem
                        key={deviation.id}
                        deviation={deviation}
                        comment={deviationComments[deviation.id] || ''}
                        onCommentChange={(comment) => handleUpdateDeviationComment(deviation.id, comment)}
                        showComment={showCommentField[deviation.id] || false}
                        onToggleComment={() => handleToggleCommentField(deviation.id)}
                        disabled={isSubmitting}
                        isCritical={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} variant="outline" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingSupervisors || !selectedSupervisorId || supervisors.length === 0}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Desvíos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Componente para mostrar un desvío individual con su campo de comentario opcional
 */
function DeviationItem({
  deviation,
  comment,
  onCommentChange,
  showComment,
  onToggleComment,
  disabled,
  isCritical,
}: {
  deviation: Deviation;
  comment: string;
  onCommentChange: (comment: string) => void;
  showComment: boolean;
  onToggleComment: () => void;
  disabled: boolean;
  isCritical: boolean;
}) {
  const handleCloseComment = () => {
    onCommentChange(''); // Limpiar el comentario al cerrar
    onToggleComment();
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        isCritical ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/20'
      )}
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{deviation.item_label}</p>
            {isCritical && (
              <Badge variant="destructive" className="text-xs">
                CRÍTICO
              </Badge>
            )}
          </div>
          {deviation.section_code && (
            <p className="text-sm text-muted-foreground capitalize">
              Sección: {deviation.section_code.replace('_', ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Botón para mostrar campo de comentario o el campo en sí */}
      {!showComment ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleComment}
          disabled={disabled}
          className="gap-2"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Dejar comentario
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`comment-${deviation.id}`} className="text-sm">
              Comentario (opcional)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseComment}
              disabled={disabled}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            id={`comment-${deviation.id}`}
            placeholder="Describe el problema encontrado..."
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={2}
            disabled={disabled}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
