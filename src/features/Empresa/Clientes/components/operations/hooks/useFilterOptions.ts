import { useQuery } from '@tanstack/react-query';
import {
  getFilterAreas,
  getFilterCustomerEquipments,
  getFilterCustomers,
  getFilterEmployees,
  getFilterEquipment,
  getFilterItems,
  getFilterSectors,
  getFilterServices,
} from '../actions/actions';

export function useFilterOptions() {
  // Fetch customers
  const customersQuery = useQuery({
    queryKey: ['filter-customers'],
    queryFn: getFilterCustomers,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Fetch services
  const servicesQuery = useQuery({
    queryKey: ['filter-services'],
    queryFn: getFilterServices,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch employees
  const employeesQuery = useQuery({
    queryKey: ['filter-employees'],
    queryFn: getFilterEmployees,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch equipment
  const equipmentQuery = useQuery({
    queryKey: ['filter-equipment'],
    queryFn: getFilterEquipment,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch items
  const itemsQuery = useQuery({
    queryKey: ['filter-items'],
    queryFn: getFilterItems,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch customer equipments
  const customerEquipmentsQuery = useQuery({
    queryKey: ['filter-customer-equipments'],
    queryFn: getFilterCustomerEquipments,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch areas
  const areasQuery = useQuery({
    queryKey: ['filter-areas'],
    queryFn: getFilterAreas,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sectors
  const sectorsQuery = useQuery({
    queryKey: ['filter-sectors'],
    queryFn: getFilterSectors,
    staleTime: 5 * 60 * 1000,
  });

  return {
    // Data
    customers: customersQuery.data || [],
    services: servicesQuery.data || [],
    employees: employeesQuery.data || [],
    equipment: equipmentQuery.data || [],
    items: itemsQuery.data || [],
    customerEquipments: customerEquipmentsQuery.data || [],
    areas: areasQuery.data || [],
    sectors: sectorsQuery.data || [],

    // Loading states individuales
    isLoadingCustomers: customersQuery.isLoading,
    isLoadingServices: servicesQuery.isLoading,
    isLoadingEmployees: employeesQuery.isLoading,
    isLoadingEquipment: equipmentQuery.isLoading,
    isLoadingItems: itemsQuery.isLoading,
    isLoadingCustomerEquipments: customerEquipmentsQuery.isLoading,
    isLoadingAreas: areasQuery.isLoading,
    isLoadingSectors: sectorsQuery.isLoading,

    // Loading state general
    isLoading:
      customersQuery.isLoading ||
      servicesQuery.isLoading ||
      employeesQuery.isLoading ||
      equipmentQuery.isLoading ||
      itemsQuery.isLoading ||
      customerEquipmentsQuery.isLoading ||
      areasQuery.isLoading ||
      sectorsQuery.isLoading,

    // Error states
    errors: {
      customers: customersQuery.error,
      services: servicesQuery.error,
      employees: employeesQuery.error,
      equipment: equipmentQuery.error,
      items: itemsQuery.error,
      customerEquipments: customerEquipmentsQuery.error,
      areas: areasQuery.error,
      sectors: sectorsQuery.error,
    },

    // Refetch functions
    refetch: {
      customers: customersQuery.refetch,
      services: servicesQuery.refetch,
      employees: employeesQuery.refetch,
      equipment: equipmentQuery.refetch,
      items: itemsQuery.refetch,
      customerEquipments: customerEquipmentsQuery.refetch,
      areas: areasQuery.refetch,
      sectors: sectorsQuery.refetch,
    },
  };
}
