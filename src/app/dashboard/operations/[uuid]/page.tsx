import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getDailyReportByIdOnlyDate } from '@/features/Operaciones/PartesDiarios/actions/actions';
import DayliReportDetailTableServerWrapper from '@/features/Operaciones/PartesDiarios/components/DayliReportDetailTableServerWrapper';
import { getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import BackButton from '@/shared/components/common/BackButton';
import { dailyReportStatusBadges, dailyReportStatusLabels } from '@/shared/utils/mappers';
import { FileText } from 'lucide-react';
import moment from 'moment';

async function page({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // En Next.js 16, params es una Promise, necesitamos hacer await
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Usar la función optimizada para obtener solo status y date
  const dailyReportStatus = await getDailyReportByIdOnlyDate(resolvedParams.uuid);

  // Obtener permisos (usará cache pre-cargado en layout, sin query adicional)
  const permissions = await getUserPermissionsMapServer();

  return (
    <div className="mx-6 mt-4 space-y-6">
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Parte diario</CardTitle>
                {dailyReportStatus?.status && (
                  <Badge variant={dailyReportStatusBadges[dailyReportStatus.status] ?? 'default'}>
                    {dailyReportStatusLabels[dailyReportStatus.status] ?? dailyReportStatus.status}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Fecha: {dailyReportStatus ? moment(dailyReportStatus.date).format('DD/MM/YYYY') : ''}
              </CardDescription>
            </div>
          </div>
          <BackButton />
        </div>

        <TabsManagerServer<'operaciones'>
          paramName="tab"
          searchParams={resolvedSearchParams}
          defaultTab="detalle"
          permissions={permissions}
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
              content: <DayliReportDetailTableServerWrapper params={resolvedParams} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default page;

// Generate metadata for the page
export async function generateMetadata({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = await params;
  const { uuid } = resolvedParams;

  const dailyReport = await getDailyReportByIdOnlyDate(uuid);
  return {
    title: `Parte diario - ${moment(dailyReport?.date).format('DD/MM/YYYY')}`,
    description: 'Información detallada del parte diario',
  };
}
