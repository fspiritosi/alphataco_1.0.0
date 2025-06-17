import { cookies } from 'next/headers';
import {
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
  getCustomers,
  getDailyReportById,
} from '../actions/actions';
import { DayliReportDetailTable } from './DayliReportDetailTable';

export async function DayliReportDetailTableWrapper({
  dailyReport,
}: {
  dailyReport: Awaited<ReturnType<typeof getDailyReportById>>;
}) {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('dailyReportTableDetail')?.value;
  const savedFilter = cookiesStore.get('dailyReportTableDetail-filters')?.value;
  const customers = await getCustomers();
  const employees = await getActiveEmployeesForDailyReport();
  const equipments = await getActiveEquipmentsForDailyReport();
  return (
    <DayliReportDetailTable
      dailyReport={dailyReport}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
      dailyReportId={dailyReport[0]?.id}
      customers={customers}
      employees={employees}
      equipments={equipments}
    />
  );
}
