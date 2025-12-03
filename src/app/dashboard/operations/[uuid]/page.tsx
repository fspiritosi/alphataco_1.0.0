import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getDailyReportByIdOnlyDate } from '@/features/Operaciones/PartesDiarios/actions/actions';
import DayliReportDetailTableServerWrapper from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTableServerWrapper';
import { TabsManagerServer } from '@/features/TabsManager';
import { FileText } from 'lucide-react';
import moment from 'moment';

async function page({
  params,
  searchParams,
}: {
  params: { uuid: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Usar la función optimizada para obtener solo status y date
  const dailyReportStatus = await getDailyReportByIdOnlyDate(params.uuid);

  return (
    <div className="mx-6 mt-4 space-y-6">
      <Card className="p-4">
        <div className="mb-4">
          <CardTitle className="text-lg">Parte diario</CardTitle>
          <CardDescription>
            Fecha: {dailyReportStatus ? moment(dailyReportStatus.date).format('DD/MM/YYYY') : ''}
          </CardDescription>
        </div>

        <TabsManagerServer<'operaciones'>
          paramName="tab"
          searchParams={searchParams}
          defaultTab="detalle"
          tabs={[
            {
              value: 'detalle',
              label: (
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detalle
                </span>
              ),
              moduleSlug: 'operaciones',
              tabSlug: 'detalle-parte-diario',
              content: <DayliReportDetailTableServerWrapper params={params} />,
            },
          ]}
        />
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
