'use client';

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
import { fetchAllEquipmentBasicData } from '@/features/Mantenimiento/actions/equipment-basic';
import { isNonPropagatingChecklistItem } from '@/features/Mantenimiento/constants/non-propagating-checklist-items';
import { ManualItemsInput, type ManualItem } from '@/features/Mantenimiento/shared/components/ManualItemsInput';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
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
  Info,
  Loader2,
  Plus,
  Truck,
  User,
  Wrench,
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
  driverEmployeeId?: string;
  driverName?: string;
  driverFileNumber?: string;
  skipSupervisorQuestion?: boolean;
  successRedirectUrl?: string;
}

export function NuevoPedidoChecklistForm({
  equipment,
  default_equipment_id,
  onSuccess,
  driverEmployeeId,
  driverName,
  driverFileNumber,
  skipSupervisorQuestion = false,
  successRedirectUrl,
}: NuevoPedidoChecklistFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Estado del paso actual (0-indexed)
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tipo de pedido
  const [requestType, setRequestType] = useState<'checklist' | 'preventive'>('checklist');
  const [selectedPreventiveType, setSelectedPreventiveType] = useState<PreventiveType | ''>('');
  const [preventiveDescription, setPreventiveDescription] = useState<string>('');

  // Paso 1: Selección de equipo
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(default_equipment_id || '');
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pre-fill km/hours from default equipment if provided
  const defaultEquip = default_equipment_id ? equipment?.find((e) => e.id === default_equipment_id) : null;
  const [kilometer, setKilometer] = useState(defaultEquip?.kilometer || '');
  const [engineHours, setEngineHours] = useState(defaultEquip?.engine_hours || '');

  // Paso 2: Selección de checklist
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Paso 3: Selección de items/desvíos
  const [selectedDeviations, setSelectedDeviations] = useState<SelectedDeviation[]>([]);
  const [deviationComments, setDeviationComments] = useState<Record<string, string>>({});
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  // Paso 4: Selección de supervisor
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  // Nuevo: Estado para indicar si el usuario actual es el supervisor
  const [isCurrentUserSupervisor, setIsCurrentUserSupervisor] = useState<boolean | null>(
    skipSupervisorQuestion ? false : null
  );

  // Equipo seleccionado
  const selectedEquipment = useMemo(
    () => equipment?.find((e) => e.id === selectedEquipmentId),
    [equipment, selectedEquipmentId]
  );

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

  // ============================================
  // STEPS DINÁMICOS según requestType
  // ============================================
  type StepKey = 'equipment' | 'type' | 'items' | 'supervisor' | 'confirm';

  const CHECKLIST_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
    { key: 'equipment', title: 'Equipo', icon: Truck },
    { key: 'type', title: 'Checklist', icon: ClipboardList },
    { key: 'items', title: 'Items', icon: AlertTriangle },
    { key: 'supervisor', title: 'Supervisor', icon: User },
    { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
  ];

  const PREVENTIVE_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
    { key: 'equipment', title: 'Equipo', icon: Truck },
    { key: 'type', title: 'Preventivo', icon: Wrench },
    { key: 'supervisor', title: 'Supervisor', icon: User },
    { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
  ];

  const steps = requestType === 'preventive' ? PREVENTIVE_STEPS : CHECKLIST_STEPS;
  const currentStepKey = steps[currentStep]?.key;

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
    enabled: steps.findIndex((s) => s.key === 'supervisor') <= currentStep,
  });

  // Query para supervisores (solo se ejecuta cuando NO es supervisor)
  const { data: supervisors = [], isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ['supervisors-for-checklist'],
    queryFn: fetchSupervisorsForChecklist,
    enabled: steps.findIndex((s) => s.key === 'supervisor') <= currentStep && isCurrentUserSupervisor === false,
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
        setEngineHours(equip.engine_hours || '');
        // Reset estados posteriores
        setSelectedTemplateId('');
        setSelectedDeviations([]);
        setDeviationComments({});
        setManualItems([]);
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
    setManualItems([]);
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

  const handleChangeRequestType = useCallback(
    (type: 'checklist' | 'preventive') => {
      if (type === requestType) return;
      setRequestType(type);
      setSelectedTemplateId('');
      setSelectedPreventiveType('');
      setPreventiveDescription('');
      setSelectedDeviations([]);
      setDeviationComments({});
      setManualItems([]);
      setSelectedSupervisorId('');
      setIsCurrentUserSupervisor(null);
    },
    [requestType]
  );

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validar datos según el flujo
    if (!selectedEquipmentId) {
      toast.error('Faltan datos requeridos');
      return;
    }
    if (requestType === 'checklist' && selectedDeviations.length === 0 && manualItems.length === 0) {
      toast.error('Debes seleccionar al menos un desvío o agregar un ítem manual');
      return;
    }
    if (requestType === 'preventive' && !selectedPreventiveType) {
      toast.error('Debes seleccionar un programa de mantenimiento preventivo');
      return;
    }

    // Validar que el kilometraje no sea menor al actual
    if (kilometer) {
      const currentKm = Number(selectedEquipment?.kilometer) || 0;
      if (Number(kilometer) < currentKm) {
        toast.error(`El kilometraje no puede ser menor al actual (${currentKm} km)`);
        return;
      }
    }

    // Si es supervisor actual, usar su ID; si no, usar el seleccionado
    const supervisorId = isCurrentUserSupervisor ? currentUser?.id : selectedSupervisorId;

    if (!supervisorId) {
      toast.error('Debes seleccionar un supervisor');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isCurrentUserSupervisor) {
        // FLUJO 1: Usuario ES el supervisor → crear pedido directamente (aprobado automáticamente)
        if (requestType === 'preventive') {
          await createMaintenanceOrderFromDeviations({
            equipmentId: selectedEquipmentId,
            supervisorId,
            kilometer: kilometer || undefined,
            engine_hours: engineHours || undefined,
            source: 'preventive',
            preventiveType: selectedPreventiveType as PreventiveType,
            driverEmployeeId: driverEmployeeId || undefined,
            description: preventiveDescription.trim() || undefined,
          });
        } else {
          // Actualizar comentarios en los desvíos antes de enviar
          const deviationsToSend = selectedDeviations.map((d) => ({
            ...d,
            comment: deviationComments[d.itemId] || d.comment || undefined,
          }));
          await createMaintenanceOrderFromDeviations({
            equipmentId: selectedEquipmentId,
            supervisorId,
            kilometer: kilometer || undefined,
            engine_hours: engineHours || undefined,
            deviations: deviationsToSend,
            templateId: selectedTemplateId || undefined,
            driverEmployeeId: driverEmployeeId || undefined,
            manualItems: manualItems.map((m) => ({ label: m.label })),
          });
        }

        toast.success('Pedido de mantenimiento creado exitosamente');

        // Invalidar todas las queries de mantenimiento
        invalidateAllMaintenanceQueries(queryClient);
      } else {
        // FLUJO 2: Usuario NO es supervisor → crear solicitud pendiente de aprobación
        if (requestType === 'preventive') {
          await createMaintenanceRequestPendingApproval({
            equipmentId: selectedEquipmentId,
            supervisorId,
            kilometer: kilometer || undefined,
            engine_hours: engineHours || undefined,
            source: 'preventive',
            preventiveType: selectedPreventiveType as PreventiveType,
            description: preventiveDescription.trim() || undefined,
          });
        } else {
          // Actualizar comentarios en los desvíos antes de enviar
          const deviationsToSend = selectedDeviations.map((d) => ({
            ...d,
            comment: deviationComments[d.itemId] || d.comment || undefined,
          }));
          await createMaintenanceRequestPendingApproval({
            equipmentId: selectedEquipmentId,
            supervisorId,
            kilometer: kilometer || undefined,
            engine_hours: engineHours || undefined,
            deviations: deviationsToSend,
            templateId: selectedTemplateId || undefined,
            driverEmployeeId: driverEmployeeId || undefined,
            manualItems: manualItems.map((m) => ({ label: m.label })),
          });
        }

        toast.success('Solicitud enviada. El supervisor debe aprobarla antes de que pase a Pedidos.');

        // Invalidar todas las queries de mantenimiento
        invalidateAllMaintenanceQueries(queryClient);
      }

      // Reset form
      setCurrentStep(0);
      setSelectedEquipmentId(default_equipment_id || '');
      setKilometer('');
      setEngineHours('');
      setSelectedTemplateId('');
      setSelectedDeviations([]);
      setDeviationComments({});
      setManualItems([]);
      setSelectedSupervisorId('');
      setIsCurrentUserSupervisor(skipSupervisorQuestion ? false : null);
      setSelectedPreventiveType('');
      setPreventiveDescription('');
      setRequestType('checklist');

      router.refresh();

      if (onSuccess) {
        onSuccess();
      }

      if (successRedirectUrl) {
        router.push(successRedirectUrl);
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
    switch (currentStepKey) {
      case 'equipment':
        return !!selectedEquipmentId;
      case 'type':
        if (requestType === 'checklist') return !!selectedTemplateId;
        return !!selectedPreventiveType;
      case 'items':
        return selectedDeviations.length > 0 || manualItems.length > 0;
      case 'supervisor':
        if (isCurrentUserSupervisor === null) return false;
        if (isCurrentUserSupervisor) return true;
        return !!selectedSupervisorId;
      case 'confirm':
        return false;
      default:
        return false;
    }
  }, [
    currentStepKey,
    requestType,
    selectedEquipmentId,
    selectedTemplateId,
    selectedPreventiveType,
    selectedDeviations,
    manualItems,
    selectedSupervisorId,
    isCurrentUserSupervisor,
  ]);

  // ============================================
  // RENDER STEPS
  // ============================================
  const renderStep0Equipment = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Selecciona el equipo</Label>
        <Popover
          open={equipmentOpen}
          onOpenChange={(open) => {
            setEquipmentOpen(open);
            if (!open) setSearchTerm('');
          }}
        >
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

      {selectedEquipment && (
        <div className="grid grid-cols-2 gap-4">
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
              <p className="text-xs text-muted-foreground">Último registrado: {selectedEquipment.kilometer} km</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="engineHours">Horómetro</Label>
            <Input
              id="engineHours"
              type="number"
              value={engineHours}
              onChange={(e) => setEngineHours(e.target.value)}
              placeholder="Ingrese las horas de motor"
              min={Number(selectedEquipment.engine_hours) || 0}
            />
            {selectedEquipment.engine_hours && (
              <p className="text-xs text-muted-foreground">Último registrado: {selectedEquipment.engine_hours} hs</p>
            )}
          </div>
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

  const renderStep1Type = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Tipo de pedido</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Card
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              requestType === 'checklist' && 'border-primary bg-primary/5'
            )}
            onClick={() => handleChangeRequestType('checklist')}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <ClipboardList className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Checklist</p>
                <p className="text-xs text-muted-foreground">Desde desvíos de inspección</p>
              </div>
              {requestType === 'checklist' && <Check className="h-4 w-4 ml-auto text-primary" />}
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              requestType === 'preventive' && 'border-primary bg-primary/5'
            )}
            onClick={() => handleChangeRequestType('preventive')}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <Wrench className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Mant. Preventivo</p>
                <p className="text-xs text-muted-foreground">Programa planificado de mantenimiento</p>
              </div>
              {requestType === 'preventive' && <Check className="h-4 w-4 ml-auto text-primary" />}
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {requestType === 'checklist' ? (
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
      ) : (
        <div className="space-y-4">
          <Label>Selecciona el programa</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(PREVENTIVE_TYPES) as [PreventiveType, string][]).map(([key, label]) => {
              const Icon = PREVENTIVE_TYPE_ICONS[key];
              return (
                <Card
                  key={key}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedPreventiveType === key && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setSelectedPreventiveType(key)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{PREVENTIVE_TYPE_DESCRIPTIONS[key]}</p>
                    </div>
                    {selectedPreventiveType === key && <Check className="h-4 w-4 text-primary" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="preventive-description">Descripción (opcional)</Label>
            <Textarea
              id="preventive-description"
              placeholder="Agrega detalles del mantenimiento preventivo (motivo, observaciones, etc.)"
              value={preventiveDescription}
              onChange={(e) => setPreventiveDescription(e.target.value)}
              rows={3}
            />
          </div>
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
                        const isNonPropagating = isNonPropagatingChecklistItem(selectedTemplateId, item.code);
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm">{item.label}</span>
                                  {item.is_critical && (
                                    <Badge variant="destructive" className="text-xs">
                                      Crítico
                                    </Badge>
                                  )}
                                  {isNonPropagating && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] gap-1 border-dashed font-normal"
                                      title="Si marcás este desvío, queda registrado pero no genera trabajo en taller."
                                    >
                                      <Info className="h-3 w-3" />
                                      Solo informativo · No viaja a taller
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

      <ManualItemsInput items={manualItems} onChange={setManualItems} disabled={isSubmitting} />
    </div>
  );

  const renderStep3Supervisor = () => (
    <div className="space-y-4">
      {/* Pregunta inicial: ¿Eres el supervisor? (omitir si skipSupervisorQuestion) */}
      {isLoadingCurrentUser ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          {!skipSupervisorQuestion && (
            <div className="space-y-3">
              <Label className="text-base font-medium">¿Eres el supervisor de este pedido?</Label>
              <p className="text-sm text-muted-foreground">
                Si eres el supervisor, el pedido se creará directamente. Si no lo eres, el pedido deberá ser aprobado
                por el supervisor que selecciones.
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
          )}

          {skipSupervisorQuestion && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Seleccionar Supervisor</Label>
            </div>
          )}

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
                  El pedido se creará directamente y aparecerá en &quot;Pedidos de Mantenimiento&quot; →
                  &quot;Pendientes&quot;.
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
                  La solicitud será enviada al supervisor para su aprobación. Una vez aprobada, pasará a &quot;Pedidos
                  de Mantenimiento&quot;.
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
                              disabled={!supervisor.isAvailable}
                              className={cn(!supervisor.isAvailable && 'opacity-50')}
                              onSelect={() => {
                                if (!supervisor.isAvailable) return;
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
                                <div className="flex items-center gap-2">
                                  <span>{supervisor.fullName}</span>
                                  {!supervisor.hasLinkedEmployee && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Sin empleado vinculado
                                    </Badge>
                                  )}
                                  {supervisor.hasLinkedEmployee && !supervisor.hasActiveDiagram && (
                                    <Badge variant="warning" className="text-[10px]">
                                      Sin diagrama activo
                                    </Badge>
                                  )}
                                </div>
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
            {kilometer && <p className="text-sm">Kilometraje: {kilometer} km</p>}
            {engineHours && <p className="text-sm">Horómetro: {engineHours} hs</p>}
            {driverName && (
              <div className="flex items-center gap-2 mt-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Chofer:</span>
                {driverFileNumber && (
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{driverFileNumber}</span>
                )}
                <span className="font-medium">{driverName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {requestType === 'preventive' ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tipo de mantenimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Wrench className="h-3 w-3" />
                  Mantenimiento Preventivo
                </Badge>
              </div>
              {selectedPreventiveType && (
                <Card className="mt-2">
                  <CardContent className="p-3 flex items-center gap-3">
                    {(() => {
                      const Icon = PREVENTIVE_TYPE_ICONS[selectedPreventiveType as PreventiveType];
                      return <Icon className="h-6 w-6 text-muted-foreground" />;
                    })()}
                    <div>
                      <p className="font-medium text-sm">
                        {PREVENTIVE_TYPES[selectedPreventiveType as PreventiveType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PREVENTIVE_TYPE_DESCRIPTIONS[selectedPreventiveType as PreventiveType]}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {preventiveDescription.trim() && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">Descripción</p>
                  <p className="text-sm whitespace-pre-line">{preventiveDescription.trim()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
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
                      {d.comment && (
                        <p className="text-xs text-muted-foreground mt-1 italic">&quot;{d.comment}&quot;</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

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

  const renderCurrentStep = () => {
    switch (currentStepKey) {
      case 'equipment':
        return renderStep0Equipment();
      case 'type':
        return renderStep1Type();
      case 'items':
        return renderStep2Items();
      case 'supervisor':
        return renderStep3Supervisor();
      case 'confirm':
        return renderStep4Confirm();
      default:
        return null;
    }
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
                  key={step.key}
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
        <CardContent>{renderCurrentStep()}</CardContent>

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
