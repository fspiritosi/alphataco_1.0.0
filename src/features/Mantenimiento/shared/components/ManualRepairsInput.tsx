'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { MAX_REPAIR_IMAGE_SIZE } from '@/features/Mantenimiento/shared/utils/uploadRepairImages';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  ImagePlus,
  Loader2,
  Package,
  PencilLine,
  Plus,
  Wrench,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

/** Máximo de fotos por reparación — mismo límite que el formulario anterior del sistema */
export const MAX_IMAGES_PER_REPAIR = 3;

/** Anillo de foco compartido por los botones custom (no usan el primitivo Button) */
const FOCUS_RING = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring';

export type RepairTypeOption = {
  id: string;
  name: string | null;
};

/**
 * Grupo de reparación ya expandido a sus tareas.
 *
 * El componente recibe los nombres resueltos (y no solo los ids) para poder
 * mostrar la vista previa del grupo aunque el listado general de reparaciones
 * todavía no haya cargado o haya fallado.
 */
export type RepairGroupOption = {
  id: string;
  name: string;
  description: string | null;
  repairTypes: RepairTypeOption[];
};

/**
 * Una reparación cargada a mano. Puede venir de un tipo del sistema
 * (`repairTypeId`) o ser texto libre (`freeText`) cuando el solicitante no
 * encuentra el ítem que necesita.
 */
export type ManualRepair = {
  /** ID local, solo para React key / remove. No se persiste */
  localId: string;
  repairTypeId: string | null;
  freeText: string | null;
  description: string;
  /** Archivos elegidos; se suben al confirmar el pedido */
  images: File[];
};

/**
 * API imperativa para el paso que contiene este input.
 *
 * El borrador (tarea elegida, texto libre, descripcion, fotos) vive dentro de este
 * componente, asi que el wizard no puede saber si quedo algo escrito sin agregar.
 * Al avanzar de paso llama a `commitPendingDraft()`: si hay un borrador valido lo
 * agrega solo — antes se descartaba en silencio y el usuario perdia la reparacion.
 */
export type ManualRepairsInputHandle = {
  /** 'added' si habia borrador y se agrego; 'empty' si no habia nada pendiente */
  commitPendingDraft: () => 'added' | 'empty';
};

type ManualRepairsInputProps = {
  repairs: ManualRepair[];
  onChange: (next: ManualRepair[]) => void;
  repairTypes: RepairTypeOption[];
  isLoadingRepairTypes?: boolean;
  /** La carga de tipos falló: el combobox no sirve, pero el texto libre sigue disponible */
  hasRepairTypesError?: boolean;
  onRetryRepairTypes?: () => void;
  /** Grupos de reparación disponibles. Si no se pasan, el camino del grupo no se muestra */
  groups?: RepairGroupOption[];
  isLoadingGroups?: boolean;
  /** La carga de grupos falló: los otros dos caminos siguen disponibles */
  hasGroupsError?: boolean;
  onRetryGroups?: () => void;
  disabled?: boolean;
  /**
   * Avisa si hay un borrador cargado sin agregar. El paso lo necesita para
   * habilitar "Siguiente": con el boton deshabilitado el usuario no puede avanzar
   * y su reparacion escrita queda en un limbo, sin forma de guardarla salvo
   * descubriendo el boton "Agregar reparacion".
   */
  onPendingDraftChange?: (hasPendingDraft: boolean) => void;
  ref?: React.Ref<ManualRepairsInputHandle>;
};

