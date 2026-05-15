export interface StatusDef {
  label: string;
  badgeClass: string;
  borderClass: string;
}

export const STATUS_BY_SLUG: Record<string, StatusDef> = {
  open: {
    label: 'Abierto',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderClass: 'border-l-blue-500',
  },
  in_progress: {
    label: 'En curso',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    borderClass: 'border-l-amber-500',
  },
  blocked: {
    label: 'Bloqueado',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderClass: 'border-l-red-500',
  },
  done: {
    label: 'Resuelto',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    borderClass: 'border-l-emerald-500',
  },
  closed: {
    label: 'Cerrado',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    borderClass: 'border-l-slate-400',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    borderClass: 'border-l-slate-400',
  },
};

export function statusFor(slug: string | undefined, fallbackName?: string): StatusDef {
  if (slug && STATUS_BY_SLUG[slug]) return STATUS_BY_SLUG[slug];
  return {
    label: fallbackName ?? slug ?? 'Desconocido',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    borderClass: 'border-l-slate-400',
  };
}
