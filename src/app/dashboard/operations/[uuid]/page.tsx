import BackButton from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getDailyReportById } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { DayliReportDetailTableWrapper } from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTableWrapper';
import { dailyReportStatus } from '@/features/Operaciones/PartesDiarios/utils/utils';
import moment from 'moment';

async function page({ params }: { params: { uuid: string } }) {
  const dailyReport = await getDailyReportById(params.uuid);
  return (
    <Card className="p-4 mx-6 mt-4">
      <div className="flex justify-between mb-4">
        <div className="">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">Parte diario</CardTitle>
            <Badge variant={dailyReportStatus[dailyReport[0]?.status]} className="capitalize">
              {dailyReport[0]?.status.replaceAll('_', ' ')}
            </Badge>
          </div>
          <CardDescription>Fecha: {moment(dailyReport[0]?.date).format('DD/MM/YYYY')}</CardDescription>
        </div>
        <BackButton />
      </div>
      {/* <DayliReportDetailTable
        savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
        dailyReportId={params.uuid}
        customers={customers}
        dailyReport={dailyReport}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        employees={employees}
        equipments={equipments}
      /> */}
      <DayliReportDetailTableWrapper dailyReport={dailyReport} />
    </Card>
  );
}

export default page;
