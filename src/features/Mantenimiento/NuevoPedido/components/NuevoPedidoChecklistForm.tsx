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
import { fetchAllTypesOfRepairs } from '@/features/Mantenimiento/TiposReparaciones/actions/actions';
import {
  fetchAllEquipmentBasicData,
  fetchAllOtherEquipmentBasicData,
} from '@/features/Mantenimiento/actions/equipment-basic';
import { isNonPropagatingChecklistItem } from '@/features/Mantenimiento/constants/non-propagating-checklist-items';
import { ManualItemsInput, type ManualItem } from '@/features/Mantenimiento/shared/components/ManualItemsInput';
import {
  ManualRepairsInput,
  type ManualRepair,
  type ManualRepairsInputHandle,
  type RepairGroupOption,
} from '@/features/Mantenimiento/shared/components/ManualRepairsInput';
import type { MaintenanceResourceKind } from '@/features/Mantenimiento/shared/maintenance-resource';
import {
  PREVENTIVE_TYPES,
  PREVENTIVE_TYPE_DESCRIPTIONS,
  PREVENTIVE_TYPE_ICONS,
  type PreventiveType,
} from '@/features/Mantenimiento/shared/preventive-maintenance';
import { uploadRepairImages } from '@/features/Mantenimiento/shared/utils/uploadRepairImages';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { conditionLabels } from '@/shared/utils/mappers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Info,
  Loader2,
  Lock,
  PencilLine,
  Plus,
  Truck,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import {
  createMaintenanceOrderFromDeviations,
  createMaintenanceRequestPendingApproval,
  createManualMaintenanceRequest,
  getChecklistTemplatesForEquipment,
  getCurrentUserForSupervisorCheck,
  type CreateDeviationFromNuevoPedido,
} from '../actions/actionsServer';
import { fetchMaintenanceGroupsWithRepairs } from '../actions/maintenance-groups';

const logger = new Logger('NuevoPedidoChecklistForm');

// ============================================
// TIPOS
// ============================================
type Equipment = Awaited<ReturnType<typeof fetchAllEquipmentBasicData>>[number];

type SelectedDeviation = CreateDeviationFromNuevoPedido;

/**
 * Caminos para crear el pedido:
 * - checklist:  desde los desvíos de una inspección (el original)
 * - preventive: programa planificado de mantenimiento
 * - manual:     carga directa de reparaciones, sin pasar por un checklist (ticket 592)
 */
type RequestType = 'checklist' | 'preventive' | 'manual';

/** Orden visual de las tarjetas — lo usa la navegación por flechas del radiogroup */
const REQUEST_TYPE_ORDER: RequestType[] = ['checklist', 'preventive', 'manual'];

/** Orden visual del paso "Recurso" — lo usa la navegación por flechas */
const RESOURCE_KIND_ORDER: MaintenanceResourceKind[] = ['vehicle', 'other_equipment'];

interface SelectableCardProps<T extends string> {
  value: T;
  /** Orden visual del grupo, para mover el foco con las flechas */
  order: readonly T[];
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: (value: T) => void;
  /**
   * Si viene, la opción queda bloqueada pero SIGUE siendo focusable y navegable
   * con las flechas. Se usa `aria-disabled` y no `disabled` a propósito: con
   * `disabled` el control sale del orden de foco y el motivo se vuelve
   * inalcanzable por teclado y por lector de pantalla.
   */
  disabledReason?: string;
}

/**
 * Tarjeta seleccionable de un radiogroup.
 *
 * Es un `radio` real a nivel de accesibilidad: se alcanza con Tab (solo la
 * seleccionada está en el orden de tabulación), se mueve con las flechas y se
 * activa con Enter o Espacio. Antes eran `<Card onClick>` sin foco ni teclado.
 */
