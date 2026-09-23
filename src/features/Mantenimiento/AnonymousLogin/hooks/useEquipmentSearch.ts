'use client';

import { searchEquipmentByDomain } from '@/features/Mantenimiento/actions/maintenance-actions';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';

const MIN_SEARCH_LENGTH = 2;

export type EquipmentSearchOption = {
  id: string;
  label: string;
  domain: string | null;
  serie: string | null;
};

/**
 * Búsqueda de equipos por dominio o serie para el login del QR.
 *
 * Corre antes del login, así que la action no puede acotar por empresa: devuelve sólo los
 * identificadores del cartel del equipo. React Query sobre la server action reemplaza al
 * `useEffect` + `setState` que hacía el fetch a mano.
 */
export function useEquipmentSearch(searchTerm: string) {
  const trimmed = searchTerm.trim();
  const debouncedTerm = useDebounce(trimmed, 300);
  const isSearchable = debouncedTerm.length >= MIN_SEARCH_LENGTH;

  const { data = [], isFetching } = useQuery({
    queryKey: ['maintenance-equipment-search', debouncedTerm],
    queryFn: async (): Promise<EquipmentSearchOption[]> => {
      const result = await searchEquipmentByDomain(debouncedTerm);
      if (!result.ok) return [];
      return result.equipment.map(({ id, label, domain, serie }) => ({ id, label, domain, serie }));
    },
    enabled: isSearchable,
    staleTime: 60 * 1000,
  });

  return {
    options: isSearchable ? data : [],
    isSearching: isSearchable && isFetching,
    /** El usuario todavía no tipeó lo suficiente como para disparar la búsqueda. */
    isTermTooShort: trimmed.length < MIN_SEARCH_LENGTH,
  };
}
