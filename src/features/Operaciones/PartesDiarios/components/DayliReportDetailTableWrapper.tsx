import { cookies } from 'next/headers';
import {
  getActiveEquipmentsForDailyReport,
  getAllActiveEmployeesForDailyReport,
  getCustomers,
  getDailyReportById,
} from '../actions/actions';
import { DayliReportDetailTable } from './DayliReportDetailTable';

export async function DayliReportDetailTableWrapper({
  // dailyReport,
  params,
}: {
  // dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
  params: { uuid: string };
}) {
  const cookiesStore = await cookies();
  const savedVisibility = cookiesStore.get('dailyReportTableDetail')?.value;
  const savedFilter = cookiesStore.get('dailyReportTableDetail-filters')?.value;
  const customers = await getCustomers();
  const dailyReport = await getDailyReportById(params.uuid);
  // Obtener la fecha del parte para pasar a la función de empleados
  const reportDate = dailyReport?.[0]?.date;
  const employees = getAllActiveEmployeesForDailyReport(reportDate);
  const equipments = getActiveEquipmentsForDailyReport();

  return (
    <DayliReportDetailTable
      dailyReport={dailyReport}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
      // dailyReportId={dailyReport[0]?.id}
      customers={customers}
      employeesPromise={employees}
      equipmentsPromise={equipments}
    />
  );
}
