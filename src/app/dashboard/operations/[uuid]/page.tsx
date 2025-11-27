import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getDailyReportByIdOnlyDate } from '@/features/Operaciones/PartesDiarios/actions/actions';
import DayliReportDetailTableServerWrapper from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTableServerWrapper';
import moment from 'moment';

async function page({ params }: { params: { uuid: string } }) {
  // Usar la función optimizada para obtener solo status y date
  const dailyReportStatus = await getDailyReportByIdOnlyDate(params.uuid);

  return (
    <div className="mx-6 mt-4 space-y-6">
      {/* Header compartido */}
      {/* <Card className="p-4">
        <div className="flex justify-between mb-4">
          <div  >
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Parte diario</CardTitle>
              {dailyReportStatus && (
                <Badge variant={dailyReportStatus.status as any} className="capitalize">
                  {dailyReportStatus.status.replaceAll('_', ' ')}
                </Badge>
              )}
            </div>
            <CardDescription>
              Fecha: {dailyReportStatus ? moment(dailyReportStatus.date).format('DD/MM/YYYY') : ''}
            </CardDescription>
          </div>
          <BackButton />
        </div>
      </Card> */}

      {/* Implementación del Cliente (Actual) */}
      <Card className="p-4">
        <div className="mb-4">
          <CardTitle className="text-lg">Parte diario</CardTitle>
          <CardDescription>
            Fecha: {dailyReportStatus ? moment(dailyReportStatus.date).format('DD/MM/YYYY') : ''}
          </CardDescription>
        </div>
        <DayliReportDetailTableServerWrapper params={params} />
      </Card>
    </div>
  );
}

export default page;

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { uuid: string } }) {
  const { uuid } = params;

  const dailyReport = await getDailyReportByIdOnlyDate(uuid);
  return {
    title: `Parte diario - ${moment(dailyReport?.date).format('DD/MM/YYYY')}`,
    description: 'Información detallada del parte diario',
  };
}
