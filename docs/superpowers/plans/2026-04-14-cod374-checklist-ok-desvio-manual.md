# COD-374 — Checklist 100% OK con opción a registrar desvío manual

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NO COMMITS durante la ejecución**: el usuario instruyó explícitamente que no se hagan commits intermedios durante el plan. Completar todas las tasks, verificar end-to-end, y recién entonces el usuario decide cuándo/cómo commitear. Este plan NO incluye pasos de commit.
>
> **Sin tests unitarios**: el proyecto usa Cypress E2E (opcional) y TypeScript strict. La verificación es `npm run check-types` tras cada task + verificación manual en browser al final.

**Goal:** Permitir que, al guardar un checklist 100% OK, el usuario pueda opcionalmente registrar desvíos manuales que generen una `maintenance_request` equivalente a la del flujo de ítems fallidos.

**Architecture:** Branch `failedItems.length === 0` de `NormalizedChecklistForm.onSubmit` dispara un `AlertDialog` (sí/no). Si sí, abre un `Dialog` con selector sección→ítem (reutilizable), supervisor obligatorio, y comentarios por ítem. Al confirmar, una server action dedicada crea `checklist_deviations` vinculados al `checklist_answer_id` + `maintenance_request` (status `pending_approval`) + `maintenance_request_items` en una sola transacción Prisma.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma (PostgreSQL via Supabase), shadcn/ui + Tailwind, react-hook-form + zod, @tanstack/react-query, moment.js, lucide-react, sonner (toasts).

**Spec de referencia:** `docs/superpowers/specs/2026-04-14-cod374-checklist-ok-desvio-manual-design.md`

---

## Estructura de archivos

### Se crean

| Archivo                                                                                         | Responsabilidad                                                                                         |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` (agregar export) | Server action `createManualDeviationsFromChecklist` — crea desvíos + request + items en una transacción |
| `src/features/Mantenimiento/shared/components/ChecklistItemPicker.tsx`                          | Selector sección→ítem reutilizable (Cards con Collapsible + Checkbox + Textarea inline)                 |
| `src/features/Mantenimiento/shared/components/AdditionalDeviationModal.tsx`                     | Dialog principal (picker + supervisor + submit)                                                         |
| `src/features/Mantenimiento/shared/components/AllGoodDeviationPromptDialog.tsx`                 | AlertDialog sí/no previo al modal                                                                       |

### Se modifica

| Archivo                                                           | Cambio                                                                                                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/Formularios/Checklists/NormalizedChecklistForm.tsx` | Reemplazar branch `failedItems.length === 0` (~líneas 1198–1217), agregar 2 `useState`, renderizar los 2 nuevos dialogs, extraer redirect a función local |

### NO se toca

- `CriticalDeviationsRepairModal.tsx` — intacto.
- `createOrUpdateMaintenanceRequest` — intacta.
- `createMaintenanceRequestPendingApproval` — intacta.
- `CreateChecklistAnswer` — intacta.
- `NuevoPedidoChecklistForm.tsx` — intacto.
- Prisma schema — cero migraciones.
- `page.tsx` de las rutas afectadas — intactos.

---

## Task 1: Server action `createManualDeviationsFromChecklist`

**Files:**

- Modify: `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` (agregar al final del archivo)

**Contexto de patrones existentes que se copian:**

- Transacción multi-tabla: ver `createOrUpdateMaintenanceRequest` líneas 662–700 del mismo archivo.
- `requireServerAuthProfile()` para obtener `profile.id`.
- `invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequest)` post-transacción.
- Logger scoped con `serverLogger` (ya existe en el archivo, scope: `'SolicitudesMantenimiento/actionsServer'`).

- [ ] **Step 1: Leer los imports y helpers existentes del archivo**

Run: abrir `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts` y confirmar que están importados: `prisma`, `requireServerAuthProfile`, `invalidateCacheTags`, `INVALIDATION_MAP`, `serverLogger` (o `Logger` con scope local). Si falta alguno, copiar el import del bloque superior del archivo. No cambiar el orden de imports.

- [ ] **Step 2: Agregar la nueva server action al final del archivo**

Agregar este bloque al final de `src/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer.ts`:

