import { cookies } from 'next/headers';
import {
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
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
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('dailyReportTableDetail')?.value;
  const savedFilter = cookiesStore.get('dailyReportTableDetail-filters')?.value;
  console.time('getCustomers');
  const customers = await getCustomers();
  console.timeEnd('getCustomers');
  console.time('getActiveEmployeesForDailyReport');
  const employees = getActiveEmployeesForDailyReport();
  console.timeEnd('getActiveEmployeesForDailyReport');
  console.time('getActiveEquipmentsForDailyReport');
  const equipments = getActiveEquipmentsForDailyReport();
  console.timeEnd('getActiveEquipmentsForDailyReport');
  const dailyReport = getDailyReportById(params.uuid);
  return (
    <DayliReportDetailTable
      dailyReportPromise={dailyReport}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
      // dailyReportId={dailyReport[0]?.id}
      customers={customers}
      employeesPromise={employees}
      equipmentsPromise={equipments}
    />
  );
}
