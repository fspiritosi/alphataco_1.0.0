'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Power, Truck, User, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { document_applies } from '@/generated/prisma/enums';
import { useDebounce } from '@/shared/hooks/useDebounce';

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
import {
  countMatchingResources,
  createDocumentType,
  getDocumentTypeForEdit,
  toggleDocumentTypeActive,
  updateDocumentType,
  type DocumentTypeListItem,
} from '../actions/actions.server';
import { createEmptyConditionsState, type ConditionsState } from '../config/documentConditions';
import {
  conditionsJsonToSelections,
  hasActiveConditions,
  mergeConditions,
  selectionsToConditionsJson,
} from '../utils/conditionsMapper';
import { _ConditionsSection } from './_ConditionsSection';
import { _VerifyDocumentsDialog } from './_VerifyDocumentsDialog';

// ============================================
// SCHEMA
// ============================================

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  applies: z.nativeEnum(document_applies),
  equipment_type: z.string().optional().nullable(),
  mandatory: z.boolean(),
  explired: z.boolean(),
  is_it_montlhy: z.boolean(),
  private: z.boolean(),
  down_document: z.boolean(),
  multiresource: z.boolean(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================
// CONSTANTES
// ============================================

const EQUIPMENT_TYPE_OPTIONS = [
  { value: 'Vehiculo', label: 'Vehículo' },
  { value: 'Otro', label: 'Otro' },
];

const APPLIES_OPTIONS = [
  { value: document_applies.Persona, label: 'Empleados', icon: User },
  { value: document_applies.Equipos, label: 'Equipos', icon: Truck },
  { value: document_applies.Empresa, label: 'Empresa', icon: Building2 },
] as const;

// ============================================
// TIPOS
// ============================================

interface DocumentTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType?: DocumentTypeListItem | null;
  defaultApplies?: document_applies;
  permissionsMap?: Record<string, boolean>;
}

// ============================================
// COMPONENTE
// ============================================

