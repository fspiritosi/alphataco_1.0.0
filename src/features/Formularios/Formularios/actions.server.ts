'use server';

import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Formularios/list/actions.server');

// ============================================================================
// CONSTANTES
// ============================================================================

/** Params de URL de navegación que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab']);

/** Columnas con filtro de texto libre (IDs de columna == campo en Prisma) */
const TEXT_FILTER_COLUMNS = ['name', 'description', 'code'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at'];

/**
 * Tipo normalizado que unifica custom_form y checklist_templates.
 * Usado internamente para combinar ambas fuentes.
 */
export type FormListItem = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  source: 'custom_form' | 'checklist_template';
  is_active: boolean;
  created_at: Date;
  total_responses: number;
  frequency: string | null;
};

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Construye el WHERE clause para checklist_templates.
 * custom_form no tiene filtros por campo (sin is_active, sin code).
 */
function buildChecklistWhere(state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['name', 'description', 'code']);

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // is_active manual
  const manualFilters: Record<string, unknown> = {};
  const isActiveValues = state.filters['is_active'];
  if (isActiveValues?.length) {
    if (isActiveValues.includes(NULL_FILTER_VALUE)) {
      manualFilters.is_active = null;
    } else {
      const boolVal = isActiveValues[0] === 'true';
      manualFilters.is_active = boolVal;
    }
  }

  return {
    ...searchWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...manualFilters,
  };
}

function buildCustomFormWhere(state: ReturnType<typeof parseSearchParams>) {
  // custom_form solo tiene 'name' como campo de texto filtrable (sin description ni code)
  const searchWhere = buildSearchWhere(state.search, ['name']);
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name']);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  return {
    ...searchWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

// ============================================================================
// FUNCIONES DE TRANSFORMACIÓN
// ============================================================================

function mapChecklistTemplate(t: {
  id: string;
  name: string;
  description: string | null;
  code: string;
  is_active: boolean | null;
  created_at: Date | null;
  checklist_answers: { id: string }[];
}): FormListItem {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    code: t.code,
    source: 'checklist_template',
    is_active: t.is_active ?? true,
    created_at: t.created_at ?? new Date(),
    total_responses: t.checklist_answers.length,
    frequency: null,
  };
}

