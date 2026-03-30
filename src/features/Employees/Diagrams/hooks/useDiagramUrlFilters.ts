'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';

const NAMESPACE = 'diagOld_';

// Keys that are arrays (comma-separated in URL)
const ARRAY_KEYS = [
  'position',
  'workflow',
  'costCenter',
  'covenant',
  'guild',
  'category',
  'contractor',
  'diagramType',
] as const;

// Keys that are plain strings
const STRING_KEYS = ['firstname', 'lastname'] as const;

type ArrayKey = (typeof ARRAY_KEYS)[number];
type StringKey = (typeof STRING_KEYS)[number];

export type DiagramFilterState = {
  [K in StringKey]: string;
} & {
  [K in ArrayKey]: string[];
};

export const DEFAULT_FILTERS: DiagramFilterState = {
  firstname: '',
  lastname: '',
  position: [],
  workflow: [],
  costCenter: [],
  covenant: [],
  guild: [],
  category: [],
  contractor: [],
  diagramType: [],
};

/**
 * Reads `diagOld_*` params from the server-provided searchParams (initial mount).
 */
function parseInitialFilters(
  serverParams: Record<string, string | string[] | undefined>
): { filters: DiagramFilterState; hasUrlFilters: boolean } {
  const filters = { ...DEFAULT_FILTERS };
  let hasAny = false;

  for (const key of STRING_KEYS) {
    const raw = serverParams[`${NAMESPACE}${key}`];
    if (typeof raw === 'string' && raw.trim()) {
      filters[key] = raw.trim();
      hasAny = true;
    }
  }

  for (const key of ARRAY_KEYS) {
    const raw = serverParams[`${NAMESPACE}${key}`];
    if (typeof raw === 'string' && raw.trim()) {
      filters[key] = raw.split(',').filter(Boolean);
      hasAny = true;
    }
  }

  return { filters, hasUrlFilters: hasAny };
}

/**
 * Hook that syncs diagram filter state with URL params using `diagOld_` namespace.
 *
 * - On mount: parses server searchParams for initial filters.
 * - `syncToUrl(filters)`: writes current filters to URL via `router.replace`.
 * - `clearUrl()`: removes all `diagOld_*` params from URL.
 * - `hasUrlFilters`: whether there were filters in the URL at mount time (for auto-submit).
 */
export function useDiagramUrlFilters(serverSearchParams: Record<string, string | string[] | undefined>) {
  const router = useRouter();
  const pathname = usePathname();
  const clientSearchParams = useSearchParams();

  // Parse initial filters ONCE from server params
  const initial = useMemo(() => parseInitialFilters(serverSearchParams), [serverSearchParams]);
  const hasUrlFiltersRef = useRef(initial.hasUrlFilters);

  const syncToUrl = useCallback(
    (filters: DiagramFilterState) => {
      const params = new URLSearchParams(clientSearchParams.toString());

      // Remove all existing diagOld_ params first
      const keysToRemove: string[] = [];
      params.forEach((_val, key) => {
        if (key.startsWith(NAMESPACE)) keysToRemove.push(key);
      });
      keysToRemove.forEach((k) => params.delete(k));

      // Write current filters
      for (const key of STRING_KEYS) {
        if (filters[key].trim()) {
          params.set(`${NAMESPACE}${key}`, filters[key].trim());
        }
      }
      for (const key of ARRAY_KEYS) {
        if (filters[key].length > 0) {
          params.set(`${NAMESPACE}${key}`, filters[key].join(','));
        }
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [clientSearchParams, pathname, router]
  );

  const clearUrl = useCallback(() => {
    const params = new URLSearchParams(clientSearchParams.toString());
    const keysToRemove: string[] = [];
    params.forEach((_val, key) => {
      if (key.startsWith(NAMESPACE)) keysToRemove.push(key);
    });
    keysToRemove.forEach((k) => params.delete(k));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [clientSearchParams, pathname, router]);

  return {
    initialFilters: initial.filters,
    hasUrlFilters: hasUrlFiltersRef.current,
    syncToUrl,
    clearUrl,
  };
}
