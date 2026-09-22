'use client';

import { getStoreCompanies } from '@/shared/actions/session.server';
import { useLoggedUserStore } from '@/shared/store/loggedUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const COMPANIES_QUERY_KEY = ['user-companies'] as const;

/**
 * Empresas propias y compartidas del usuario de sesión (React Query sobre `getStoreCompanies`).
 * `fetchCompanies()` refresca la lista y la sincroniza con `useLoggedUserStore.allCompanies`
 * (lo que antes hacía el hook consultando PostgREST desde el navegador).
 */
export const useCompanyData = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: COMPANIES_QUERY_KEY,
    queryFn: getStoreCompanies,
    staleTime: 5 * 60 * 1000,
  });

  const fetchCompanies = useCallback(async () => {
    const result = await queryClient.fetchQuery({ queryKey: COMPANIES_QUERY_KEY, queryFn: getStoreCompanies, staleTime: 0 });
    useLoggedUserStore.setState({ allCompanies: result.allCompanies, sharedCompanies: result.sharedCompanies });
    return result;
  }, [queryClient]);

  return {
    allCompanies: query.data?.allCompanies ?? [],
    sharedCompanies: query.data?.sharedCompanies ?? [],
    isLoading: query.isLoading,
    error: query.error,
    fetchCompanies,
  };
};