function mapCustomForm(f: {
  id: string;
  name: string;
  form: unknown;
  created_at: Date;
  form_answers: { id: string }[];
}): FormListItem {
  const formData = f.form as Record<string, string> | null;
  return {
    id: f.id,
    name: formData?.title || f.name,
    description: formData?.description || null,
    code: null,
    source: 'custom_form',
    is_active: true, // custom_form siempre activo (no tiene campo is_active)
    created_at: f.created_at,
    total_responses: f.form_answers.length,
    frequency: formData?.frequency || null,
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getFormsPaginated(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    // Filtros de source
    const sourceFilter = state.filters['source'];
    const includeChecklist = !sourceFilter?.length || sourceFilter.includes('checklist_template');
    const includeCustomForm = !sourceFilter?.length || sourceFilter.includes('custom_form');

    const checklistWhere = buildChecklistWhere(state);
    const customFormWhere = buildCustomFormWhere(state);

    // Si hay filtro is_active activo, los custom_forms (siempre activos) se excluyen
    // cuando el usuario filtra por "Inactivo" o "Sin asignar"
    const isActiveValues = state.filters['is_active'];
    const hasIsActiveFilter = isActiveValues?.length > 0;
    const includeCustomFormByActive =
      !hasIsActiveFilter || isActiveValues.includes('true') || isActiveValues.includes(NULL_FILTER_VALUE);

    // Fetch en paralelo
    const [checklists, customForms] = await Promise.all([
      includeChecklist
        ? prisma.checklist_templates.findMany({
            where: checklistWhere,
            select: {
              id: true,
              name: true,
              description: true,
              code: true,
              is_active: true,
              created_at: true,
              checklist_answers: { select: { id: true } },
            },
          })
        : Promise.resolve([]),
      includeCustomForm && includeCustomFormByActive
        ? prisma.custom_form.findMany({
            where: customFormWhere,
            select: {
              id: true,
              name: true,
              form: true,
              created_at: true,
              form_answers: { select: { id: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Combinar y normalizar
    const checklistMapped = checklists.map(mapChecklistTemplate);
    const customFormMapped = customForms.map(mapCustomForm);

    // Campos válidos para sort dinámico (whitelist explícita)
    const VALID_SORT_FIELDS = new Set([
      'name',
      'created_at',
      'is_active',
      'total_responses',
      'source',
      'code',
      'description',
    ]);

    const allForms: FormListItem[] = [...checklistMapped, ...customFormMapped].sort((a, b) => {
      // Activos primero como criterio estable base
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;

      // Aplicar el sort del usuario si hay sorting activo y el campo es válido
      const userSort = state.sorting[0];
      if (userSort && VALID_SORT_FIELDS.has(userSort.id)) {
        const dir = userSort.desc ? -1 : 1;
        const aVal = a[userSort.id as keyof FormListItem];
        const bVal = b[userSort.id as keyof FormListItem];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return dir;
        if (bVal == null) return -dir;

        if (aVal instanceof Date && bVal instanceof Date) {
          return (aVal.getTime() - bVal.getTime()) * dir;
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * dir;
        }

        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          return (Number(aVal) - Number(bVal)) * dir;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return aStr.localeCompare(bStr) * dir;
      }

      // Fallback: por fecha desc
      return b.created_at.getTime() - a.created_at.getTime();
    });

    // Paginación manual (ya que combinamos 2 fuentes)
    const skip = state.page * state.pageSize;
    const take = state.pageSize;
    const total = allForms.length;
    const data = allForms.slice(skip, skip + take);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener formularios paginados', { data: { error } });
    throw new Error('No se pudo obtener la lista de formularios. Intente nuevamente.');
  }
}

export type FormsListItem = Awaited<ReturnType<typeof getFormsPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllFormsForExport(searchParams: DataTableSearchParams) {
  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const sourceFilter = state.filters['source'];
    const includeChecklist = !sourceFilter?.length || sourceFilter.includes('checklist_template');
    const includeCustomForm = !sourceFilter?.length || sourceFilter.includes('custom_form');

    const checklistWhere = buildChecklistWhere(state);
    const customFormWhere = buildCustomFormWhere(state);

    const isActiveValues = state.filters['is_active'];
    const hasIsActiveFilter = isActiveValues?.length > 0;
    const includeCustomFormByActive =
      !hasIsActiveFilter || isActiveValues.includes('true') || isActiveValues.includes(NULL_FILTER_VALUE);

    const [checklists, customForms] = await Promise.all([
      includeChecklist
        ? prisma.checklist_templates.findMany({
            where: checklistWhere,
            select: {
              id: true,
              name: true,
              description: true,
              code: true,
              is_active: true,
              created_at: true,
              checklist_answers: { select: { id: true } },
            },
          })
        : Promise.resolve([]),
      includeCustomForm && includeCustomFormByActive
        ? prisma.custom_form.findMany({
            where: customFormWhere,
            select: {
              id: true,
              name: true,
              form: true,
              created_at: true,
              form_answers: { select: { id: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const allForms: FormListItem[] = [...checklists.map(mapChecklistTemplate), ...customForms.map(mapCustomForm)].sort(
      (a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return b.created_at.getTime() - a.created_at.getTime();
      }
    );

    return allForms;
  } catch (error) {
    logger.error('Error al exportar formularios', { data: { error } });
    throw new Error('No se pudo exportar la lista de formularios. Intente nuevamente.');
  }
}

// ============================================================================
// FACETS (cross-filtering: texto + dateRange + faceted)
// ============================================================================

/**
 * Construye WHERE para facets, excluyendo el filtro de una columna específica
 * (patrón crossWhere idéntico al de Vehicles/OtherEquipment/Employees).
 */
function crossChecklistWhere(state: ReturnType<typeof parseSearchParams>, excludeColumn: string) {
  const modified = { ...state, filters: { ...state.filters } };
  delete modified.filters[excludeColumn];
  delete modified.filters[`${excludeColumn}_from`];
  delete modified.filters[`${excludeColumn}_to`];
  return buildChecklistWhere(modified);
}

function crossCustomFormWhere(state: ReturnType<typeof parseSearchParams>, excludeColumn: string) {
  const modified = { ...state, filters: { ...state.filters } };
  delete modified.filters[excludeColumn];
  delete modified.filters[`${excludeColumn}_from`];
  delete modified.filters[`${excludeColumn}_to`];
  return buildCustomFormWhere(modified);
}

export async function getFormsFacets(searchParams?: DataTableSearchParams) {
  try {
    // Parsear filtros activos
    let parsedState: ReturnType<typeof parseSearchParams> | null = null;
    if (searchParams && Object.keys(searchParams).length > 0) {
      parsedState = parseSearchParams(searchParams);
      for (const key of IGNORED_PARAMS) {
        delete parsedState.filters[key];
      }
    }

    const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

    // ── Facet is_active: WHERE con todos los filtros EXCEPTO is_active ──
    // Para checklist_templates: cross-filter excluyendo is_active
    // Para custom_form: aplicar todos los filtros (custom_form no tiene is_active)
    const checklistWhereForIsActive =
      parsedState && hasActiveFilters ? crossChecklistWhere(parsedState, 'is_active') : {};
    const customFormWhereForIsActive =
      parsedState && hasActiveFilters ? crossCustomFormWhere(parsedState, 'is_active') : {};

    // Además, para custom_form en el facet is_active: si hay filtro source activo
    // que excluye custom_form, el count de custom_form debe ser 0
    const sourceFilter = parsedState?.filters['source'] ?? [];
    const includeCustomFormInIsActive = !sourceFilter.length || sourceFilter.includes('custom_form');
    const includeChecklistInIsActive = !sourceFilter.length || sourceFilter.includes('checklist_template');

    // ── Facet source: WHERE con todos los filtros EXCEPTO source ──
    const checklistWhereForSource = parsedState && hasActiveFilters ? crossChecklistWhere(parsedState, 'source') : {};
    const customFormWhereForSource = parsedState && hasActiveFilters ? crossCustomFormWhere(parsedState, 'source') : {};

    // Para el facet source, si hay filtro is_active que excluye activos,
    // custom_form (siempre activo) debe quedar en 0
    const isActiveFilter = parsedState?.filters['is_active'] ?? [];
    const includeCustomFormInSource =
      !isActiveFilter.length || isActiveFilter.includes('true') || isActiveFilter.includes(NULL_FILTER_VALUE);

    // Queries en paralelo
    const [checklistIsActiveCounts, checklistCountForSource, customFormCountForSource] = await Promise.all([
      // Facet is_active: groupBy sobre checklist_templates
      includeChecklistInIsActive
        ? prisma.checklist_templates.groupBy({
            by: ['is_active'],
            where: checklistWhereForIsActive,
            _count: true,
          })
        : Promise.resolve([]),
      // Facet source: count checklist_templates
      prisma.checklist_templates.count({ where: checklistWhereForSource }),
      // Facet source: count custom_form
      includeCustomFormInSource ? prisma.custom_form.count({ where: customFormWhereForSource }) : Promise.resolve(0),
    ]);

    // Count de custom_form para el facet is_active (custom_form siempre = activo)
    const customFormCountForIsActive = includeCustomFormInIsActive
      ? await prisma.custom_form.count({ where: customFormWhereForIsActive })
      : 0;

    // ── Construir Map is_active ──
    const isActiveMap = new Map<string, number>();
    for (const row of checklistIsActiveCounts) {
      if (row.is_active === null) {
        isActiveMap.set(NULL_FILTER_VALUE, (isActiveMap.get(NULL_FILTER_VALUE) ?? 0) + row._count);
      } else {
        const key = String(row.is_active);
        isActiveMap.set(key, (isActiveMap.get(key) ?? 0) + row._count);
      }
    }
    // custom_form siempre activo → sumar al count de "true"
    if (customFormCountForIsActive > 0) {
      isActiveMap.set('true', (isActiveMap.get('true') ?? 0) + customFormCountForIsActive);
    }

    // ── Construir Map source ──
    const sourceMap = new Map<string, number>();
    if (checklistCountForSource > 0) {
      sourceMap.set('checklist_template', checklistCountForSource);
    }
    if (customFormCountForSource > 0) {
      sourceMap.set('custom_form', customFormCountForSource);
    }

    return {
      is_active: isActiveMap,
      source: sourceMap,
    };
  } catch (error) {
    logger.error('Error al obtener facets de formularios', { data: { error } });
    return null;
  }
}

export type FormsFacets = Awaited<ReturnType<typeof getFormsFacets>>;
