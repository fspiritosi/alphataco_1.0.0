import {
  Calendar,
  ClipboardList,
  FileText,
  HandHelping,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type CategorySlug =
  | 'dashboard'
  | 'configuracion'
  | 'empleados'
  | 'equipos'
  | 'comercial'
  | 'documentacion'
  | 'operaciones'
  | 'mantenimiento'
  | 'formularios'
  | 'otro';

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { slug: 'configuracion', label: 'Configuración', icon: Settings },
  { slug: 'empleados', label: 'Empleados', icon: Users },
  { slug: 'equipos', label: 'Equipos', icon: Truck },
  { slug: 'comercial', label: 'Comercial', icon: HandHelping },
  { slug: 'documentacion', label: 'Documentación', icon: FileText },
  { slug: 'operaciones', label: 'Operaciones', icon: Calendar },
  { slug: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { slug: 'formularios', label: 'Formularios', icon: ClipboardList },
  { slug: 'otro', label: 'Otro', icon: MoreHorizontal },
];

export const CATEGORY_BY_SLUG: Record<CategorySlug, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
) as Record<CategorySlug, CategoryDef>;

/**
 * Labels que usaron los tickets ya creados y hoy no existen más.
 *
 * La categoría viaja a TaskApp dentro del título (`[Empresa] No puedo...`) y se resuelve de
 * vuelta POR LABEL, así que renombrar una categoría deja huérfanos a los tickets viejos: el
 * chip desaparece y el filtro por categoría deja de encontrarlos. El título de un ticket ya
 * enviado no se reescribe, así que el alias se queda.
 */
const LEGACY_CATEGORY_LABELS: Record<string, CategorySlug> = {
  Empresa: 'configuracion',
};

const CATEGORY_BY_LABEL: Record<string, CategoryDef> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.label, c])),
  ...Object.fromEntries(
    Object.entries(LEGACY_CATEGORY_LABELS).map(([label, slug]) => [
      label,
      CATEGORIES.find((c) => c.slug === slug)!,
    ])
  ),
};

const CATEGORY_PREFIX_RE = /^\[([^\]]+)\]\s*(.*)$/;

export function parseCategoryFromTitle(title: string): {
  categoryLabel: string | null;
  categoryDef: CategoryDef | null;
  cleanTitle: string;
} {
  const match = title.match(CATEGORY_PREFIX_RE);
  if (!match) return { categoryLabel: null, categoryDef: null, cleanTitle: title };
  const label = match[1];
  return {
    categoryLabel: label,
    categoryDef: CATEGORY_BY_LABEL[label] ?? null,
    cleanTitle: match[2] || title,
  };
}

export function buildTitleWithCategory(category: CategorySlug, rawTitle: string): string {
  const label = CATEGORY_BY_SLUG[category]?.label ?? 'Otro';
  return `[${label}] ${rawTitle.trim()}`;
}
