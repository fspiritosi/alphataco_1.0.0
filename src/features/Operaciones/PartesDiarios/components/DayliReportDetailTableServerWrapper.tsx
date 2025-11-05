import { cookies } from 'next/headers';
import { getDailyReportById } from '../actions/actions';
import { fetchDailyReportData } from '../actions/server-actions';
import DayliReportDetailTableServer from './DayliReportDetailTableServer';

export default async function DayliReportDetailTableServerWrapper({ params }: { params: { uuid: string } }) {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('dailyReportServerTable')?.value;
  const savedFilter = cookiesStore.get('dailyReportServerTable-filters')?.value;

  // Obtener datos del daily report para obtener la fecha
  const dailyReport = await getDailyReportById(params.uuid);
  const reportDate = dailyReport[0]?.date || '';

  // Cargar datos iniciales con paginación
  const initialData = await fetchDailyReportData({
    dailyReportId: params.uuid,
    pageIndex: 0,
    pageSize: 10,
    sorting: [],
    columnFilters: [],
  });

  return (
    <DayliReportDetailTableServer
      dailyReportId={params.uuid}
      reportDate={reportDate}
      initialData={initialData}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilters={savedFilter ? JSON.parse(savedFilter) : []}
      dailyReport={dailyReport}
    />
  );
}
