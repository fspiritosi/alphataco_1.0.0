'use client';

import { useQuery } from '@tanstack/react-query';
import { getChecklistIdsForType } from '../../EquipmentTypes/actions.server';

export function useTypeChecklists(typeId: string | null) {
  return useQuery({
    queryKey: ['type-checklists', typeId],
    queryFn: () => getChecklistIdsForType(typeId!),
    enabled: !!typeId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
  });
}
