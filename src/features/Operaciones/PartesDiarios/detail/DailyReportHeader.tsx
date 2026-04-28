import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { checkPermissionServer } from '@/features/Permissions';
import BackButton from '@/shared/components/common/BackButton';
import { dailyReportStatusBadges, dailyReportStatusLabels } from '@/shared/utils/mappers';
import moment from 'moment';
import { getDailyReportHeader } from './actions.server';

interface Props {
  uuid: string;
}

export async function DailyReportHeader({ uuid }: Props) {
  const [header, canUpdate] = await Promise.all([
    getDailyReportHeader(uuid),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'update'),
  ]);

  if (!header) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Parte diario</CardTitle>
              {header.status && (
                <Badge variant={dailyReportStatusBadges[header.status] ?? 'default'}>
                  {dailyReportStatusLabels[header.status] ?? header.status}
                </Badge>
              )}
            </div>
            <CardDescription>
              Fecha:{' '}
              {header.date instanceof Date
                ? `${String(header.date.getUTCDate()).padStart(2, '0')}/${String(header.date.getUTCMonth() + 1).padStart(2, '0')}/${header.date.getUTCFullYear()}`
                : moment.utc(header.date).format('DD/MM/YYYY')}
            </CardDescription>
          </div>
        </div>
        <BackButton />
      </div>
    </Card>
  );
}
