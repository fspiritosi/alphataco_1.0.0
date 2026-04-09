import type { QueryClient } from '@tanstack/react-query';

export function invalidateAllClothingQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['clothing-brands'] });
  queryClient.invalidateQueries({ queryKey: ['clothing-sizes'] });
  queryClient.invalidateQueries({ queryKey: ['clothing-items'] });
  queryClient.invalidateQueries({ queryKey: ['clothing-reports'] });
  queryClient.invalidateQueries({ queryKey: ['employee-deliveries'] });
}
