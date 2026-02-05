'use client';

import { fetchContractsByClientId } from '@/app/dashboard/employee/action/actions/actions';
import { fetchServiceItems } from '@/features/Empresa/Clientes/actions/items';
import {
  fetchAreasByContract,
  fetchEquipmentsByCustomer,
  fetchSectorsByContract,
} from '@/features/Operaciones/Preparte/actions/actions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Tipos de retorno inferidos de las acciones
export type Contrato = Awaited<ReturnType<typeof fetchContractsByClientId>>[number];
export type ServiceItem = Awaited<ReturnType<typeof fetchServiceItems>>[number];
export type Sector = Awaited<ReturnType<typeof fetchSectorsByContract>>[number];
export type Area = Awaited<ReturnType<typeof fetchAreasByContract>>[number];
export type Equipment = Awaited<ReturnType<typeof fetchEquipmentsByCustomer>>[number];

/**
 * Hook para obtener contratos por cliente
 * Se activa solo cuando hay un clienteId válido
 */
export function useContratos(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['preparte-contratos', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      return fetchContractsByClientId(clienteId);
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener items de servicio por contrato
 * Se activa solo cuando hay un contratoId válido
 */
export function useServiceItems(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['preparte-service-items', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      return fetchServiceItems(contratoId);
    },
    enabled: !!contratoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener sectores por contrato
 * Se activa solo cuando hay un contratoId válido
 */
export function useSectors(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['preparte-sectors', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      return fetchSectorsByContract(contratoId);
    },
    enabled: !!contratoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener áreas por contrato
 * Se activa solo cuando hay un contratoId válido
 */
export function useAreas(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['preparte-areas', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      return fetchAreasByContract(contratoId);
    },
    enabled: !!contratoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener equipos por cliente
 * Se activa solo cuando hay un clienteId válido
 */
export function useEquipments(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['preparte-equipments', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      return fetchEquipmentsByCustomer(clienteId);
    },
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook combinado para obtener todas las opciones dependientes del formulario
 * Útil cuando necesitas cargar sectores, áreas y equipos de forma coordinada
 */
export function usePreparteFormDependentOptions(clienteId: string | undefined, contratoId: string | undefined) {
  const sectorsQuery = useSectors(contratoId);
  const areasQuery = useAreas(contratoId);
  const equipmentsQuery = useEquipments(clienteId);

  return {
    sectors: sectorsQuery.data || [],
    areas: areasQuery.data || [],
    equipments: equipmentsQuery.data || [],
    isLoading: sectorsQuery.isLoading || areasQuery.isLoading || equipmentsQuery.isLoading,
    isError: sectorsQuery.isError || areasQuery.isError || equipmentsQuery.isError,
  };
}

/**
 * Hook para invalidar las queries de preparte
 * Útil después de mutaciones para refrescar los datos
 */
export function usePreparteQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidatePreparteQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['prepartes'] });
    queryClient.invalidateQueries({ queryKey: ['preparte-table'] });
  };

  const invalidateFormOptions = (clienteId?: string, contratoId?: string) => {
    if (clienteId) {
      queryClient.invalidateQueries({ queryKey: ['preparte-contratos', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['preparte-equipments', clienteId] });
    }
    if (contratoId) {
      queryClient.invalidateQueries({ queryKey: ['preparte-service-items', contratoId] });
      queryClient.invalidateQueries({ queryKey: ['preparte-sectors', contratoId] });
      queryClient.invalidateQueries({ queryKey: ['preparte-areas', contratoId] });
    }
  };

  return {
    invalidatePreparteQueries,
    invalidateFormOptions,
  };
}
