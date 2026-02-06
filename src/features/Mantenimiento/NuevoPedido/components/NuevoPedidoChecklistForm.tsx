'use client';

import { fetchAllEquipmentBasicData } from '@/app/server/GET/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { fetchSupervisorsForChecklist } from '@/features/Checklist/actions/actionsServer';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Loader2,
  Plus,
  Truck,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  createMaintenanceOrderFromDeviations,
  createMaintenanceRequestPendingApproval,
  getChecklistTemplatesForEquipment,
  getCurrentUserForSupervisorCheck,
  type CreateDeviationFromNuevoPedido,
} from '../actions/actionsServer';

const logger = new Logger('NuevoPedidoChecklistForm');

// ============================================
// TIPOS
// ============================================
type Equipment = Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>[number];

type SelectedDeviation = CreateDeviationFromNuevoPedido;

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
interface NuevoPedidoChecklistFormProps {
  equipment: Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>;
  default_equipment_id?: string;
  onSuccess?: () => void;
}

export function NuevoPedidoChecklistForm({
  equipment,
  default_equipment_id,
  onSuccess,
}: NuevoPedidoChecklistFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Estado del paso actual (0-indexed)
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paso 1: Selección de equipo
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(default_equipment_id || '');
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [kilometer, setKilometer] = useState('');

  // Paso 2: Selección de checklist
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Paso 3: Selección de items/desvíos
  const [selectedDeviations, setSelectedDeviations] = useState<SelectedDeviation[]>([]);
  const [deviationComments, setDeviationComments] = useState<Record<string, string>>({});

  // Paso 4: Selección de supervisor
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  // Nuevo: Estado para indicar si el usuario actual es el supervisor
  const [isCurrentUserSupervisor, setIsCurrentUserSupervisor] = useState<boolean | null>(null);

  // Equipo seleccionado
  const selectedEquipment = useMemo(
    () => equipment?.find((e) => e.id === selectedEquipmentId),
    [equipment, selectedEquipmentId]
  );

  // Es vehículo (para mostrar kilometraje)
  const isVehicle = selectedEquipment?.types_of_vehicles?.name === 'Vehículos';

  // Filtrar equipos por búsqueda
  const filteredEquipment = useMemo(() => {
    if (!searchTerm) return equipment?.slice(0, 50) || [];
    return (
      equipment?.filter((equip) => {
        const searchValue = searchTerm.toLowerCase();
        const domain = (equip.domain || '').toLowerCase();
        const serie = (equip.serie || '').toLowerCase();
        const internNumber = String(equip.intern_number || '').toLowerCase();
        return domain.includes(searchValue) || serie.includes(searchValue) || internNumber.includes(searchValue);
      }) || []
    );
  }, [equipment, searchTerm]);

  // Query para templates de checklist
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ['checklist-templates-for-equipment', selectedEquipmentId],
    queryFn: () => getChecklistTemplatesForEquipment(selectedEquipmentId),
    enabled: !!selectedEquipmentId && currentStep >= 1,
  });

  // Template seleccionado
  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Query para obtener usuario actual (para verificar si es supervisor)
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useQuery({
    queryKey: ['current-user-for-supervisor'],
    queryFn: getCurrentUserForSupervisorCheck,
    enabled: currentStep >= 3,
  });

  // Query para supervisores (solo se ejecuta cuando NO es supervisor)
  const { data: supervisors = [], isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ['supervisors-for-checklist'],
    queryFn: fetchSupervisorsForChecklist,
    enabled: currentStep >= 3 && isCurrentUserSupervisor === false,
  });

  // Supervisor seleccionado
  const selectedSupervisor = useMemo(
    () => supervisors.find((s) => s.id === selectedSupervisorId),
    [supervisors, selectedSupervisorId]
  );

  // ============================================
  // HANDLERS
  // ============================================
  const handleSelectEquipment = useCallback(
    (equipId: string) => {
      const equip = equipment?.find((e) => e.id === equipId);
      if (equip) {
        setSelectedEquipmentId(equip.id);
        setKilometer(equip.kilometer || '');
        // Reset estados posteriores
        setSelectedTemplateId('');
        setSelectedDeviations([]);
        setDeviationComments({});
        setSelectedSupervisorId('');
      }
      setEquipmentOpen(false);
    },
    [equipment]
  );

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    // Reset selecciones de desvíos
    setSelectedDeviations([]);
    setDeviationComments({});
  }, []);

  const handleToggleDeviation = useCallback(
    (
      item: {
        id: string;
        code: string;
        label: string;
        is_critical: boolean | null;
      },
      sectionCode: string
    ) => {
      setSelectedDeviations((prev) => {
        const exists = prev.find((d) => d.itemId === item.id);
        if (exists) {
          return prev.filter((d) => d.itemId !== item.id);
        }
        return [
          ...prev,
          {
            itemId: item.id,
            itemCode: item.code,
            itemLabel: item.label,
            sectionCode,
            isCritical: item.is_critical || false,
            comment: deviationComments[item.id] || undefined,
          },
        ];
      });
    },
    [deviationComments]
  );

  const handleUpdateComment = useCallback((itemId: string, comment: string) => {
    setDeviationComments((prev) => ({ ...prev, [itemId]: comment }));
    // Actualizar también en selectedDeviations si existe
    setSelectedDeviations((prev) =>
      prev.map((d) => (d.itemId === itemId ? { ...d, comment: comment || undefined } : d))
    );
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validar datos según el flujo
    if (!selectedEquipmentId || selectedDeviations.length === 0) {
      toast.error('Faltan datos requeridos');
      return;
    }

    // Si es supervisor actual, usar su ID; si no, usar el seleccionado
    const supervisorId = isCurrentUserSupervisor ? currentUser?.id : selectedSupervisorId;

    if (!supervisorId) {
      toast.error('Debes seleccionar un supervisor');
      return;
    }

    setIsSubmitting(true);

    try {
      // Actualizar comentarios en los desvíos antes de enviar
      const deviationsToSend = selectedDeviations.map((d) => ({
        ...d,
        comment: deviationComments[d.itemId] || d.comment || undefined,
      }));

      if (isCurrentUserSupervisor) {
        // FLUJO 1: Usuario ES el supervisor → crear pedido directamente (aprobado automáticamente)
        await createMaintenanceOrderFromDeviations({
          equipmentId: selectedEquipmentId,
          supervisorId,
          kilometer: isVehicle ? kilometer : undefined,
          deviations: deviationsToSend,
        });

        toast.success('Pedido de mantenimiento creado exitosamente');

        // Invalidar queries de pedidos
        queryClient.invalidateQueries({ queryKey: ['maintenance'] });
        queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
        queryClient.invalidateQueries({ queryKey: ['pedidos-pendientes'] });
      } else {
        // FLUJO 2: Usuario NO es supervisor → crear solicitud pendiente de aprobación
        await createMaintenanceRequestPendingApproval({
          equipmentId: selectedEquipmentId,
          supervisorId,
          kilometer: isVehicle ? kilometer : undefined,
          deviations: deviationsToSend,
        });

        toast.success('Solicitud enviada. El supervisor debe aprobarla antes de que pase a Pedidos.');

        // Invalidar queries de solicitudes pendientes
        queryClient.invalidateQueries({ queryKey: ['maintenance'] });
        queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
        queryClient.invalidateQueries({ queryKey: ['solicitudes-pendientes'] });
      }

      // Reset form
      setCurrentStep(0);
      setSelectedEquipmentId(default_equipment_id || '');
      setKilometer('');
      setSelectedTemplateId('');
      setSelectedDeviations([]);
      setDeviationComments({});
      setSelectedSupervisorId('');
      setIsCurrentUserSupervisor(null);

      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Error al crear pedido', { data: { error } });
      toast.error('Error al crear el pedido de mantenimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // VALIDACIONES DE PASOS
  // ============================================
  const canAdvanceStep = useMemo(() => {
    switch (currentStep) {
      case 0: // Equipo
        return !!selectedEquipmentId;
      case 1: // Checklist
        return !!selectedTemplateId;
      case 2: // Items
        return selectedDeviations.length > 0;
      case 3: // Supervisor
        // Si es supervisor actual: ya tiene el supervisor (él mismo)
        // Si NO es supervisor: debe haber seleccionado uno
        if (isCurrentUserSupervisor === null) return false; // Aún no ha respondido
        if (isCurrentUserSupervisor) return true; // Es él mismo
        return !!selectedSupervisorId; // Debe seleccionar supervisor
      default:
        return false;
    }
  }, [
    currentStep,
    selectedEquipmentId,
    selectedTemplateId,
    selectedDeviations,
    selectedSupervisorId,
    isCurrentUserSupervisor,
  ]);

  const steps = [
    { title: 'Equipo', icon: Truck },
    { title: 'Checklist', icon: ClipboardList },
    { title: 'Items', icon: AlertTriangle },
    { title: 'Supervisor', icon: User },
    { title: 'Confirmar', icon: CheckCircle },
  ];

  // ============================================
  // RENDER STEPS
  // ============================================
  const renderStep0Equipment = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Selecciona el equipo</Label>
        <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={!!default_equipment_id}
              className={cn('w-full justify-between', !selectedEquipmentId && 'text-muted-foreground')}
            >
              {selectedEquipment
                ? `${selectedEquipment.domain || selectedEquipment.serie}${selectedEquipment.intern_number ? ` (Nº${selectedEquipment.intern_number})` : ''}`
                : 'Selecciona un equipo'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Buscar por dominio, serie o número..." onValueChange={setSearchTerm} />
              <CommandList>
                <CommandEmpty>No se encontró el equipo</CommandEmpty>
                <CommandGroup>
                  {filteredEquipment.map((equip) => (
                    <CommandItem
                      key={equip.id}
                      value={equip.domain || equip.serie || equip.id}
                      onSelect={() => handleSelectEquipment(equip.id)}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', equip.id === selectedEquipmentId ? 'opacity-100' : 'opacity-0')}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {equip.domain || equip.serie}
                          {equip.intern_number && ` (Nº${equip.intern_number})`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {equip.types_of_vehicles?.name} - {equip.condition}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedEquipment && isVehicle && (
        <div className="space-y-2">
          <Label htmlFor="kilometer">Kilometraje actual</Label>
          <Input
            id="kilometer"
            type="number"
            value={kilometer}
            onChange={(e) => setKilometer(e.target.value)}
            placeholder="Ingresa el kilometraje"
            min={Number(selectedEquipment.kilometer) || 0}
          />
          {selectedEquipment.kilometer && (
            <p className="text-xs text-muted-foreground">
              Último kilometraje registrado: {selectedEquipment.kilometer} km
            </p>
          )}
        </div>
      )}

      {selectedEquipment && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipo Seleccionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Identificación:</span>
              <span className="font-medium">{selectedEquipment.domain || selectedEquipment.serie}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <span>{selectedEquipment.types_of_vehicles?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Condición:</span>
              <Badge variant={selectedEquipment.condition === 'operativo' ? 'success' : 'destructive'}>
                {selectedEquipment.condition}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep1Checklist = () => (
    <div className="space-y-4">
      <Label>Selecciona el checklist base</Label>

      {isLoadingTemplates ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : templatesError ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error al cargar los checklists</div>
      ) : templates && templates.length > 0 ? (
        <div className="space-y-2">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                selectedTemplateId === template.id && 'border-primary bg-primary/5'
              )}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.checklist_template_sections?.length || 0} secciones
                  </p>
                </div>
                {selectedTemplateId === template.id && <Check className="h-5 w-5 text-primary" />}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-muted text-center rounded-lg">
          No hay checklists disponibles para este tipo de equipo
        </div>
      )}
    </div>
  );

  const renderStep2Items = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Selecciona los items con desvío</Label>
        <Badge variant="secondary">{selectedDeviations.length} seleccionados</Badge>
      </div>

      {selectedTemplate?.checklist_template_sections ? (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {selectedTemplate.checklist_template_sections
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map((section) => (
                <Card key={section.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {section.name}
                      <Badge variant="outline" className="text-xs">
                        {section.checklist_template_items?.length || 0} items
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {section.checklist_template_items
                      ?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                      .map((item) => {
                        const isSelected = selectedDeviations.some((d) => d.itemId === item.id);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'p-2 rounded-lg border transition-all',
                              isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted'
                            )}
                          >
                            <div
                              className="flex items-start gap-2 cursor-pointer"
                              onClick={() =>
                                handleToggleDeviation(
                                  { id: item.id, code: item.code, label: item.label, is_critical: item.is_critical },
                                  section.code
                                )
                              }
                            >
                              <Checkbox checked={isSelected} className="mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{item.label}</span>
                                  {item.is_critical && (
                                    <Badge variant="destructive" className="text-xs">
                                      Crítico
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{item.code}</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2 ml-6">
                                <Textarea
                                  placeholder="Comentario sobre el desvío (opcional)"
                                  value={deviationComments[item.id] || ''}
                                  onChange={(e) => handleUpdateComment(item.id, e.target.value)}
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="p-4 bg-muted text-center rounded-lg">No hay items en este checklist</div>
      )}
    </div>
  );

  const renderStep3Supervisor = () => (
    <div className="space-y-4">
      {/* Pregunta inicial: ¿Eres el supervisor? */}
      {isLoadingCurrentUser ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <div className="space-y-3">
            <Label className="text-base font-medium">¿Eres el supervisor de este pedido?</Label>
            <p className="text-sm text-muted-foreground">
              Si eres el supervisor, el pedido se creará directamente. Si no lo eres, el pedido deberá ser aprobado por
              el supervisor que selecciones.
            </p>
            <div className="flex gap-3 mt-4">
              <Button
                type="button"
                variant={isCurrentUserSupervisor === true ? 'default' : 'outline'}
                className={cn('flex-1', isCurrentUserSupervisor === true && 'bg-green-600 hover:bg-green-700')}
                onClick={() => {
                  setIsCurrentUserSupervisor(true);
                  setSelectedSupervisorId('');
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Sí, soy el supervisor
              </Button>
              <Button
                type="button"
                variant={isCurrentUserSupervisor === false ? 'default' : 'outline'}
                className={cn('flex-1', isCurrentUserSupervisor === false && 'bg-blue-600 hover:bg-blue-700')}
                onClick={() => {
                  setIsCurrentUserSupervisor(false);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                No, seleccionaré uno
              </Button>
            </div>
          </div>

          {/* Si ES supervisor: mostrar información del usuario actual */}
          {isCurrentUserSupervisor === true && currentUser && (
            <Card className="mt-4 border-green-200 bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">{currentUser.fullname}</p>
                    <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                    <Badge variant="success" className="mt-1">
                      Supervisor del pedido
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 mt-3">
                  El pedido se creará directamente y aparecerá en "Pedidos de Mantenimiento" → "Pendientes".
                </p>
              </CardContent>
            </Card>
          )}

          {/* Si NO es supervisor: mostrar selector */}
          {isCurrentUserSupervisor === false && (
            <div className="mt-4 space-y-3">
              <Label>Selecciona el supervisor de turno</Label>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg mb-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  La solicitud será enviada al supervisor para su aprobación. Una vez aprobada, pasará a "Pedidos de
                  Mantenimiento".
                </p>
              </div>

              {isLoadingSupervisors ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Popover open={supervisorOpen} onOpenChange={setSupervisorOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn('w-full justify-between')}>
                      {selectedSupervisor ? selectedSupervisor.fullName : 'Selecciona un supervisor'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar supervisor..." />
                      <CommandList>
                        <CommandEmpty>No se encontró supervisor</CommandEmpty>
                        <CommandGroup>
                          {supervisors.map((supervisor) => (
                            <CommandItem
                              key={supervisor.id}
                              value={supervisor.fullName}
                              onSelect={() => {
                                setSelectedSupervisorId(supervisor.id);
                                setSupervisorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  supervisor.id === selectedSupervisorId ? 'opacity-100' : 'opacity-0'
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
              )}

              {selectedSupervisor && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedSupervisor.fullName}</p>
                        <p className="text-sm text-muted-foreground">{selectedSupervisor.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderStep4Confirm = () => {
    // Determinar el supervisor para mostrar en el resumen
    const supervisorToShow = isCurrentUserSupervisor
      ? { fullName: currentUser?.fullname, email: currentUser?.email }
      : selectedSupervisor;

    return (
      <div className="space-y-4">
        <div
          className={cn(
            'p-4 border rounded-lg',
            isCurrentUserSupervisor
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200'
              : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2 font-medium mb-2',
              isCurrentUserSupervisor ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'
            )}
          >
            <CheckCircle className="h-5 w-5" />
            {isCurrentUserSupervisor ? 'Resumen del Pedido' : 'Resumen de la Solicitud'}
          </div>
          <p
            className={cn(
              'text-sm',
              isCurrentUserSupervisor ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
            )}
          >
            {isCurrentUserSupervisor
              ? 'Verifica la información antes de crear el pedido de mantenimiento.'
              : 'Verifica la información antes de enviar la solicitud al supervisor.'}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{selectedEquipment?.domain || selectedEquipment?.serie}</p>
            <p className="text-sm text-muted-foreground">{selectedEquipment?.types_of_vehicles?.name}</p>
            {isVehicle && kilometer && <p className="text-sm">Kilometraje: {kilometer} km</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items con Desvío ({selectedDeviations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {selectedDeviations.map((d) => (
                <li key={d.itemId} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <div>
                    <span className="font-medium">{d.itemLabel}</span>
                    {d.isCritical && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Crítico
                      </Badge>
                    )}
                    {d.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{d.comment}"</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Supervisor {isCurrentUserSupervisor ? '(Tú)' : 'Asignado'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{supervisorToShow?.fullName}</p>
            <p className="text-sm text-muted-foreground">{supervisorToShow?.email}</p>
            {isCurrentUserSupervisor && (
              <Badge variant="success" className="mt-2">
                Supervisor del pedido
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Estado inicial según el flujo */}
        <div
          className={cn(
            'p-3 rounded-lg',
            isCurrentUserSupervisor ? 'bg-green-50 dark:bg-green-950/20' : 'bg-yellow-50 dark:bg-yellow-950/20'
          )}
        >
          <p className="text-sm font-medium">
            {isCurrentUserSupervisor ? 'Estado inicial del pedido' : 'Estado inicial de la solicitud'}
          </p>
          <Badge variant={isCurrentUserSupervisor ? 'warning' : 'secondary'} className="mt-1">
            {isCurrentUserSupervisor ? 'Pendiente de Planificación' : 'Pendiente de Aprobación'}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            {isCurrentUserSupervisor
              ? 'El pedido aparecerá en "Pedidos de Mantenimiento" → "Pendientes" para asignarle fecha.'
              : 'La solicitud aparecerá en "Pendientes de Validar" para que el supervisor la apruebe.'}
          </p>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Stepper lateral */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Pedido
          </CardTitle>
          <CardDescription>Crea un pedido desde items de checklist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-all',
                    isCurrent && 'bg-primary/10',
                    isCompleted && 'text-primary'
                  )}
                >
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center border-2',
                      isCurrent && 'border-primary bg-primary text-primary-foreground',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      !isCurrent && !isCompleted && 'border-muted-foreground/30'
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={cn('text-sm font-medium', !isCurrent && !isCompleted && 'text-muted-foreground')}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contenido del paso */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && renderStep0Equipment()}
          {currentStep === 1 && renderStep1Checklist()}
          {currentStep === 2 && renderStep2Items()}
          {currentStep === 3 && renderStep3Supervisor()}
          {currentStep === 4 && renderStep4Confirm()}
        </CardContent>

        <Separator />

        {/* Botones de navegación */}
        <div className="p-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep((prev) => prev + 1)} disabled={!canAdvanceStep}>
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={isCurrentUserSupervisor ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCurrentUserSupervisor ? 'Crear Pedido' : 'Enviar Solicitud'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