function newLocalId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export const ManualRepairsInput = memo(function ManualRepairsInput({
  repairs,
  onChange,
  repairTypes,
  isLoadingRepairTypes = false,
  hasRepairTypesError = false,
  onRetryRepairTypes,
  groups = [],
  isLoadingGroups = false,
  hasGroupsError = false,
  onRetryGroups,
  disabled = false,
  onPendingDraftChange,
  ref,
}: ManualRepairsInputProps) {
  // Borrador de la reparación que se está armando
  const [repairTypeId, setRepairTypeId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [typesOpen, setTypesOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IDs únicos por instancia: el componente podría montarse más de una vez por página
  const fieldId = useId();
  const typeLabelId = `${fieldId}-type-label`;
  const typeTriggerId = `${fieldId}-type-trigger`;
  const typeErrorId = `${fieldId}-type-error`;
  const groupLabelId = `${fieldId}-group-label`;
  const groupTriggerId = `${fieldId}-group-trigger`;
  const groupHintId = `${fieldId}-group-hint`;
  const groupErrorId = `${fieldId}-group-error`;
  const freeTextId = `${fieldId}-free-text`;
  const freeTextHintId = `${fieldId}-free-text-hint`;
  const descriptionId = `${fieldId}-description`;
  const photosLabelId = `${fieldId}-photos-label`;
  const photosHintId = `${fieldId}-photos-hint`;
  const addHintId = `${fieldId}-add-hint`;

  const selectedType = useMemo(
    () => repairTypes.find((t) => t.id === repairTypeId) ?? null,
    [repairTypes, repairTypeId]
  );

  // Previews de las fotos del borrador. `URL.createObjectURL` reserva memoria del
  // documento hasta que se la revoca: se crea una sola vez por lista de archivos y
  // se libera al cambiar la lista o al desmontar. Llamarlo en el render filtraba un
  // blob por foto en cada tecleo del formulario.
  const imagePreviews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const trimmedFreeText = freeText.trim();
  const canAdd = !disabled && (!!repairTypeId || trimmedFreeText.length > 0);
  // Si el consumidor no pasa grupos, ese camino directamente no se dibuja: el
  // formulario queda igual que antes en vez de mostrar un selector vacío.
  const showGroupsPath = isLoadingGroups || hasGroupsError || groups.length > 0;
  const reachedImageLimit = images.length >= MAX_IMAGES_PER_REPAIR;

  const resetDraft = useCallback(() => {
    setRepairTypeId(null);
    setFreeText('');
    setDescription('');
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleAdd = useCallback(() => {
    if (!canAdd) return;
    onChange([
      ...repairs,
      {
        localId: newLocalId(),
        repairTypeId,
        freeText: repairTypeId ? null : trimmedFreeText,
        description: description.trim(),
        images,
      },
    ]);
    resetDraft();
  }, [canAdd, onChange, repairs, repairTypeId, trimmedFreeText, description, images, resetDraft]);

  useEffect(() => {
    onPendingDraftChange?.(canAdd);
  }, [canAdd, onPendingDraftChange]);

  // El wizard llama a esto al avanzar de paso para no perder lo que quedo escrito.
  useImperativeHandle(
    ref,
    () => ({
      commitPendingDraft: () => {
        if (!canAdd) return 'empty';
        handleAdd();
        return 'added';
      },
    }),
    [canAdd, handleAdd]
  );

  const handleRemove = useCallback(
    (localId: string) => {
      if (disabled) return;
      onChange(repairs.filter((r) => r.localId !== localId));
    },
    [disabled, onChange, repairs]
  );

  const handleSelectType = useCallback((id: string) => {
    setRepairTypeId((current) => (current === id ? null : id));
    // Elegir un tipo del sistema descarta el texto libre: son excluyentes
    setFreeText('');
    setTypesOpen(false);
  }, []);

  /**
   * Expande un grupo: cada tarea entra como una reparación independiente para que
   * el solicitante pueda quitar las que no apliquen a este pedido en particular.
   * No pasa por el borrador (no hay una descripción ni fotos comunes a todo el
   * grupo), por eso se agrega directo a la lista.
   */
  const handleSelectGroup = useCallback(
    (groupId: string) => {
      setGroupsOpen(false);
      if (disabled) return;

      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // Un grupo sin tareas no puede fallar en silencio: el usuario creería que
      // cargó el service completo y mandaría el pedido vacío.
      if (group.repairTypes.length === 0) {
        toast.warning(`El grupo "${group.name}" no tiene reparaciones cargadas`);
        return;
      }

      const alreadyAdded = new Set(repairs.map((r) => r.repairTypeId).filter((id): id is string => id !== null));
      const missing = group.repairTypes.filter((type) => !alreadyAdded.has(type.id));

      if (missing.length === 0) {
        toast.info(`Las reparaciones del grupo "${group.name}" ya están en la lista`);
        return;
      }

      onChange([
        ...repairs,
        ...missing.map((type) => ({
          localId: newLocalId(),
          repairTypeId: type.id,
          freeText: null,
          description: '',
          images: [] as File[],
        })),
      ]);

      const skipped = group.repairTypes.length - missing.length;
      toast.success(
        `Se agregaron ${missing.length} ${missing.length === 1 ? 'reparación' : 'reparaciones'} del grupo "${group.name}"` +
          (skipped > 0 ? ` (${skipped} ya estaban en la lista)` : '')
      );
    },
    [disabled, groups, onChange, repairs]
  );

  const handlePickImages = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList);

    // El peso se valida acá y no al enviar: avisarle recién al final del wizard
    // que una foto no entraba obligaría a rehacer el camino.
    const tooBig = picked.filter((file) => file.size > MAX_REPAIR_IMAGE_SIZE);
    const accepted = picked.filter((file) => file.size <= MAX_REPAIR_IMAGE_SIZE);

    if (tooBig.length > 0) {
      toast.error(
        tooBig.length === 1
          ? `"${tooBig[0].name}" supera los 10 MB y no se agregó`
          : `${tooBig.length} imágenes superan los 10 MB y no se agregaron`
      );
    }

    setImages((current) => {
      const room = MAX_IMAGES_PER_REPAIR - current.length;
      const discarded = accepted.length - room;
      // Nunca descartar en silencio: si el usuario eligió 5 fotos, tiene que
      // enterarse de que solo entraron las primeras.
      if (discarded > 0) {
        toast.warning(
          discarded === 1
            ? 'Se agregó solo 1 foto: el máximo es 3 por reparación'
            : `Se descartaron ${discarded} fotos: el máximo es 3 por reparación`
        );
      }
      return [...current, ...accepted].slice(0, MAX_IMAGES_PER_REPAIR);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
  }, []);

  // Índice por id: la lista de reparaciones hace un lookup por fila y `repairTypes`
  // puede tener cientos de entradas.
  // Se suman los tipos que llegan dentro de los grupos: si el listado general falla
  // pero los grupos cargan, las tareas agregadas igual muestran su nombre.
  const repairTypeNameById = useMemo(() => {
    const index = new Map(repairTypes.map((type) => [type.id, type.name]));
    groups.forEach((group) => {
      group.repairTypes.forEach((type) => {
        if (!index.has(type.id)) index.set(type.id, type.name);
      });
    });
    return index;
  }, [repairTypes, groups]);

  const repairLabel = useCallback(
    (repair: ManualRepair) =>
      (repair.repairTypeId ? repairTypeNameById.get(repair.repairTypeId) : null) ?? repair.freeText ?? '',
    [repairTypeNameById]
  );

  return (
    <div className="space-y-4">
      {/* ── Reparaciones ya agregadas ─────────────────────────────────────── */}
      {/* role="list" explícito: el reset de Tailwind quita los bullets y con eso
          VoiceOver deja de anunciar la lista */}
      {repairs.length > 0 && (
        <ul role="list" className="flex flex-col divide-y rounded-md border">
          {repairs.map((repair) => (
            <li key={repair.localId} className="flex items-start gap-3 px-3 py-2.5">
              {repair.repairTypeId ? (
                <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium break-words">{repairLabel(repair)}</span>
                  {!repair.repairTypeId && (
                    <Badge variant="secondary" className="text-xs">
                      Nuevo ítem
                    </Badge>
                  )}
                  {repair.images.length > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ImagePlus className="h-3 w-3" />
                      <span className="tabular-nums">{repair.images.length}</span>
                      <span className="sr-only">{repair.images.length === 1 ? 'foto adjunta' : 'fotos adjuntas'}</span>
                    </Badge>
                  )}
                </div>
                {repair.description && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{repair.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(repair.localId)}
                disabled={disabled}
                aria-label={`Quitar reparación ${repairLabel(repair)}`}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent',
                  'text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
                  FOCUS_RING,
                  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Alta de una reparación ────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Agregar reparación</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4 pt-0">
          {/* ── Camino 1: grupo de reparaciones ─────────────────────────────
              Atajo para pedidos largos: el supervisor elige "Service de motor"
              y el sistema expande todas las tareas que lo componen. */}
          {showGroupsPath && (
            <>
              <div className="space-y-2 rounded-md border border-dashed bg-muted/40 p-3">
                <Label id={groupLabelId}>Grupo de reparaciones</Label>
                <Popover open={groupsOpen} onOpenChange={setGroupsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id={groupTriggerId}
                      type="button"
                      variant="outline"
                      role="combobox"
                      // Igual que el combobox de tareas: el nombre accesible se arma
                      // con el label del campo más el contenido del botón.
                      aria-labelledby={`${groupLabelId} ${groupTriggerId}`}
                      aria-busy={isLoadingGroups || undefined}
                      aria-describedby={hasGroupsError ? groupErrorId : groupHintId}
                      disabled={disabled || isLoadingGroups || hasGroupsError}
                      className="w-full justify-between bg-background text-muted-foreground"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isLoadingGroups ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <Package className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">
                          {isLoadingGroups
                            ? 'Cargando grupos...'
                            : hasGroupsError
                              ? 'No se pudieron cargar los grupos'
                              : 'Buscá y elegí un grupo'}
                        </span>
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar grupo..." />
                      <CommandList>
                        <CommandEmpty>No se encontró el grupo</CommandEmpty>
                        <CommandGroup>
                          {groups.map((group) => {
                            const previewNames = group.repairTypes
                              .map((type) => type.name)
                              .filter((name): name is string => !!name);

                            return (
                              <CommandItem
                                key={group.id}
                                // Se busca por nombre del grupo y por el de sus tareas:
                                // el supervisor suele acordarse de una de las tareas,
                                // no del nombre exacto del grupo.
                                value={`${group.name} ${previewNames.join(' ')}`}
                                onSelect={() => handleSelectGroup(group.id)}
                                className="flex flex-col items-start gap-1 py-2.5"
                              >
                                <div className="flex w-full items-center gap-2">
                                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate font-medium">{group.name}</span>
                                  <Badge variant="secondary" className="ml-auto shrink-0 tabular-nums">
                                    {group.repairTypes.length}
                                  </Badge>
                                </div>
                                {previewNames.length > 0 && (
                                  <p className="ml-6 text-xs text-muted-foreground">
                                    {previewNames.slice(0, 3).join(', ')}
                                    {previewNames.length > 3 && ` +${previewNames.length - 3} más`}
                                  </p>
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {hasGroupsError ? (
                  <div
                    id={groupErrorId}
                    role="alert"
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-destructive"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>No se pudieron cargar los grupos. Podés cargar las reparaciones de a una.</span>
                    {onRetryGroups && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={onRetryGroups}
                        disabled={disabled}
                        className="h-auto p-0 text-xs text-destructive underline"
                      >
                        Reintentar
                      </Button>
                    )}
                  </div>
                ) : (
                  <p id={groupHintId} className="text-xs text-muted-foreground">
                    Agrega de una vez todas las tareas del grupo (ej: "Service de motor"). Después podés quitar de la
                    lista las que no apliquen.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">o</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {/* ── Camino 2: una tarea del listado, con buscador ───────────────── */}
          <div className="space-y-2">
            <Label id={typeLabelId}>Reparación del listado</Label>
            <Popover open={typesOpen} onOpenChange={setTypesOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={typeTriggerId}
                  type="button"
                  variant="outline"
                  role="combobox"
                  // El Label no puede usar htmlFor contra un botón: el nombre accesible
                  // se arma con el label del campo más el valor elegido.
                  aria-labelledby={`${typeLabelId} ${typeTriggerId}`}
                  aria-busy={isLoadingRepairTypes || undefined}
                  aria-describedby={hasRepairTypesError ? typeErrorId : undefined}
                  disabled={disabled || isLoadingRepairTypes || hasRepairTypesError}
                  className={cn('w-full justify-between', !selectedType && 'text-muted-foreground')}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isLoadingRepairTypes ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <Wrench className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {isLoadingRepairTypes
                        ? 'Cargando tareas...'
                        : hasRepairTypesError
                          ? 'No se pudieron cargar las tareas'
                          : selectedType?.name ?? 'Buscá y elegí una reparación'}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar reparación..." />
                  <CommandList>
                    <CommandEmpty>No se encontró la tarea</CommandEmpty>
                    <CommandGroup>
                      {repairTypes.map((type) => (
                        <CommandItem
                          key={type.id}
                          value={type.name ?? type.id}
                          onSelect={() => handleSelectType(type.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              type.id === repairTypeId ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="truncate">{type.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Error de carga: el listado no sirve, pero el texto libre de abajo sí */}
            {hasRepairTypesError && (
              <div
                id={typeErrorId}
                role="alert"
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-destructive"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>No se pudieron cargar las tareas. Podés escribir la reparación a mano acá abajo.</span>
                {onRetryRepairTypes && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={onRetryRepairTypes}
                    disabled={disabled}
                    className="h-auto p-0 text-xs text-destructive underline"
                  >
                    Reintentar
                  </Button>
                )}
              </div>
            )}

            {/* Listado vacío legítimo: no hay tareas cargadas en el sistema */}
            {!isLoadingRepairTypes && !hasRepairTypesError && repairTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Todavía no hay reparaciones cargadas en el sistema. Escribila acá abajo.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o</span>
            <Separator className="flex-1" />
          </div>

          {/* ── Camino 3: texto libre, para lo que no existe como tipo ─────── */}
          <div className="space-y-2">
            <Label htmlFor={freeTextId}>Escribí la reparación (si no está en el listado)</Label>
            <Textarea
              id={freeTextId}
              aria-describedby={freeTextHintId}
              value={freeText}
              onChange={(e) => {
                setFreeText(e.target.value);
                // Escribir texto libre descarta el tipo elegido: son excluyentes
                if (e.target.value.trim()) setRepairTypeId(null);
              }}
              placeholder="Ej: reparar guardabarros trasero"
              rows={2}
              disabled={disabled}
              className="field-sizing-content max-h-[10rem] min-h-[3.5rem] resize-none"
            />
            <p id={freeTextHintId} className="text-xs text-muted-foreground">
              Usalo si la tarea no está en el listado. Cargá una sola de las dos opciones: al escribir acá se
              deselecciona la tarea de arriba. El taller la va a asociar al tipo que corresponda.
            </p>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Descripción (opcional)</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explicá brevemente la reparación"
              rows={2}
              disabled={disabled}
              className="field-sizing-content max-h-[10rem] min-h-[3.5rem] resize-none"
            />
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label id={photosLabelId}>Fotos (opcional)</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {images.length} de {MAX_IMAGES_PER_REPAIR}
              </span>
            </div>
            <div
              role="group"
              aria-labelledby={photosLabelId}
              aria-describedby={photosHintId}
              className="flex flex-wrap gap-2"
            >
              {images.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative h-20 w-20 overflow-hidden rounded-md border focus-within:ring-[3px] focus-within:ring-ring/50"
                >
                  <Image
                    src={imagePreviews[index]}
                    alt={`Foto ${index + 1} de la reparación: ${file.name}`}
                    fill
                    sizes="80px"
                    unoptimized
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    disabled={disabled}
                    aria-label={`Quitar foto ${index + 1} de ${images.length}`}
                    className={cn(
                      'absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full',
                      'bg-background/90 text-foreground shadow-sm transition-colors',
                      'hover:bg-destructive hover:text-destructive-foreground',
                      FOCUS_RING,
                      'disabled:cursor-not-allowed disabled:opacity-40'
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!reachedImageLimit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  aria-label={`Agregar foto (${images.length} de ${MAX_IMAGES_PER_REPAIR})`}
                  className={cn(
                    'flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed',
                    'text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground',
                    FOCUS_RING,
                    'disabled:cursor-not-allowed disabled:opacity-40'
                  )}
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Agregar</span>
                </button>
              )}
            </div>
            <p id={photosHintId} className="text-xs text-muted-foreground">
              {reachedImageLimit
                ? `Llegaste al máximo de ${MAX_IMAGES_PER_REPAIR} fotos. Quitá una para agregar otra.`
                : `Podés adjuntar hasta ${MAX_IMAGES_PER_REPAIR} fotos de hasta 10 MB cada una.`}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => handlePickImages(e.target.files)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!canAdd && !disabled && (
              <p id={addHintId} className="text-xs text-muted-foreground sm:order-first">
                Elegí una tarea del listado o escribí la reparación para poder agregarla.
              </p>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!canAdd}
              aria-describedby={!canAdd && !disabled ? addHintId : undefined}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar reparación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