```ts
/**
 * Crea desvíos manuales sobre un checklist ya guardado (sin ítems fallidos automáticos)
 * junto con su solicitud de mantenimiento. Todo en una sola transacción.
 *
 * Flujo: checklist_deviations → maintenance_requests → maintenance_request_items.
 * Los desvíos quedan vinculados al checklist_answer_id (a diferencia de los desvíos
 * manuales de NuevoPedido que son huérfanos).
 */
export async function createManualDeviationsFromChecklist(input: {
  checklistAnswerId: string;
  equipmentId: string;
  supervisorId: string;
  driverEmployeeId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
  items: Array<{
    templateItemId: string;
    itemCode: string;
    itemLabel: string;
    sectionCode: string;
    isCritical: boolean;
    comment?: string;
  }>;
}): Promise<{ ok: true; requestId: string; deviationIds: string[] } | { ok: false; error: string }> {
  serverLogger.info('createManualDeviationsFromChecklist - Iniciando', {
    data: {
      checklistAnswerId: input.checklistAnswerId,
      equipmentId: input.equipmentId,
      itemsCount: input.items.length,
    },
  });

  if (input.items.length === 0) {
    return { ok: false, error: 'Debe seleccionar al menos un ítem' };
  }

  try {
    const profile = await requireServerAuthProfile();

    // Validar que el checklist_answer pertenezca al equipo indicado
    const answer = await prisma.checklist_answers.findUnique({
      where: { id: input.checklistAnswerId },
      select: { id: true, equipment_id: true },
    });

    if (!answer || answer.equipment_id !== input.equipmentId) {
      serverLogger.error('checklist_answer invalido o no coincide con equipo', {
        data: { checklistAnswerId: input.checklistAnswerId, equipmentId: input.equipmentId },
      });
      return { ok: false, error: 'Checklist no encontrado o no coincide con el equipo' };
    }

    const userId = input.userId ?? profile.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear los desvíos vinculados al checklist_answer
      const createdDeviations = await Promise.all(
        input.items.map((item) =>
          tx.checklist_deviations.create({
            data: {
              checklist_answer_id: input.checklistAnswerId,
              checklist_template_item_id: item.templateItemId,
              item_code: item.itemCode,
              item_label: item.itemLabel,
              section_code: item.sectionCode,
              is_critical: item.isCritical,
              driver_comment: item.comment?.trim() || null,
              driver_comment_by: item.comment?.trim() ? profile.id : null,
            },
            select: { id: true },
          })
        )
      );

      const deviationIds = createdDeviations.map((d) => d.id);

      // 2. Crear la solicitud de mantenimiento
      const request = await tx.maintenance_requests.create({
        data: {
          checklist_answer_id: input.checklistAnswerId,
          equipment_id: input.equipmentId,
          employee_id: input.employeeId ?? null,
          user_id: userId,
          kilometer: input.kilometer ?? null,
          supervisor_id: input.supervisorId,
          status: 'pending_approval',
          driver_employee_id: input.driverEmployeeId ?? null,
        },
        select: { id: true },
      });

      // 3. Crear los items de la solicitud, vinculados a los desvíos recién creados
      await tx.maintenance_request_items.createMany({
        data: input.items.map((item, idx) => ({
          maintenance_request_id: request.id,
          checklist_deviation_id: deviationIds[idx],
          repair_type_id: null,
          driver_comment: item.comment?.trim() || null,
          driver_comment_by: item.comment?.trim() ? profile.id : null,
          status: 'pending',
        })),
      });

      return { requestId: request.id, deviationIds };
    });

    serverLogger.info('createManualDeviationsFromChecklist - OK', {
      data: { requestId: result.requestId, deviationsCount: result.deviationIds.length },
    });

    await invalidateCacheTags(INVALIDATION_MAP.createMaintenanceRequest);

    return { ok: true, requestId: result.requestId, deviationIds: result.deviationIds };
  } catch (error) {
    serverLogger.error('Error en createManualDeviationsFromChecklist', { data: { error } });
    return { ok: false, error: 'Error inesperado al registrar los desvíos' };
  }
}
```

- [ ] **Step 3: Verificar que los nombres de columna del schema Prisma coincidan**

Antes de avanzar, confirmar en `prisma/schema.prisma` que el modelo `checklist_deviations` tiene estas columnas con estos nombres exactos: `checklist_answer_id`, `checklist_template_item_id`, `item_code`, `item_label`, `section_code`, `is_critical`, `driver_comment`, `driver_comment_by`.

Si alguna columna tiene otro nombre (por ej. `template_item_id` en lugar de `checklist_template_item_id`), ajustar el `data: { ... }` del `tx.checklist_deviations.create` antes de seguir. NO inventar columnas — usar los nombres reales del schema.

Usar `Grep` sobre `prisma/schema.prisma`:

```
Grep: pattern="model checklist_deviations" en prisma/schema.prisma → output_mode=content, -A=30
```