export function _DocumentTypeFormModal({
  open,
  onOpenChange,
  documentType,
  defaultApplies = document_applies.Persona,
  permissionsMap,
}: DocumentTypeFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!documentType;

  // --- Estado de verificación ---
  const [verifyOpen, setVerifyOpen] = useState(false);
  // --- Estado de confirmación activar/desactivar ---
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);

  // --- Estado de condiciones (fuera del form, paralelo) ---
  const [isSpecial, setIsSpecial] = useState(false);
  const [conditions, setConditions] = useState<ConditionsState>(() => createEmptyConditionsState(defaultApplies));
  const [initialNamesMap, setInitialNamesMap] = useState<Record<string, Map<string, string>>>({});

  // Ref mutable para namesMap que se actualiza al hacer selecciones
  const namesMapRef = useRef<Record<string, Map<string, string>>>({});

  // --- React Hook Form ---
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      applies: defaultApplies,
      equipment_type: null,
      mandatory: false,
      explired: false,
      is_it_montlhy: false,
      private: false,
      down_document: false,
      multiresource: false,
      description: '',
    },
  });

  const applies = form.watch('applies');

  // --- Lazy-load condiciones en modo edición ---
  const hydratedForIdRef = useRef<string | null>(null);

  const { data: editData, isLoading: isLoadingEdit } = useQuery({
    queryKey: ['document-type-edit', documentType?.id],
    queryFn: () => getDocumentTypeForEdit(documentType!.id),
    enabled: open && isEditing && !!documentType?.id,
    staleTime: 0,
  });

  // Hidratar form y condiciones cuando llegan datos de edición
  // (useEffect válido: sincronización con datos externos de React Query)
  useEffect(() => {
    if (!editData || !documentType?.id) return;
    if (hydratedForIdRef.current === documentType.id) return;
    hydratedForIdRef.current = documentType.id;

    form.reset({
      name: editData.name,
      applies: editData.applies,
      equipment_type: editData.equipment_type ?? null,
      mandatory: editData.mandatory,
      explired: editData.explired,
      is_it_montlhy: editData.is_it_montlhy ?? false,
      private: editData.private ?? false,
      down_document: editData.down_document ?? false,
      multiresource: editData.multiresource,
      description: editData.description ?? '',
    });

    setIsSpecial(editData.special);
    const conditionsArray = editData.conditions as unknown[];
    if (Array.isArray(conditionsArray) && conditionsArray.length > 0) {
      const parsed = conditionsJsonToSelections(conditionsArray as Parameters<typeof conditionsJsonToSelections>[0]);
      setConditions(parsed.selections);
      setInitialNamesMap(parsed.namesMap);
      namesMapRef.current = parsed.namesMap;
    } else {
      setConditions(createEmptyConditionsState(editData.applies));
      setInitialNamesMap({});
      namesMapRef.current = {};
    }
  }, [editData, documentType?.id, form]);

  // --- Contador de coincidencias (live) ---
  const debouncedConditions = useDebounce(conditions, 500);
  const hasActive = hasActiveConditions(debouncedConditions);

  const conditionsJson = useMemo(
    () => (isSpecial && hasActive ? selectionsToConditionsJson(debouncedConditions, applies, namesMapRef.current) : []),
    [isSpecial, hasActive, debouncedConditions, applies]
  );

  const { data: matchCount, isLoading: isCountLoading } = useQuery({
    queryKey: ['condition-match-count', applies, conditionsJson],
    queryFn: () => countMatchingResources(applies, conditionsJson as Parameters<typeof countMatchingResources>[1]),
    enabled: isSpecial && hasActive && applies !== 'Empresa',
    staleTime: 10_000,
  });

  // --- Mutaciones ---
  const createMutation = useMutation({
    mutationFn: createDocumentType,
    onSuccess: () => {
      toast.success('Tipo de documento creado');
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al crear tipo');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateDocumentType>[1] }) =>
      updateDocumentType(id, data),
    onSuccess: () => {
      toast.success('Tipo de documento actualizado');
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
      handleClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar tipo');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleDocumentTypeActive(id, isActive),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? 'Tipo de documento activado' : 'Tipo de documento desactivado');
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
      handleClose();
    },
    onError: () => {
      toast.error('Error al cambiar el estado del tipo de documento');
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending || toggleMutation.isPending;

  // --- Verificar documentos (visibilidad del botón) ---
  const mandatory = form.watch('mandatory');
  const isMonthly = form.watch('is_it_montlhy');
  const canVerify =
    isEditing &&
    mandatory &&
    !isMonthly &&
    applies !== 'Empresa' &&
    permissionsMap?.[`documentacion:${applies === 'Persona' ? 'tipos-docs-personas' : 'tipos-docs-equipos'}:update`] ===
      true;

  // --- Handlers ---
  const handleConditionsChange = useCallback((partial: Partial<ConditionsState>) => {
    setConditions((prev) => mergeConditions(prev, partial));
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset al cerrar
    hydratedForIdRef.current = null;
    form.reset({
      name: '',
      applies: defaultApplies,
      equipment_type: null,
      mandatory: false,
      explired: false,
      is_it_montlhy: false,
      private: false,
      down_document: false,
      multiresource: false,
      description: '',
    });
    setIsSpecial(false);
    setConditions(createEmptyConditionsState(defaultApplies));
    setInitialNamesMap({});
    namesMapRef.current = {};
  }, [onOpenChange, form, defaultApplies]);

  const handleAppliesChange = useCallback(
    (value: document_applies) => {
      form.setValue('applies', value);
      // Reset multiresource si cambia a Empresa
      if (value === 'Empresa') {
        form.setValue('multiresource', false);
      }
      // Reset condiciones al cambiar tipo
      setConditions(createEmptyConditionsState(value));
      setIsSpecial(false);
    },
    [form]
  );

  const onSubmit = useCallback(
    (values: FormValues) => {
      // Validar que si es especial, tenga al menos una condición
      if (isSpecial && !hasActiveConditions(conditions)) {
        toast.error('Debe seleccionar al menos una condición');
        return;
      }

      const conditionsPayload = isSpecial
        ? selectionsToConditionsJson(conditions, values.applies, namesMapRef.current)
        : [];

      const payload = {
        name: values.name,
        applies: values.applies,
        equipment_type: values.applies === 'Equipos' ? values.equipment_type ?? null : null,
        mandatory: values.mandatory,
        explired: values.explired,
        special: isSpecial,
        multiresource: values.multiresource,
        is_it_montlhy: values.is_it_montlhy,
        private: values.private,
        down_document: values.down_document,
        description: values.description || undefined,
        conditions: conditionsPayload as Parameters<typeof createDocumentType>[0]['conditions'],
      };

      if (isEditing && documentType) {
        updateMutation.mutate({ id: documentType.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [isSpecial, conditions, isEditing, documentType, createMutation, updateMutation]
  );

  // --- Render ---
  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[650px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>{isEditing ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}</DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? 'Modifica los datos del tipo de documento'
                    : 'Configura un nuevo tipo de documento para tu empresa'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4">
                {isLoadingEdit && isEditing ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando datos...</span>
                  </div>
                ) : (
                  <div className="grid gap-4 pr-2">
                    {/* Nombre */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Licencia de conducir" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Aplica a */}
                    <FormField
                      control={form.control}
                      name="applies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aplica a *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => handleAppliesChange(v as document_applies)}
                            disabled={isEditing}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {APPLIES_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <opt.icon className="h-4 w-4" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo de equipo (solo si applies === Equipos) */}
                    {applies === 'Equipos' && (
                      <FormField
                        control={form.control}
                        name="equipment_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de equipo</FormLabel>
                            <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {EQUIPMENT_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Opciones (checkboxes) */}
                    <div className="space-y-3">
                      <FormLabel>Opciones</FormLabel>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="mandatory"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">Es obligatorio</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="explired"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">Tiene vencimiento</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="is_it_montlhy"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">Es mensual</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="private"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">Es privado</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="down_document"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">Documento de baja</FormLabel>
                            </FormItem>
                          )}
                        />

                        {applies !== 'Empresa' && (
                          <FormField
                            control={form.control}
                            name="multiresource"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="font-normal text-sm">Es multirrecurso</FormLabel>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>

                    {/* Descripción */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descripción opcional" rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sección de Condiciones */}
                    <_ConditionsSection
                      applies={applies}
                      isSpecial={isSpecial}
                      onIsSpecialChange={setIsSpecial}
                      conditions={conditions}
                      onConditionsChange={handleConditionsChange}
                      disabled={isPending || isLoadingEdit}
                      initialNamesMap={initialNamesMap}
                    />

                    {/* Contador de coincidencias */}
                    {isSpecial && hasActive && applies !== 'Empresa' && (
                      <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {isCountLoading ? (
                          <span className="text-muted-foreground">Calculando coincidencias...</span>
                        ) : (
                          <span>
                            <strong>{matchCount ?? 0}</strong> {applies === 'Persona' ? 'empleado' : 'equipo'}
                            {(matchCount ?? 0) !== 1 ? 's' : ''} coinciden con las condiciones configuradas
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-shrink-0 pt-4 sm:justify-between">
                <div className="flex gap-2">
                  {isEditing && documentType && (
                    <Button
                      type="button"
                      variant={documentType.is_active ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => setToggleConfirmOpen(true)}
                      disabled={isPending}
                    >
                      <Power className="mr-1 h-3.5 w-3.5" />
                      {documentType.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  )}
                  {canVerify && documentType && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setVerifyOpen(true)}>
                      Verificar documentos
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending || form.formState.isSubmitting || isLoadingEdit}>
                    {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {canVerify && documentType && (
        <_VerifyDocumentsDialog
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          documentTypeId={documentType.id}
          documentTypeName={documentType.name}
          applies={applies as 'Persona' | 'Equipos'}
          isSpecial={isSpecial}
        />
      )}

      {/* Confirmación de activar/desactivar */}
      {isEditing && documentType && (
        <AlertDialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{documentType.is_active ? 'Desactivar' : 'Activar'} tipo de documento</AlertDialogTitle>
              <AlertDialogDescription>
                {documentType.is_active
                  ? `¿Está seguro que desea desactivar "${documentType.name}"? Los documentos existentes no se eliminarán, pero no se podrán crear nuevos documentos de este tipo.`
                  : `¿Está seguro que desea activar "${documentType.name}"? Se podrán volver a crear documentos de este tipo.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={toggleMutation.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  toggleMutation.mutate({
                    id: documentType.id,
                    isActive: !documentType.is_active,
                  })
                }
                disabled={toggleMutation.isPending}
              >
                {toggleMutation.isPending ? 'Procesando...' : documentType.is_active ? 'Desactivar' : 'Activar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
