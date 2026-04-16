'use client';

import { FormItemDatePicker } from '@/components/ui/FormItemDatePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  checkDiagramConflicts,
  checkNoveltyConflicts,
  getActiveDiagramTypes,
  getActiveWorkDiagrams,
  getWorkDiagramNovelties,
  type NoveltyData,
} from './actions/diagram-massive-actions';
import { searchEmployeeDiagrams, type DiagramEmployee } from './actions/diagram-search-actions';
import { EMPTY_FILTERS, EmployeeFilterPanel, type FilterState } from './components/EmployeeFilterPanel';
import { EmployeeSelectionGrid } from './components/EmployeeSelectionGrid';
import type { ConflictData, MassiveFormData, ProcessingResult } from './types/massive-diagram';

const logger = new Logger('Diagrams/DiagramMassiveForm');

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_EMPLOYEES = 100;
const MAX_DAYS_RANGE = 90;

// ── Zod Schema ───────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    mode: z.enum(['diagram', 'novelty']),
    employeeIds: z
      .array(z.string())
      .min(1, 'Selecciona al menos un empleado')
      .max(MAX_EMPLOYEES, `Máximo ${MAX_EMPLOYEES} empleados`),
    workDiagramId: z.string().optional(),
    activeNoveltyId: z.string().optional(),
    diagramTypeId: z.string().optional(),
    dateRange: z
      .object({
        from: z.date().min(new Date(), 'Solo fechas desde hoy en adelante'),
        to: z.date(),
      })
      .refine((data) => {
        const diffDays = Math.ceil((data.to.getTime() - data.from.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= MAX_DAYS_RANGE;
      }, `Máximo ${MAX_DAYS_RANGE} días permitidos`),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'diagram' && !data.workDiagramId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona un diagrama de trabajo',
        path: ['workDiagramId'],
      });
    }
    if (data.mode === 'novelty' && !data.diagramTypeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona una novedad',
        path: ['diagramTypeId'],
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onConflictsFound: (conflicts: ConflictData, formData: MassiveFormData) => void;
  onProcessingComplete: (result: ProcessingResult) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DiagramMassiveForm({ onConflictsFound, loading, setLoading }: Props) {
  // ── Novelty state (only used in diagram mode) ──────────────────────────────
  const [noveltyData, setNoveltyData] = useState<NoveltyData | null>(null);
  const [showActiveNoveltySelect, setShowActiveNoveltySelect] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] = useState<(keyof FilterState)[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // ── Search / pagination state ─────────────────────────────────────────────
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [accumulatedEmployees, setAccumulatedEmployees] = useState<DiagramEmployee[]>([]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'diagram',
      employeeIds: [],
      workDiagramId: '',
      activeNoveltyId: '',
      diagramTypeId: '',
      dateRange: {
        from: new Date(),
        to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const mode = form.watch('mode');

  // ── Work diagrams query (diagram mode) ────────────────────────────────────
  const { data: workDiagrams = [], isLoading: isLoadingDiagrams } = useQuery({
    queryKey: ['massive-work-diagrams'],
    queryFn: getActiveWorkDiagrams,
    staleTime: 5 * 60 * 1000,
  });

  // ── Diagram types query (novelty mode) ────────────────────────────────────
  const { data: diagramTypes = [], isLoading: isLoadingDiagramTypes } = useQuery({
    queryKey: ['massive-diagram-types'],
    queryFn: getActiveDiagramTypes,
    staleTime: 5 * 60 * 1000,
  });

  // ── Employee search query ─────────────────────────────────────────────────
  const searchParams = useMemo(
    () => ({
      firstname: filters.firstname || undefined,
      lastname: filters.lastname || undefined,
      positions: filters.position.length > 0 ? filters.position : undefined,
      workflows: filters.workflow.length > 0 ? filters.workflow : undefined,
      costCenters: filters.costCenter.length > 0 ? filters.costCenter : undefined,
      covenants: filters.covenant.length > 0 ? filters.covenant : undefined,
      guilds: filters.guild.length > 0 ? filters.guild : undefined,
      categories: filters.category.length > 0 ? filters.category : undefined,
      contractors: filters.contractors.length > 0 ? filters.contractors : undefined,
      page: currentPage,
      pageSize: 100,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchTrigger, currentPage]
  );

  const { data: employeeResult, isFetching: isSearching } = useQuery({
    queryKey: ['massive-employees', searchParams],
    queryFn: () => searchEmployeeDiagrams(searchParams),
    enabled: searchTrigger > 0,
    staleTime: 0,
  });

  // ── Derived state ─────────────────────────────────────────────────────────
  const employees = useMemo<DiagramEmployee[]>(() => {
    if (!employeeResult) return accumulatedEmployees;
    if (currentPage === 1) return employeeResult.data;
    const existingIds = new Set(accumulatedEmployees.map((e) => e.value));
    const newEmployees = employeeResult.data.filter((e) => !existingIds.has(e.value));
    return [...accumulatedEmployees, ...newEmployees];
  }, [employeeResult, currentPage, accumulatedEmployees]);

  const hasMoreData = employeeResult?.hasMore ?? false;
  const hasSearched = searchTrigger > 0;

  const watchedValues = form.watch();
  const employeeCount = watchedValues.employeeIds?.length ?? 0;
  const dateRange = watchedValues.dateRange;
  const days =
    dateRange?.from && dateRange?.to
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
  const totalRecords = employeeCount * days;
  const estimatedTime = `${Math.ceil(totalRecords / 1000) * 2} seg`;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleModeChange = useCallback(
    (newMode: 'diagram' | 'novelty') => {
      form.setValue('mode', newMode);
      // Reset mode-specific fields so validation no arrastra estado del otro modo
      form.setValue('workDiagramId', '');
      form.setValue('activeNoveltyId', '');
      form.setValue('diagramTypeId', '');
      form.clearErrors(['workDiagramId', 'activeNoveltyId', 'diagramTypeId']);
      setNoveltyData(null);
      setShowActiveNoveltySelect(false);
      // Quitar el filtro de workflow que se auto-aplica en modo diagrama
      if (filters.workflow.length > 0) {
        const cleared = { ...filters, workflow: [] };
        setFilters(cleared);
        setActiveFilters(activeFilters.filter((f) => f !== 'workflow'));
      }
    },
    [form, filters, activeFilters]
  );

  const handleWorkDiagramChange = useCallback(
    async (diagramId: string) => {
      form.setValue('workDiagramId', diagramId);
      form.setValue('activeNoveltyId', '');
      setNoveltyData(null);
      setShowActiveNoveltySelect(false);

      if (!diagramId) return;

      try {
        const data = await getWorkDiagramNovelties(diagramId);
        setNoveltyData(data);
        setShowActiveNoveltySelect(data.activeNovelties.length > 1);

        // Auto-set activeNoveltyId when there's exactly 1 option
        if (data.activeNovelties.length === 1) {
          form.setValue('activeNoveltyId', data.activeNovelties[0].diagram_type_id);
        }

        // Auto-set workflow filter to narrow down employees
        const newFilters = { ...filters, workflow: [diagramId] };
        setFilters(newFilters);
        if (!activeFilters.includes('workflow')) {
          setActiveFilters([...activeFilters, 'workflow']);
        }
      } catch (error) {
        logger.error('Error loading diagram novelties', { data: { error } });
        toast.error('Error al cargar las novedades del diagrama');
      }
    },
    [filters, activeFilters, form]
  );

  const handleFilterSubmit = useCallback(() => {
    setCurrentPage(1);
    setAccumulatedEmployees([]);
    setSearchTrigger((prev) => prev + 1);
  }, []);

  const loadMoreData = useCallback(() => {
    setAccumulatedEmployees(employees);
    setCurrentPage((prev) => prev + 1);
    setSearchTrigger((prev) => prev + 1);
  }, [employees]);

  const clearAllFilters = useCallback(() => {
    const resetFilters = { ...EMPTY_FILTERS, workflow: filters.workflow };
    setFilters(resetFilters);
    setActiveFilters(activeFilters.filter((f) => f === 'workflow'));
    setCurrentPage(1);
    setAccumulatedEmployees([]);
    setSearchTrigger(0);
    form.setValue('employeeIds', []);
  }, [filters.workflow, activeFilters, form]);

  const handleEmployeeToggle = useCallback(
    (employeeId: string) => {
      const current = form.getValues('employeeIds');
      if (current.includes(employeeId)) {
        form.setValue(
          'employeeIds',
          current.filter((id) => id !== employeeId)
        );
      } else {
        if (current.length >= MAX_EMPLOYEES) {
          toast.warning(`Máximo ${MAX_EMPLOYEES} empleados permitidos`);
          return;
        }
        form.setValue('employeeIds', [...current, employeeId]);
      }
    },
    [form]
  );

  const handleVerifyAndSubmit = useCallback(
    async (data: FormData) => {
      setLoading(true);
      try {
        const dateFrom = data.dateRange.from.toISOString().split('T')[0];
        const dateTo = data.dateRange.to.toISOString().split('T')[0];

        if (data.mode === 'diagram') {
          const result = await checkDiagramConflicts({
            employeeIds: data.employeeIds,
            workDiagramId: data.workDiagramId!,
            dateFrom,
            dateTo,
            activeNoveltyId: data.activeNoveltyId || undefined,
          });

          const conflictData: ConflictData = {
            operationConflicts: result.conflicts.filter((c) => c.conflict_type === 'IN_USE'),
            simpleConflicts: result.conflicts.filter((c) => c.conflict_type === 'CAN_UPDATE'),
          };

          onConflictsFound(conflictData, {
            mode: 'diagram',
            employeeIds: data.employeeIds,
            workDiagramId: data.workDiagramId!,
            activeNoveltyId: data.activeNoveltyId,
            dateRange: { from: data.dateRange.from, to: data.dateRange.to },
          });
        } else {
          const result = await checkNoveltyConflicts({
            employeeIds: data.employeeIds,
            diagramTypeId: data.diagramTypeId!,
            dateFrom,
            dateTo,
          });

          const conflictData: ConflictData = {
            operationConflicts: result.conflicts.filter((c) => c.conflict_type === 'IN_USE'),
            simpleConflicts: result.conflicts.filter((c) => c.conflict_type === 'CAN_UPDATE'),
          };

          onConflictsFound(conflictData, {
            mode: 'novelty',
            employeeIds: data.employeeIds,
            diagramTypeId: data.diagramTypeId!,
            dateRange: { from: data.dateRange.from, to: data.dateRange.to },
          });
        }
      } catch (error) {
        logger.error('Error verifying conflicts', { data: { error } });
        toast.error('Error al verificar conflictos. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    },
    [setLoading, onConflictsFound]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const submitLabel = mode === 'novelty' ? 'Verificar y Cargar Novedad' : 'Verificar y Crear Diagramas';

  return (
    <div className="space-y-6">
      {/* ── Top form: mode selector + main selects + date range ── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleVerifyAndSubmit)} className="space-y-6">
          {/* ─── Mode selector ─── */}
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <label className="text-sm font-medium leading-none">Tipo de carga</label>
                <RadioGroup
                  value={field.value}
                  onValueChange={(val) => handleModeChange(val as 'diagram' | 'novelty')}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <label
                    htmlFor="mode-diagram"
                    className={cn(
                      'relative flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors',
                      'hover:bg-accent/40',
                      field.value === 'diagram' ? 'border-primary bg-primary/5' : 'border-muted'
                    )}
                  >
                    <RadioGroupItem value="diagram" id="mode-diagram" className="mt-1" />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-primary" />
                        <span className="font-medium">Diagrama</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Aplica un patrón cíclico (activos/inactivos) a los empleados durante el rango.
                      </span>
                    </div>
                  </label>
                  <label
                    htmlFor="mode-novelty"
                    className={cn(
                      'relative flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors',
                      'hover:bg-accent/40',
                      field.value === 'novelty' ? 'border-primary bg-primary/5' : 'border-muted'
                    )}
                  >
                    <RadioGroupItem value="novelty" id="mode-novelty" className="mt-1" />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">Novedad</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Asigna la misma novedad a todos los días del rango (ej: feriado, licencia).
                      </span>
                    </div>
                  </label>
                </RadioGroup>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ─── Diagram mode: work diagram select ─── */}
          {mode === 'diagram' && (
            <FormField
              control={form.control}
              name="workDiagramId"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium leading-none">Diagrama de trabajo</label>
                  {isLoadingDiagrams ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={field.value ?? ''} onValueChange={(val) => handleWorkDiagramChange(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar diagrama..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workDiagrams.map((wd) => (
                          <SelectItem key={wd.id} value={wd.id}>
                            {wd.name}
                            {wd.active_working_days != null && wd.inactive_working_days != null && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                ({wd.active_working_days}x{wd.inactive_working_days})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* ─── Diagram mode: active novelty select (only when > 1 option) ─── */}
          {mode === 'diagram' && showActiveNoveltySelect && noveltyData && (
            <FormField
              control={form.control}
              name="activeNoveltyId"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium leading-none">Novedad activa</label>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar novedad activa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {noveltyData.activeNovelties.map((novelty) => (
                        <SelectItem key={novelty.diagram_type_id} value={novelty.diagram_type_id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: novelty.color ?? undefined }}
                            />
                            {novelty.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* ─── Diagram mode: novelty info badges ─── */}
          {mode === 'diagram' && noveltyData && (
            <div className="flex flex-wrap gap-2">
              {noveltyData.activeNovelties.length === 1 && (
                <Badge
                  style={{ backgroundColor: noveltyData.activeNovelties[0].color ?? undefined }}
                  className="text-white"
                >
                  Activo: {noveltyData.activeNovelties[0].name}
                </Badge>
              )}
              {noveltyData.inactiveNovelty && (
                <Badge
                  style={{ backgroundColor: noveltyData.inactiveNovelty.color ?? undefined }}
                  className="text-white"
                >
                  Inactivo: {noveltyData.inactiveNovelty.name}
                </Badge>
              )}
            </div>
          )}

          {/* ─── Novelty mode: single diagram_type select ─── */}
          {mode === 'novelty' && (
            <FormField
              control={form.control}
              name="diagramTypeId"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium leading-none">Novedad</label>
                  {isLoadingDiagramTypes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar novedad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {diagramTypes.map((dt) => (
                          <SelectItem key={dt.id} value={dt.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: dt.color }}
                              />
                              {dt.name}
                              {dt.short_description && (
                                <span className="ml-2 text-muted-foreground text-xs">· {dt.short_description}</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* ─── Date range picker + day counter (lado derecho) ─── */}
          <div className="flex items-start gap-2">
            <FormItemDatePicker
              name="dateRange"
              control={form.control}
              label="Rango de fechas"
              description="Selecciona el rango de fechas para la carga masiva"
              disabled={(date) => date < new Date()}
              className="flex-1"
            />
            {days > 0 && (
              <Badge variant="secondary" className="mt-7 h-10 shrink-0 whitespace-nowrap px-3 font-mono text-sm">
                {days} {days === 1 ? 'día' : 'días'}
              </Badge>
            )}
          </div>
        </form>
      </Form>

      {/* ── Employee filters ── */}
      <EmployeeFilterPanel
        filters={filters}
        activeFilters={activeFilters}
        showFilters={showFilters}
        isSearching={isSearching}
        onFiltersChange={setFilters}
        onActiveFiltersChange={setActiveFilters}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
        onSubmit={handleFilterSubmit}
        onClearAll={clearAllFilters}
      />

      {/* ── Employee grid ── */}
      <EmployeeSelectionGrid
        employees={employees}
        selectedIds={form.watch('employeeIds')}
        maxEmployees={MAX_EMPLOYEES}
        isSearching={isSearching}
        hasSearched={hasSearched}
        hasMoreData={hasMoreData}
        onToggle={handleEmployeeToggle}
        onSelectAll={(ids) => form.setValue('employeeIds', ids)}
        onClearSelection={() => form.setValue('employeeIds', [])}
        onLoadMore={loadMoreData}
      />

      {/* ── Employee selection error ── */}
      {form.formState.errors.employeeIds && (
        <p className="text-sm text-destructive">{form.formState.errors.employeeIds.message}</p>
      )}

      {/* ── Bottom form: summary + submit (only when employees loaded) ── */}
      {employees.length > 0 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleVerifyAndSubmit)} className="space-y-6">
            {employeeCount > 0 && days > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen de la operación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{employeeCount}</div>
                      <div className="text-sm text-muted-foreground">Empleados</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{days}</div>
                      <div className="text-sm text-muted-foreground">Días</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{totalRecords}</div>
                      <div className="text-sm text-muted-foreground">Registros</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{estimatedTime}</div>
                      <div className="text-sm text-muted-foreground">Tiempo Est.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full" disabled={loading || employeeCount === 0}>
              {loading ? 'Verificando...' : submitLabel}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