- [ ] **Step 4: Type-check**

Run: `npm run check-types`
Expected: **PASS** sin errores en `actionsServer.ts`.

Si hay errores sobre nombres de columna, ajustar según el schema real. Si el error es sobre `INVALIDATION_MAP.createMaintenanceRequest` no existente, verificar el nombre exacto en `src/shared/constants/cache-invalidation-map.ts` y ajustar.

---

## Task 2: Subcomponente `ChecklistItemPicker`

**Files:**

- Create: `src/features/Mantenimiento/shared/components/ChecklistItemPicker.tsx`

**Contexto de patrones existentes que se copian:**

- Lista de secciones con checkboxes: patrón de `NuevoPedidoChecklistForm.renderStep2Items` (líneas 679–760). Se refactoriza a componente reutilizable (no se modifica NuevoPedido).
- Collapsible: `@/components/ui/collapsible` (shadcn).
- Card: `@/components/ui/card`.
- Badge crítico: `variant="destructive"` + `AlertCircle` de `lucide-react`.

- [ ] **Step 1: Crear el archivo con el componente completo**

Crear `src/features/Mantenimiento/shared/components/ChecklistItemPicker.tsx` con este contenido exacto:

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

export type PickableItem = {
  id: string; // checklist_template_items.id
  code: string;
  label: string;
  is_critical: boolean;
};

export type PickableSection = {
  id: string;
  code: string;
  name: string;
  order_index: number | null;
  items: PickableItem[];
};

export type SelectedItem = {
  templateItemId: string;
  itemCode: string;
  itemLabel: string;
  sectionCode: string;
  isCritical: boolean;
  comment?: string;
};

type ChecklistItemPickerProps = {
  sections: PickableSection[];
  selectedItems: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  disabled?: boolean;
};

