import { useQuery } from '@tanstack/react-query';

// Función para obtener los datos del daily report
async function fetchDailyReportData(dailyReportId: string) {
  // Aquí deberías importar y usar la función que obtiene los datos
  // Por ahora, retorno un placeholder
  // TODO: Implementar la función de fetch real
  return [];
}

export function useDailyReportData(dailyReportId: string) {
  return useQuery({
    queryKey: ['daily-report-rows', dailyReportId],
    queryFn: () => fetchDailyReportData(dailyReportId),
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}
