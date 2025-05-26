import BackButton from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  getActiveEmployeesForDailyReport,
  getActiveEquipmentsForDailyReport,
  getCustomers,
  getDailyReportById,
} from '@/features/Operaciones/PartesDiarios/actions/actions';
import DayliReportDetailTable from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTable';
import { dailyReportStatus } from '@/features/Operaciones/PartesDiarios/utils/utils';
import moment from 'moment';
import { cookies } from 'next/headers';

async function page({ params }: { params: { uuid: string } }) {
  const dailyReport = await getDailyReportById(params.uuid);
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get('dailyReportTableDetail')?.value;
  const savedFilter = cookiesStore.get('dailyReportTableDetail-filters')?.value;
  const customers = await getCustomers();
  const employees = await getActiveEmployeesForDailyReport();
  const equipments = await getActiveEquipmentsForDailyReport();

  return (
    <Card className="p-4 mx-6 mt-4">
      <div className="flex justify-between mb-4">
        <div className="">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">Parte diario</CardTitle>
            <Badge variant={dailyReportStatus[dailyReport[0].status]} className="capitalize">
              {dailyReport[0].status.replaceAll('_', ' ')}
            </Badge>
          </div>
          <CardDescription>Fecha: {moment(dailyReport[0].date).format('DD/MM/YYYY')}</CardDescription>
        </div>
        <BackButton />
      </div>
      <DayliReportDetailTable
        savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
        dailyReportId={params.uuid}
        customers={customers}
        dailyReport={dailyReport}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        employees={employees}
        equipments={equipments}
      />
    </Card>
  );
}

export default page;