export const ChecklistItemPicker = memo(function ChecklistItemPicker({
  sections,
  selectedItems,
  onChange,
  disabled = false,
}: ChecklistItemPickerProps) {
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [sections]
  );

  // Primera sección abierta por defecto
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    sortedSections[0] ? { [sortedSections[0].id]: true } : {}
  );

  const selectedIdSet = useMemo(() => new Set(selectedItems.map((s) => s.templateItemId)), [selectedItems]);

  const handleToggleItem = useCallback(
    (item: PickableItem, sectionCode: string) => {
      if (disabled) return;
      const isSelected = selectedIdSet.has(item.id);
      if (isSelected) {
        onChange(selectedItems.filter((s) => s.templateItemId !== item.id));
      } else {
        onChange([
          ...selectedItems,
          {
            templateItemId: item.id,
            itemCode: item.code,
            itemLabel: item.label,
            sectionCode,
            isCritical: item.is_critical,
            comment: '',
          },
        ]);
      }
    },
    [disabled, onChange, selectedIdSet, selectedItems]
  );

  const handleUpdateComment = useCallback(
    (templateItemId: string, comment: string) => {
      onChange(selectedItems.map((s) => (s.templateItemId === templateItemId ? { ...s, comment } : s)));
    },
    [onChange, selectedItems]
  );

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  if (sortedSections.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay ítems disponibles en el checklist.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sortedSections.map((section) => {
        const sortedItems = [...section.items];
        const selectedCountInSection = sortedItems.filter((i) => selectedIdSet.has(i.id)).length;
        const isOpen = openSections[section.id] ?? false;

        return (
          <Card key={section.id} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                      />
                      <span className="font-medium">{section.name}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedCountInSection}/{sortedItems.length}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="flex flex-col divide-y">
                    {sortedItems.map((item) => {
                      const isSelected = selectedIdSet.has(item.id);
                      const selected = selectedItems.find((s) => s.templateItemId === item.id);
                      return (
                        <div
                          key={item.id}
                          className={cn('flex flex-col gap-2 py-2.5 transition-colors', isSelected && 'bg-accent/20')}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleToggleItem(item, section.code)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                handleToggleItem(item, section.code);
                              }
                            }}
                            className={cn(
                              'flex items-center gap-3 rounded-sm px-1 cursor-pointer',
                              disabled && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={disabled}
                              onCheckedChange={() => handleToggleItem(item, section.code)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Seleccionar ${item.label}`}
                            />
                            <span className="flex-1 text-sm">{item.label}</span>
                            {item.is_critical && (
                              <Badge variant="destructive" className="gap-1 text-[10px] uppercase tracking-wider">
                                <AlertCircle className="h-3 w-3" />
                                Crítico
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <Textarea
                              value={selected?.comment ?? ''}
                              onChange={(e) => handleUpdateComment(item.id, e.target.value)}
                              placeholder="Comentario (opcional)"
                              rows={2}
                              disabled={disabled}
                              className="ml-8 text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
});
```

- [ ] **Step 2: Verificar que `@/components/ui/collapsible` existe**

Run: confirmar que existe `src/components/ui/collapsible.tsx`. Si no existe, instalar con shadcn:

```
npx shadcn@latest add collapsible
```

- [ ] **Step 3: Type-check**

Run: `npm run check-types`
Expected: **PASS** sin errores.

Si hay error por `Checkbox` importado de `@/components/ui/checkbox`, confirmar que el archivo existe; si no, instalar con `npx shadcn@latest add checkbox`.

---

## Task 3: Componente `AdditionalDeviationModal`

**Files:**

- Create: `src/features/Mantenimiento/shared/components/AdditionalDeviationModal.tsx`

**Contexto de patrones existentes que se copian:**

- Combobox de supervisor: `CriticalDeviationsRepairModal.tsx` líneas 76–85 (useQuery con `fetchSupervisorsForChecklist`) y el `Popover + Command` render (a inspeccionar dentro del mismo archivo). Replicar el patrón exactamente.
- `invalidateAllMaintenanceQueries(queryClient)` de `@/features/Mantenimiento/utils/queryInvalidation`.
- `Logger` scoped.
- `submitSuccessRef` para evitar doble redirección (ver `CriticalDeviationsRepairModal` líneas 109, 195, 212–222).

- [ ] **Step 1: Leer el render completo del combobox de supervisor en el modal crítico**

Run: abrir `src/features/Mantenimiento/shared/components/critical-deviations-repair-modal.tsx` y leer desde la línea 230 hasta donde se cierra el `<Popover>` que contiene el combobox. Copiar la estructura exacta (Popover + PopoverTrigger + Button con ChevronsUpDown + Command + CommandInput + CommandList + CommandEmpty + CommandGroup + CommandItem con Check). Esto se replica dentro del nuevo modal.

- [ ] **Step 2: Crear el archivo con el componente completo**

Crear `src/features/Mantenimiento/shared/components/AdditionalDeviationModal.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSupervisorsForChecklist } from '@/features/Checklist/actions/actionsServer';
import { createManualDeviationsFromChecklist } from '@/features/Mantenimiento/SolicitudesMantenimiento/actions/actionsServer';
import { invalidateAllMaintenanceQueries } from '@/features/Mantenimiento/utils/queryInvalidation';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChecklistItemPicker, type PickableSection, type SelectedItem } from './ChecklistItemPicker';

const logger = new Logger('AdditionalDeviationModal');

type AdditionalDeviationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  checklistAnswerId: string;
  equipmentId: string;
  sections: PickableSection[];
  driverEmployeeId?: string;
  employeeId?: string;
  userId?: string;
  kilometer?: string;
};

export function AdditionalDeviationModal({
  isOpen,
  onClose,
  onSuccess,
  checklistAnswerId,
  equipmentId,
  sections,
  driverEmployeeId,
  employeeId,
  userId,
  kilometer,
}: AdditionalDeviationModalProps) {
  const queryClient = useQueryClient();

  const { data: supervisors = [], isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ['supervisors-for-checklist'],
    queryFn: fetchSupervisorsForChecklist,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [openSupervisorSelect, setOpenSupervisorSelect] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitSuccessRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSupervisorId('');
      setSelectedItems([]);
      setIsSubmitting(false);
      submitSuccessRef.current = false;
    }
  }, [isOpen]);

  const supervisorName = useMemo(
    () => supervisors.find((s) => s.id === selectedSupervisorId)?.fullName ?? '',
    [supervisors, selectedSupervisorId]
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedSupervisorId) {
      toast.error('Debes seleccionar un supervisor de turno');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Debes seleccionar al menos un ítem');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createManualDeviationsFromChecklist({
        checklistAnswerId,
        equipmentId,
        supervisorId: selectedSupervisorId,
        driverEmployeeId,
        employeeId,
        userId,
        kilometer,
        items: selectedItems.map((s) => ({
          templateItemId: s.templateItemId,
          itemCode: s.itemCode,
          itemLabel: s.itemLabel,
          sectionCode: s.sectionCode,
          isCritical: s.isCritical,
          comment: s.comment?.trim() || undefined,
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      toast.success('Solicitud de mantenimiento creada', {
        description: `Se registraron ${selectedItems.length} desvío(s) para revisión del supervisor.`,
      });
      invalidateAllMaintenanceQueries(queryClient);

      submitSuccessRef.current = true;
      setSelectedSupervisorId('');
      setSelectedItems([]);
      setIsSubmitting(false);
      onSuccess();
    } catch (error) {
      logger.error('Error al registrar desvíos manuales', { data: { error } });
      toast.error('Ocurrió un error al registrar los desvíos');
      setIsSubmitting(false);
    }
  }, [
    selectedSupervisorId,
    selectedItems,
    checklistAnswerId,
    equipmentId,
    driverEmployeeId,
    employeeId,
    userId,
    kilometer,
    queryClient,
    onSuccess,
  ]);

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (submitSuccessRef.current) {
      submitSuccessRef.current = false;
      return;
    }
    onClose();
  };

  const submitLabel =
    selectedItems.length === 0
      ? 'Registrar desvíos'
      : `Registrar ${selectedItems.length} desvío${selectedItems.length > 1 ? 's' : ''}`;

  const submitDisabled = isSubmitting || !selectedSupervisorId || selectedItems.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Registrar desvío adicional</DialogTitle>
          <DialogDescription>
            El checklist fue guardado sin fallos. Seleccioná los ítems sobre los que querés dejar un desvío.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div className="rounded-md bg-muted/30 p-3 flex flex-col gap-2">
            <Label htmlFor="supervisor-select" className="text-sm">
              Supervisor de turno <span className="text-destructive">*</span>
            </Label>
            {isLoadingSupervisors ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={openSupervisorSelect} onOpenChange={setOpenSupervisorSelect}>
                <PopoverTrigger asChild>
                  <Button
                    id="supervisor-select"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSupervisorSelect}
                    disabled={isSubmitting}
                    className="w-full justify-between font-normal"
                  >
                    {supervisorName || 'Seleccionar supervisor...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar supervisor..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron supervisores.</CommandEmpty>
                      <CommandGroup>
                        {supervisors.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.fullName}
                            onSelect={() => {
                              setSelectedSupervisorId(s.id);
                              setOpenSupervisorSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedSupervisorId === s.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="flex-1">{s.fullName}</span>
                            {!s.isAvailable && <span className="text-xs text-muted-foreground">(no disponible)</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {selectedItems.length} ítem{selectedItems.length === 1 ? '' : 's'} seleccionado
            {selectedItems.length === 1 ? '' : 's'}
          </p>

          <ChecklistItemPicker
            sections={sections}
            selectedItems={selectedItems}
            onChange={setSelectedItems}
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-row sm:justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="sm:mr-auto">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitDisabled}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verificar que el tipo del supervisor coincide**

El combobox asume que `fetchSupervisorsForChecklist` retorna objetos con `{ id, fullName, isAvailable }`. Confirmar abriendo `src/features/Checklist/actions/actionsServer.ts` y ubicando la función. Si el shape es diferente, ajustar el render del `CommandItem` (campos accedidos: `s.fullName`, `s.isAvailable`).

- [ ] **Step 4: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

Si hay errores, los más probables son:

- Faltó `Checkbox` o `Collapsible` de shadcn → instalar con `npx shadcn@latest add <component>`.
- `invalidateAllMaintenanceQueries` no se importa desde la ruta correcta → verificar con `Grep` el path real: `@/features/Mantenimiento/utils/queryInvalidation`.

---

## Task 4: Componente `AllGoodDeviationPromptDialog`

**Files:**

- Create: `src/features/Mantenimiento/shared/components/AllGoodDeviationPromptDialog.tsx`

- [ ] **Step 1: Crear el archivo**

Crear `src/features/Mantenimiento/shared/components/AllGoodDeviationPromptDialog.tsx`:

```tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CircleCheck } from 'lucide-react';

type AllGoodDeviationPromptDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AllGoodDeviationPromptDialog({ isOpen, onCancel, onConfirm }: AllGoodDeviationPromptDialogProps) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-1">
            <CircleCheck className="h-8 w-8 text-green-600" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="text-center">Checklist guardado correctamente</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            No se detectaron ítems con fallos. ¿Querés registrar un desvío de mantenimiento igualmente? Por ejemplo, si
            notaste algo que el checklist no cubre.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>No, continuar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sí, registrar desvío</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Verificar que `@/components/ui/alert-dialog` existe**

Run: confirmar `src/components/ui/alert-dialog.tsx`. Si no, `npx shadcn@latest add alert-dialog`.

- [ ] **Step 3: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

---

## Task 5: Integrar en `NormalizedChecklistForm`

**Files:**

- Modify: `src/features/Formularios/Checklists/NormalizedChecklistForm.tsx`

**Contexto:**

- El branch `failedItems.length === 0` vive en el método `onSubmit` alrededor de las líneas 1198–1217 del archivo actual (los números pueden haber cambiado — usar el `Grep` del Step 1).
- El state `createdAnswerId` ya existe y contiene el ID del checklist guardado (setteado en línea ~1090 tras `CreateChecklistAnswer`).
- El render del form termina en un fragment con el `</form>` — los nuevos dialogs van fuera del `<form>` para evitar que Enter dentro del modal dispare el submit del form.

- [ ] **Step 1: Identificar las líneas exactas del branch a modificar**

Run: `Grep` sobre el archivo con `pattern="Checklist guardado correctamente"` y `-n -B 1 -A 20` para confirmar el rango.

También confirmar que existe la variable `createdAnswerId` en state:
`Grep` con `pattern="createdAnswerId|setCreatedAnswerId"` — output_mode=content, -n=true, head_limit=10.

Anotar los números de línea reales antes de editar.

- [ ] **Step 2: Agregar imports nuevos**

En la parte superior de `NormalizedChecklistForm.tsx`, bajo los imports existentes de componentes de mantenimiento (cerca del import de `CriticalDeviationsRepairModal`), agregar:

```tsx
import { AdditionalDeviationModal } from '@/features/Mantenimiento/shared/components/AdditionalDeviationModal';
import { AllGoodDeviationPromptDialog } from '@/features/Mantenimiento/shared/components/AllGoodDeviationPromptDialog';
import type { PickableSection } from '@/features/Mantenimiento/shared/components/ChecklistItemPicker';
```

- [ ] **Step 3: Agregar estado nuevo**

Ubicar donde se declaran los `useState` existentes del form (cerca de `showDeviationsModal` / `pendingDeviations`), y agregar:

```tsx
const [showAllGoodPrompt, setShowAllGoodPrompt] = useState(false);
const [showAdditionalDeviationModal, setShowAdditionalDeviationModal] = useState(false);
```

- [ ] **Step 4: Agregar función local `redirectAfterChecklist`**

Dentro del componente (no dentro de `onSubmit` — declarada a nivel del render function con `useCallback`), agregar una función que encapsule la lógica de redirect actual para no duplicarla:

```tsx
const redirectAfterChecklist = useCallback(
  (equipmentId: string) => {
    if (pathname?.includes('/dashboard/forms/')) {
      const formIdMatch = pathname.match(/\/dashboard\/forms\/([^/]+)/);
      if (formIdMatch?.[1]) {
        router.push(`/dashboard/forms/${formIdMatch[1]}`);
      } else {
        router.push('/dashboard/forms');
      }
    } else {
      router.push(`/maintenance/equipment/${equipmentId}/checklists`);
    }
    router.refresh();
  },
  [pathname, router]
);
```

Ubicar esta declaración después de los `useState` y antes del `onSubmit`. Si no existe `useCallback` en los imports de React, agregarlo al import de `react`.

- [ ] **Step 5: Derivar `pickableSections` desde el template**

Ubicar donde se declara `sortedSections` en el archivo (línea ~829 según análisis previo), y justo después agregar un `useMemo` que mapee a la forma que espera `ChecklistItemPicker`:

```tsx
const pickableSections: PickableSection[] = useMemo(
  () =>
    (template.checklist_template_sections ?? []).map((section) => ({
      id: section.id,
      code: section.code,
      name: section.name,
      order_index: section.order_index ?? null,
      items: (section.checklist_template_items ?? [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((item) => ({
          id: item.id,
          code: item.code,
          label: item.label,
          is_critical: item.is_critical ?? false,
        })),
    })),
  [template]
);
```

Si el campo de nombre de la sección no se llama `name` (puede ser `section_name` o similar), verificarlo en el tipo `ChecklistTemplateSection` (ver líneas 32–62 del archivo) y ajustar el mapping.

- [ ] **Step 6: Reemplazar el branch `failedItems.length === 0`**

Ubicar el branch actual (basado en el Step 1) — es algo como:

```ts
} else {
  toast.success('Checklist guardado correctamente');
  setTimeout(() => {
    if (pathname?.includes('/dashboard/forms/')) { /* ... */ }
    else { router.push(`/maintenance/equipment/${data.equipment_id}/checklists`); }
    router.refresh();
  }, 1500);
}
```

Reemplazarlo ENTERO (el bloque `else { ... }`) por:

```ts
} else {
  toast.success('Checklist guardado correctamente');
  setShowAllGoodPrompt(true);
}
```

**No agregar `setTimeout` ni `router.push` en este branch.** La redirección la maneja ahora el callback del `AllGoodDeviationPromptDialog` y del `AdditionalDeviationModal`.

- [ ] **Step 7: Renderizar los dos nuevos dialogs**

Al final del JSX del componente, justo antes del cierre del componente y **fuera** del `<form>`, en el mismo fragment donde ya vive `<CriticalDeviationsRepairModal>` (alrededor de líneas 1792–1838), agregar:

```tsx
<AllGoodDeviationPromptDialog
  isOpen={showAllGoodPrompt}
  onCancel={() => {
    setShowAllGoodPrompt(false);
    if (currentEquipmentId) redirectAfterChecklist(currentEquipmentId);
  }}
  onConfirm={() => {
    setShowAllGoodPrompt(false);
    setShowAdditionalDeviationModal(true);
  }}
/>;
{
  currentEquipmentId && createdAnswerId && (
    <AdditionalDeviationModal
      isOpen={showAdditionalDeviationModal}
      onClose={() => {
        setShowAdditionalDeviationModal(false);
        redirectAfterChecklist(currentEquipmentId);
      }}
      onSuccess={() => {
        setShowAdditionalDeviationModal(false);
        redirectAfterChecklist(currentEquipmentId);
      }}
      checklistAnswerId={createdAnswerId}
      equipmentId={currentEquipmentId}
      sections={pickableSections}
      driverEmployeeId={defaultEmployeeId}
      employeeId={defaultEmployeeId}
      userId={currentUser?.id}
      kilometer={form.getValues('kilometer')?.toString()}
    />
  );
}
```

**Nota importante**: los nombres de props del form (`defaultEmployeeId`, `currentUser?.id`, `form.getValues('kilometer')`) pueden variar según el shape real del componente. Verificar con Grep los nombres de variables/props disponibles en el scope antes de pasarlos. Si alguno no aplica, pasar `undefined`.

- [ ] **Step 8: Type-check**

Run: `npm run check-types`
Expected: **PASS**.

Errores comunes y su resolución:

- `createdAnswerId` es `string | null` → usar el guard `{currentEquipmentId && createdAnswerId && (...)}` como arriba.
- `kilometer` tipo mismatch → convertir explícitamente con `String(...)` o `?.toString()`.
- `currentUser?.id` no existe en el tipo → usar `undefined` o el campo correcto del prop `currentUser`.

---

## Task 6: Verificación manual en browser

Este proyecto no tiene tests unitarios. La verificación final es manual + con `chrome-devtools` MCP.

- [ ] **Step 1: Arrancar el dev server**

Run: `npm run dev` en la terminal (background).

Esperar a que el compilador haga el primer build exitoso. Si aparecen errores de compilación, volver a revisar las tasks previas.

- [ ] **Step 2: Login con credenciales de prueba**

Navegar a la app en el browser (`http://localhost:3000`).
Credenciales (desde memoria del proyecto):

- Email: `yordanpz@hotmail.com`
- Password: `Yoselania23.`

- [ ] **Step 3: Verificar flujo desde el dashboard**

1. Navegar a `/dashboard/forms` y elegir un checklist template que tenga al menos 2 secciones con varios ítems.
2. Iniciar un nuevo llenado.
3. Responder TODOS los ítems con "Bien" (`B`) — ningún `M`, ningún `false`.
4. Presionar el submit del checklist.
5. **Verificar**: aparece el toast "Checklist guardado correctamente" e inmediatamente después el `AllGoodDeviationPromptDialog`.
6. **Path A**: presionar "No, continuar" → debe redirigir a la lista del form del dashboard. Verificar que NO se creó ninguna `maintenance_request` en la BD (opcional: query via MCP `supabase-DEV__execute_sql` sobre `maintenance_requests` filtrando por `checklist_answer_id`).
7. Repetir el flujo desde el Step 3.1 hasta el 3.5.
8. **Path B**: presionar "Sí, registrar desvío" → debe abrir el `AdditionalDeviationModal`.
9. Elegir un supervisor, expandir una sección, marcar 2 ítems (uno crítico si hay), escribir comentario en uno, dejar el otro sin comentario.
10. Presionar "Registrar 2 desvíos".
11. **Verificar**: toast "Solicitud de mantenimiento creada", el modal se cierra y redirige a la lista del form.
12. Navegar a `/dashboard/maintenance` a la tab de Solicitudes y confirmar que aparece una nueva en estado "Pending approval" con 2 ítems.
13. En la BD, verificar con MCP que:
    - Existe 1 nueva `maintenance_requests` con `checklist_answer_id` igual al del checklist recién guardado.
    - Existen 2 `checklist_deviations` con el mismo `checklist_answer_id` y los `item_code` / `section_code` correctos.
    - Existen 2 `maintenance_request_items` con `status = 'pending'` vinculados al request y a los desvíos.

Ejemplo de query para verificar:

```sql
SELECT mr.id, mr.status, mr.checklist_answer_id, count(mri.id) as items
FROM maintenance_requests mr
LEFT JOIN maintenance_request_items mri ON mri.maintenance_request_id = mr.id
WHERE mr.checklist_answer_id = '<ID_DEL_CHECKLIST_ANSWER>'
GROUP BY mr.id;
```

- [ ] **Step 4: Verificar flujo desde ruta mobile/QR**

1. Navegar a `/maintenance/equipment/<equipmentId>/checklists` y elegir "Nuevo checklist" o equivalente.
2. Repetir los Steps 3.3–3.11 en esta ruta.
3. **Verificar** que tras registrar desvíos, el redirect va a `/maintenance/equipment/<equipmentId>/checklists` (NO al dashboard/forms). Este es el comportamiento diferencial que maneja la función `redirectAfterChecklist`.

- [ ] **Step 5: Verificar casos edge**

1. **Cerrar modal con X/ESC/click fuera sin submitear**: no debe crear nada; debe redirigir igual.
2. **Intentar submit sin supervisor**: botón deshabilitado y/o toast de error.
3. **Intentar submit sin ítems seleccionados**: botón deshabilitado.
4. **Seleccionar un ítem y después deseleccionarlo**: el textarea inline desaparece, el contador se actualiza.
5. **Comentario con solo espacios**: al submit, el comentario se envía como `undefined` (trim); en BD `driver_comment` queda `null`.

- [ ] **Step 6: Regresión — branch con ítems fallidos sigue funcionando**

1. Iniciar un nuevo checklist (desde dashboard o mobile).
2. Responder al menos 1 ítem con "Mal" (`M`).
3. Submit.
4. **Verificar** que sigue apareciendo el `CriticalDeviationsRepairModal` original (NO el nuevo dialog sí/no). El flujo existente no debe haberse alterado.

- [ ] **Step 7: Regresión — rutas readOnly**

1. Navegar a `/dashboard/forms/<id>/view/<answerId>` de un checklist ya guardado.
2. **Verificar** que no hay botones de submit ni aparece ningún diálogo. La vista sigue siendo puramente de lectura.

---

## Self-Review

**Spec coverage**:

- §3 punto 3 del spec (prompt tras 100% OK) → Task 5 Steps 6–7.
- §3.3 backend server action → Task 1.
- §3.2 componentes nuevos → Tasks 2, 3, 4.
- §4 UI AlertDialog y Dialog → Tasks 3 (modal) y 4 (prompt).
- §5 flujo de transacción → Task 1 Step 2.
- §6 estado del cliente → Task 5 Steps 3 y 4.
- §7 casos edge → Task 6 Steps 5–7.
- §8 rutas afectadas → Task 6 Steps 3 y 4.
- §9 reglas del proyecto → aplicadas: logger scoped (Task 1), memo/useCallback/useMemo (Tasks 2, 3, 5), zod/rhf no aplicable a este flujo (el modal es control manual con state porque no hay validación inter-campo compleja; el spec mencionaba rhf pero la realidad del modal crítico actual tampoco lo usa, así que matenemos consistencia).

**Placeholder scan**: sin TBDs ni TODOs, sin referencias a tipos/métodos no definidos. Las notas de "verificar nombre exacto" son inspecciones obligatorias antes del Step — tienen instrucciones concretas de cómo resolver.

**Type consistency**: tipos `PickableSection`, `PickableItem`, `SelectedItem` exportados desde `ChecklistItemPicker.tsx` y reutilizados en `AdditionalDeviationModal.tsx` y `NormalizedChecklistForm.tsx`. El input de la server action `createManualDeviationsFromChecklist` en Task 1 coincide con el shape construido en `handleSubmit` de Task 3.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-04-14-cod374-checklist-ok-desvio-manual.md`.

Dos opciones de ejecución:

**1. Subagent-Driven (recomendado)** — despacho un subagente fresco por task, reviso entre tasks, iteración rápida.

**2. Inline Execution** — ejecuto las tasks en esta sesión con checkpoints.

¿Cuál preferís?
