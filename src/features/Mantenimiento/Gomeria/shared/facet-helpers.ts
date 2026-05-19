import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { FacetResult } from '@/shared/components/common/DataTable/types';
import type { LucideIcon } from 'lucide-react';
import { CircleOff } from 'lucide-react';

export function buildEnumFacetResult(
  enumValues: string[],
  labels: Record<string, string>,
  icons: Record<string, LucideIcon | undefined> | undefined,
  counts: Map<string, number>
): FacetResult {
  return {
    options: [
      ...enumValues.map((value) => ({
        value,
        label: labels[value] ?? value,
        ...(icons?.[value] ? { icon: icons[value] } : {}),
      })),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }] : []),
    ],
    counts,
  };
}

export function buildFkFacetResult(
  resolvedOptions: Array<{ id: string; name: string | null }> | undefined,
  counts: Map<string, number>,
  nullLabel = 'Sin asignar'
): FacetResult {
  return {
    options: [
      ...(resolvedOptions?.map((o) => ({ value: o.id, label: o.name ?? '' })) ?? []),
      ...(counts.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: nullLabel, icon: CircleOff }] : []),
    ],
    counts,
  };
}
