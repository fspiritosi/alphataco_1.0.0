'use client';

import { getActiveChecklistsForSubType } from '@/features/Empresa/Equipos/EquipmentSubTypes/actions.server';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook para obtener checklists activos.
 * Migrado de supabaseBrowser a server action con Prisma.
 */
export function useActiveChecklists() {
  return useQuery({
    queryKey: ['active-checklists'],
    queryFn: () => getActiveChecklistsForSubType(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
}