function SelectableCard<T extends string>({
  value,
  order,
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
  disabledReason,
}: SelectableCardProps<T>) {
  const isDisabled = Boolean(disabledReason);
  const reasonId = `${value}-disabled-reason`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // El bloqueo se implementa acá: `aria-disabled` no lo aplica por sí solo
      if (isDisabled) return;
      onSelect(value);
      return;
    }

    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !backward) return;

    event.preventDefault();
    const total = order.length;
    const nextIndex = (order.indexOf(value) + (forward ? 1 : -1) + total) % total;
    const nextValue = order[nextIndex];
    event.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-card-value="${nextValue}"]`)?.focus();
  };

  return (
    <Card
      role="radio"
      aria-checked={selected}
      aria-disabled={isDisabled || undefined}
      aria-describedby={isDisabled ? reasonId : undefined}
      tabIndex={selected ? 0 : -1}
      data-card-value={value}
      onClick={() => !isDisabled && onSelect(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        'transition-colors outline-none',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        isDisabled ? 'cursor-not-allowed bg-muted/40 opacity-70' : 'cursor-pointer hover:border-primary/50',
        selected && !isDisabled && 'border-primary bg-primary/5'
      )}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <Icon aria-hidden="true" className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground text-pretty">{description}</p>
          {/* Motivo visible, no tooltip: tiene que poder leerse sin hover */}
          {isDisabled && (
            <p id={reasonId} className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground text-pretty">
              <Lock aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
              {disabledReason}
            </p>
          )}
        </div>
        {/* Siempre presente: si se montara solo al seleccionar, la tarjeta cambiaría de layout */}
        <Check className={cn('h-4 w-4 ml-auto shrink-0 text-primary', !selected && 'invisible')} />
      </CardContent>
    </Card>
  );
}

/** Tarjeta del paso "Tipo de pedido" */
function RequestTypeCard(props: Omit<SelectableCardProps<RequestType>, 'value' | 'order'> & { type: RequestType }) {
  const { type, ...rest } = props;
  return <SelectableCard<RequestType> value={type} order={REQUEST_TYPE_ORDER} {...rest} />;
}

/** Tarjeta del paso "Recurso" (ticket 596) */
function ResourceKindCard(
  props: Omit<SelectableCardProps<MaintenanceResourceKind>, 'value' | 'order'> & { kind: MaintenanceResourceKind }
) {
  const { kind, ...rest } = props;
  return <SelectableCard<MaintenanceResourceKind> value={kind} order={RESOURCE_KIND_ORDER} {...rest} />;
}

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

  // Tipo de recurso (ticket 596): define qué se lista en el selector del paso Equipo
  const [resourceKind, setResourceKind] = useState<MaintenanceResourceKind>('vehicle');
  const isOtherEquipment = resourceKind === 'other_equipment';

  // Tipo de pedido
  const [requestType, setRequestType] = useState<RequestType>('checklist');
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

  // Paso 3 (carga manual): reparaciones cargadas directamente, sin checklist
  const [manualRepairs, setManualRepairs] = useState<ManualRepair[]>([]);
  // El borrador de reparacion vive dentro de ManualRepairsInput; este ref permite
  // guardarlo al avanzar en vez de descartarlo en silencio.
  const manualRepairsRef = useRef<ManualRepairsInputHandle>(null);
  // Habilita "Siguiente" cuando hay una reparacion escrita sin agregar: al avanzar
  // se guarda sola (ver handleAdvanceStep).
  const [hasPendingManualDraft, setHasPendingManualDraft] = useState(false);

  // Tipos de reparación para el selector de carga manual
  const {
    data: repairTypes = [],
    isLoading: isLoadingRepairTypes,
    isError: hasRepairTypesError,
    refetch: refetchRepairTypes,
  } = useQuery({
    queryKey: ['types-of-repairs-for-manual-request'],
    queryFn: () => fetchAllTypesOfRepairs(),
    enabled: requestType === 'manual',
    staleTime: 5 * 60 * 1000,
  });

  const handleRetryRepairTypes = useCallback(() => {
    void refetchRepairTypes();
  }, [refetchRepairTypes]);

  // Grupos de reparación: atajo para cargar un pedido largo (ej: "Service de motor")
  // sin tener que conocer una por una las tareas que lo componen.
  const {
    data: maintenanceGroups = [],
    isLoading: isLoadingGroups,
    isError: hasGroupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ['maintenance-groups-for-manual-request'],
    queryFn: () => fetchMaintenanceGroupsWithRepairs(),
    enabled: requestType === 'manual',
    staleTime: 5 * 60 * 1000,
  });

  const handleRetryGroups = useCallback(() => {
    void refetchGroups();
  }, [refetchGroups]);

  // Se aplana la pivote acá: el input de reparaciones no tiene por qué conocer la
  // forma de la relación M:M. Además la referencia queda estable para el `memo`.
  const repairGroupOptions = useMemo<RepairGroupOption[]>(
    () =>
      maintenanceGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        repairTypes: group.maintenance_group_type_of_repairs.map((relation) => ({
          id: relation.types_of_repairs.id,
          name: relation.types_of_repairs.name,
        })),
      })),
    [maintenanceGroups]
  );

  // Nombres de las tareas para el resumen final. Incluye las que llegaron dentro de
  // un grupo: si el listado general falló, esas reparaciones igual se muestran con
  // su nombre en vez de quedar en blanco.
  const manualRepairTypeNameById = useMemo(() => {
    const index = new Map(repairTypes.map((type) => [type.id, type.name]));
    repairGroupOptions.forEach((group) => {
      group.repairTypes.forEach((type) => {
        if (!index.has(type.id) && type.name) index.set(type.id, type.name);
      });
    });
    return index;
  }, [repairTypes, repairGroupOptions]);

  // Paso 4: Selección de supervisor
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  // Nuevo: Estado para indicar si el usuario actual es el supervisor
  const [isCurrentUserSupervisor, setIsCurrentUserSupervisor] = useState<boolean | null>(
    skipSupervisorQuestion ? false : null
  );

  // Equipamientos (ticket 596). Solo se piden al elegir ese camino.
  const {
    data: otherEquipment = [],
    isLoading: isLoadingOtherEquipment,
    isError: hasOtherEquipmentError,
    refetch: refetchOtherEquipment,
  } = useQuery({
    queryKey: ['other-equipment-basic'],
    queryFn: () => fetchAllOtherEquipmentBasicData(),
    enabled: isOtherEquipment,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Lista normalizada de recursos elegibles.
   *
   * Vehículos y equipamientos se identifican distinto (dominio vs número de
   * serie) y se miden distinto (kilometraje vs solo horómetro). Normalizarlos
   * acá evita repetir ese condicional en el selector, en la tarjeta de resumen
   * y en los campos de medición.
   */
  const resourceOptions = useMemo(() => {
    if (isOtherEquipment) {
      return otherEquipment.map((e) => ({
        id: e.id,
        label: e.serial_number || e.intern_number || 'Sin identificar',
        internNumber: e.intern_number,
        typeName: e.type_name,
        subTypeName: e.sub_type_name,
        unitTypeName: null as string | null,
        condition: e.condition,
        kilometer: null as string | null,
        engineHours: e.engine_hours,
      }));
    }
    return (equipment ?? []).map((e) => ({
      id: e.id,
      label: e.domain || e.serie || 'Sin identificar',
      internNumber: e.intern_number,
      typeName: e.type_name,
      subTypeName: e.sub_type_name,
      unitTypeName: e.types_of_vehicles?.name ?? null,
      condition: e.condition,
      kilometer: e.kilometer,
      engineHours: e.engine_hours,
    }));
  }, [isOtherEquipment, otherEquipment, equipment]);

  // Recurso seleccionado
  const selectedEquipment = useMemo(
    () => resourceOptions.find((e) => e.id === selectedEquipmentId),
    [resourceOptions, selectedEquipmentId]
  );

  // Filtrar por búsqueda (identificador o número interno)
  const filteredEquipment = useMemo(() => {
    if (!searchTerm) return resourceOptions.slice(0, 50);
    const searchValue = searchTerm.toLowerCase();
    return resourceOptions.filter(
      (equip) =>
        equip.label.toLowerCase().includes(searchValue) ||
        String(equip.internNumber || '')
          .toLowerCase()
          .includes(searchValue)
    );
  }, [resourceOptions, searchTerm]);

  // ============================================
  // STEPS DINÁMICOS según requestType
  // ============================================
  type StepKey = 'resource' | 'equipment' | 'type' | 'items' | 'supervisor' | 'confirm';

  // El paso 'resource' (ticket 596) define qué se lista en el paso siguiente.
  // El paso 'type' ya no se llama "Checklist": desde el ticket 592 también permite
  // mantenimiento preventivo y carga manual.
  const CHECKLIST_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
    { key: 'resource', title: 'Recurso', icon: Boxes },
    { key: 'equipment', title: 'Equipo', icon: Truck },
    { key: 'type', title: 'Tipo', icon: ClipboardList },
    { key: 'items', title: 'Items', icon: AlertTriangle },
    { key: 'supervisor', title: 'Supervisor', icon: User },
    { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
  ];

  const PREVENTIVE_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
    { key: 'resource', title: 'Recurso', icon: Boxes },
    { key: 'equipment', title: 'Equipo', icon: Truck },
    { key: 'type', title: 'Preventivo', icon: Wrench },
    { key: 'supervisor', title: 'Supervisor', icon: User },
    { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
  ];

  const MANUAL_STEPS: { key: StepKey; title: string; icon: typeof Truck }[] = [
    { key: 'resource', title: 'Recurso', icon: Boxes },
    { key: 'equipment', title: 'Equipo', icon: Truck },
    { key: 'type', title: 'Tipo', icon: ClipboardList },
    { key: 'items', title: 'Reparaciones', icon: Wrench },
    { key: 'supervisor', title: 'Supervisor', icon: User },
    { key: 'confirm', title: 'Confirmar', icon: CheckCircle },
  ];

  const allSteps =
    requestType === 'preventive' ? PREVENTIVE_STEPS : requestType === 'manual' ? MANUAL_STEPS : CHECKLIST_STEPS;

  // Con el equipo ya fijado por prop (flujo QR: se escanea el equipo y se entra
  // directo), preguntar de qué tipo de recurso se trata no aporta nada — la
  // respuesta ya está implícita. Ese paso se omite.
  const steps = useMemo(
    () => (default_equipment_id ? allSteps.filter((s) => s.key !== 'resource') : allSteps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [default_equipment_id, requestType]
  );
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
  /**
   * Avanza de paso guardando primero lo que quedo escrito en el formulario de
   * reparaciones. Antes, si el usuario escribia una reparacion y tocaba Siguiente
   * sin "Agregar reparacion", se perdia sin aviso.
   */
  const handleAdvanceStep = useCallback(() => {
    if (requestType === 'manual' && currentStepKey === 'items') {
      const result = manualRepairsRef.current?.commitPendingDraft();
      if (result === 'added') {
        toast.info('Se agregó la reparación que habías escrito');
      }
    }
    setCurrentStep((prev) => prev + 1);
  }, [requestType, currentStepKey]);

  const handleSelectEquipment = useCallback(
    (equipId: string) => {
      // Se busca en la lista normalizada, no en `equipment`: esta última solo
      // tiene vehículos y dejaría sin efecto la selección de un equipamiento.
      const equip = resourceOptions.find((e) => e.id === equipId);
      if (equip) {
        setSelectedEquipmentId(equip.id);
        setKilometer(equip.kilometer || '');
        setEngineHours(equip.engineHours || '');
        // Reset estados posteriores
        setSelectedTemplateId('');
        setSelectedDeviations([]);
        setDeviationComments({});
        setManualItems([]);
        setManualRepairs([]);
        setSelectedSupervisorId('');
      }
      setEquipmentOpen(false);
    },
    [resourceOptions]
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

  /**
   * Cambia entre equipo y equipamiento (ticket 596).
   *
   * Descarta la selección de recurso: el equipo elegido no existe en la otra
   * lista, así que arrastrarlo dejaría el wizard en un estado inconsistente.
   * Y si el camino era "Checklist" —que los equipamientos no tienen— se mueve
   * la selección a una opción válida, para que el radiogroup nunca quede
   * anclado en una tarjeta bloqueada.
   */
  const handleChangeResourceKind = useCallback((kind: MaintenanceResourceKind) => {
    setResourceKind((current) => {
      if (current === kind) return current;
      setSelectedEquipmentId('');
      setKilometer('');
      setEngineHours('');
      setSearchTerm('');
      setSelectedTemplateId('');
      setSelectedDeviations([]);
      setDeviationComments({});
      setManualItems([]);
      if (kind === 'other_equipment') {
        setRequestType((type) => (type === 'checklist' ? 'manual' : type));
      }
      return kind;
    });
  }, []);

  const handleChangeRequestType = useCallback(
    (type: RequestType) => {
      if (type === requestType) return;
      setRequestType(type);
      setSelectedTemplateId('');
      setSelectedPreventiveType('');
      setPreventiveDescription('');
      setSelectedDeviations([]);
      setDeviationComments({});
      setManualItems([]);
      setManualRepairs([]);
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
    if (requestType === 'manual' && manualRepairs.length === 0) {
      toast.error('Debes agregar al menos una reparación');
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
      if (requestType === 'manual') {
        // CARGA MANUAL: mismo criterio que los demás caminos — si quien carga es
        // el supervisor, el pedido queda aprobado; si no, va a validación.
        const repairs = await Promise.all(
          manualRepairs.map(async (repair) => ({
            repairTypeId: repair.repairTypeId,
            freeText: repair.freeText,
            description: repair.description,
            images: await uploadRepairImages(repair.images, selectedEquipmentId),
          }))
        );

        await createManualMaintenanceRequest({
          equipmentId: selectedEquipmentId,
          resourceKind,
          supervisorId,
          kilometer: kilometer || undefined,
          engine_hours: engineHours || undefined,
          driverEmployeeId: driverEmployeeId || undefined,
          autoApprove: isCurrentUserSupervisor === true,
          repairs,
        });

        const noun = repairs.length === 1 ? '1 reparación' : `${repairs.length} reparaciones`;
        toast.success(isCurrentUserSupervisor ? `Pedido creado con ${noun}` : `Solicitud creada con ${noun}`);
        invalidateAllMaintenanceQueries(queryClient);
      } else if (isCurrentUserSupervisor) {
        // FLUJO 1: Usuario ES el supervisor → crear pedido directamente (aprobado automáticamente)
        if (requestType === 'preventive') {
          await createMaintenanceOrderFromDeviations({
            equipmentId: selectedEquipmentId,
            resourceKind,
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
            resourceKind,
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
            resourceKind,
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
            resourceKind,
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
      // Un "failed to fetch" generico no le dice al usuario que reintentar. Las
      // fotos se suben al storage ANTES de crear el pedido, asi que separar los dos
      // casos evita que vuelva a cargar todo el formulario cuando solo fallo la red
      // subiendo una imagen.
      const message = error instanceof Error ? error.message : '';
      if (message.includes('imagen')) {
        toast.error(message, { description: 'El pedido no se creó. Revisá la conexión y probá de nuevo.' });
      } else if (/fetch|network|NetworkError/i.test(message)) {
        toast.error('Se perdió la conexión al crear el pedido', {
          description: 'No se guardó nada. Verificá la conexión y volvé a intentar.',
        });
      } else {
        toast.error('Error al crear el pedido de mantenimiento');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // VALIDACIONES DE PASOS
  // ============================================
  const canAdvanceStep = useMemo(() => {
    switch (currentStepKey) {
      case 'resource':
        // Siempre hay uno elegido (vehículo por defecto): el paso informa, no bloquea
        return true;
      case 'equipment':
        return !!selectedEquipmentId;
      case 'type':
        if (requestType === 'checklist') return !!selectedTemplateId;
        // La carga manual no elige nada en este paso: se avanza directo a cargar reparaciones
        if (requestType === 'manual') return true;
        return !!selectedPreventiveType;
      case 'items':
        if (requestType === 'manual') return manualRepairs.length > 0 || hasPendingManualDraft;
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
    hasPendingManualDraft,
    selectedEquipmentId,
    selectedTemplateId,
    selectedPreventiveType,
    selectedDeviations,
    manualItems,
    manualRepairs,
    selectedSupervisorId,
    isCurrentUserSupervisor,
  ]);

  // ============================================
  // RENDER STEPS
  // ============================================
  /**
   * Paso "Recurso" (ticket 596): define si el pedido es para un equipo o para un
   * equipamiento — y con eso, qué lista el selector del paso siguiente.
   *
   * Las dos palabras son casi homógrafas y no se distinguen solas: cada opción
   * lleva una línea con ejemplos concretos, que es lo que hace elegible la tarjeta.
   */
  const renderStepResource = () => (
    <div className="space-y-4">
      <div>
        <h3 id="resource-kind-label" className="text-base font-medium text-balance">
          ¿Para qué es el pedido?
        </h3>
        <p className="text-sm text-muted-foreground text-pretty">
          Define qué equipos vas a poder elegir en el paso siguiente.
        </p>
      </div>

      <div role="radiogroup" aria-labelledby="resource-kind-label" className="grid gap-3 sm:grid-cols-2 max-w-2xl">
        <ResourceKindCard
          kind="vehicle"
          icon={Truck}
          title="Equipos"
          description="Vehículos con dominio y kilometraje."
          selected={!isOtherEquipment}
          onSelect={handleChangeResourceKind}
        />
        <ResourceKindCard
          kind="other_equipment"
          icon={Boxes}
          title="Equipamientos"
          description="Contenedores, piletas, trailers. Sin dominio, se miden con horómetro."
          selected={isOtherEquipment}
          onSelect={handleChangeResourceKind}
        />
      </div>
    </div>
  );

  const renderStep0Equipment = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label id="resource-select-label">
          {isOtherEquipment ? 'Seleccioná el equipamiento' : 'Seleccioná el equipo'}
        </Label>
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
              aria-labelledby="resource-select-label"
              aria-busy={isOtherEquipment && isLoadingOtherEquipment}
              disabled={!!default_equipment_id || (isOtherEquipment && isLoadingOtherEquipment)}
              className={cn('w-full justify-between', !selectedEquipmentId && 'text-muted-foreground')}
            >
              <span className="truncate">
                {isOtherEquipment && isLoadingOtherEquipment
                  ? 'Cargando equipamientos…'
                  : selectedEquipment
                    ? `${selectedEquipment.label}${selectedEquipment.internNumber ? ` (Nº${selectedEquipment.internNumber})` : ''}`
                    : isOtherEquipment
                      ? 'Seleccioná un equipamiento'
                      : 'Seleccioná un equipo'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          {/* w-[var(--radix-popover-trigger-width)] hace que el desplegable ocupe el mismo
              ancho que el campo, para que la info del equipo entre a lo largo */}
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={isOtherEquipment ? 'Buscar por serie o número…' : 'Buscar por dominio, serie o número…'}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>
                  {isOtherEquipment ? 'No se encontró el equipamiento' : 'No se encontró el equipo'}
                </CommandEmpty>
                <CommandGroup>
                  {filteredEquipment.map((equip) => (
                    <CommandItem key={equip.id} value={equip.label} onSelect={() => handleSelectEquipment(equip.id)}>
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          equip.id === selectedEquipmentId ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                        <span className="shrink-0 font-medium tabular-nums">
                          {equip.label}
                          {equip.internNumber && ` (Nº${equip.internNumber})`}
                        </span>
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {[
                            equip.typeName,
                            equip.subTypeName,
                            equip.unitTypeName,
                            // La condicion viene como valor de enum (`en_preparacion`):
                            // se muestra con su etiqueta legible.
                            equip.condition ? conditionLabels[equip.condition] ?? equip.condition : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* La carga puede fallar: sin esta rama el combobox vacío diría "no se
            encontró", afirmando que no hay equipamientos cuando en realidad no
            se pudieron traer. */}
        {isOtherEquipment && hasOtherEquipmentError && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            No se pudieron cargar los equipamientos.
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => refetchOtherEquipment()}
            >
              Reintentar
            </Button>
          </p>
        )}
      </div>

      {/* Los equipamientos no llevan kilometraje: solo se mide su horómetro */}
      {selectedEquipment && (
        <div className={cn('grid gap-4', isOtherEquipment ? 'grid-cols-1 sm:max-w-xs' : 'grid-cols-2')}>
          {!isOtherEquipment && (
            <div className="space-y-2">
              <Label htmlFor="kilometer">Kilometraje actual</Label>
              <Input
                id="kilometer"
                type="number"
                value={kilometer}
                onChange={(e) => setKilometer(e.target.value)}
                placeholder="0"
                min={Number(selectedEquipment.kilometer) || 0}
                className="tabular-nums"
              />
              {selectedEquipment.kilometer && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  Último registrado: {selectedEquipment.kilometer} km
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="engineHours">Horómetro</Label>
            <Input
              id="engineHours"
              type="number"
              value={engineHours}
              onChange={(e) => setEngineHours(e.target.value)}
              placeholder="0"
              min={Number(selectedEquipment.engineHours) || 0}
              className="tabular-nums"
            />
            {/* null no es 0: sin lectura previa se dice que no hay, no se inventa un cero */}
            <p className="text-xs text-muted-foreground tabular-nums">
              {selectedEquipment.engineHours
                ? `Último registrado: ${selectedEquipment.engineHours} hs`
                : 'Sin registro previo'}
            </p>
          </div>
        </div>
      )}

      {selectedEquipment && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {isOtherEquipment ? 'Equipamiento seleccionado' : 'Equipo seleccionado'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-sm text-muted-foreground">Identificación:</span>
              <span className="min-w-0 truncate font-medium">{selectedEquipment.label}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-sm text-muted-foreground">Tipo:</span>
              <span className="min-w-0 truncate">
                {[selectedEquipment.typeName, selectedEquipment.subTypeName].filter(Boolean).join(' · ') || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-sm text-muted-foreground">Condición:</span>
              {selectedEquipment.condition ? (
                <Badge variant={selectedEquipment.condition === 'operativo' ? 'success' : 'destructive'}>
                  {conditionLabels[selectedEquipment.condition] ?? selectedEquipment.condition}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Sin datos</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep1Type = () => (
    <div className="space-y-4">
      <div>
        <Label id="request-type-label" className="text-base font-medium">
          Tipo de pedido
        </Label>
        <div
          role="radiogroup"
          aria-labelledby="request-type-label"
          className="grid gap-3 mt-2 sm:grid-cols-3 items-stretch"
        >
          <RequestTypeCard
            type="checklist"
            icon={ClipboardList}
            title="Checklist"
            description="Desde desvíos de inspección"
            selected={requestType === 'checklist'}
            onSelect={handleChangeRequestType}
            disabledReason={
              isOtherEquipment
                ? 'No hay checklists configurados para equipamientos. Elegí Mant. Preventivo o Carga Manual.'
                : undefined
            }
          />
          <RequestTypeCard
            type="preventive"
            icon={Wrench}
            title="Mant. Preventivo"
            description="Programa planificado de mantenimiento"
            selected={requestType === 'preventive'}
            onSelect={handleChangeRequestType}
          />
          <RequestTypeCard
            type="manual"
            icon={PencilLine}
            title="Carga Manual"
            description="Cargá las reparaciones sin pasar por un checklist"
            selected={requestType === 'manual'}
            onSelect={handleChangeRequestType}
          />
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
      ) : requestType === 'preventive' ? (
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
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            En el paso siguiente vas a cargar directamente las reparaciones que necesita el equipo, sin partir de un
            checklist.
          </p>
        </div>
      )}
    </div>
  );

  /**
   * Paso de items para la carga manual: se cargan las reparaciones directamente,
   * eligiendo una tarea del sistema o escribiéndola a mano, con fotos opcionales.
   */
  const renderStep2ManualRepairs = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {/* Encabezado de sección: no es un <Label> porque no rotula ningún control */}
        <h3 className="text-sm leading-none font-medium">Cargá las reparaciones que necesita el equipo</h3>
        <Badge variant="secondary" className="shrink-0">
          <span className="tabular-nums">{manualRepairs.length}</span>{' '}
          {manualRepairs.length === 1 ? 'reparación' : 'reparaciones'}
        </Badge>
      </div>

      <ManualRepairsInput
        repairs={manualRepairs}
        onChange={setManualRepairs}
        ref={manualRepairsRef}
        onPendingDraftChange={setHasPendingManualDraft}
        repairTypes={repairTypes}
        isLoadingRepairTypes={isLoadingRepairTypes}
        hasRepairTypesError={hasRepairTypesError}
        onRetryRepairTypes={handleRetryRepairTypes}
        groups={repairGroupOptions}
        isLoadingGroups={isLoadingGroups}
        hasGroupsError={hasGroupsError}
        onRetryGroups={handleRetryGroups}
        disabled={isSubmitting}
      />
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
            <CardTitle className="text-sm">{isOtherEquipment ? 'Equipamiento' : 'Equipo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{selectedEquipment?.label}</p>
            <p className="text-sm text-muted-foreground">
              {[selectedEquipment?.typeName, selectedEquipment?.subTypeName].filter(Boolean).join(' · ')}
            </p>
            {!isOtherEquipment && kilometer && <p className="text-sm tabular-nums">Kilometraje: {kilometer} km</p>}
            {engineHours && <p className="text-sm tabular-nums">Horómetro: {engineHours} hs</p>}
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
        ) : requestType === 'manual' ? (
          /* Carga manual: no hay desvíos de checklist, lo que se confirma son las
             reparaciones que escribió el supervisor. */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reparaciones ({manualRepairs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {manualRepairs.map((repair) => {
                  const repairTypeName = repair.repairTypeId
                    ? manualRepairTypeNameById.get(repair.repairTypeId) ?? null
                    : null;
                  return (
                    <li key={repair.localId} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <div>
                        <span className="font-medium">{repairTypeName ?? repair.freeText}</span>
                        {repair.images.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {repair.images.length} {repair.images.length === 1 ? 'foto' : 'fotos'}
                          </Badge>
                        )}
                        {repair.description.trim() && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            &quot;{repair.description.trim()}&quot;
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
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
      case 'resource':
        return renderStepResource();
      case 'equipment':
        return renderStep0Equipment();
      case 'type':
        return renderStep1Type();
      case 'items':
        return requestType === 'manual' ? renderStep2ManualRepairs() : renderStep2Items();
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
            <Button onClick={handleAdvanceStep} disabled={!canAdvanceStep}>
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
