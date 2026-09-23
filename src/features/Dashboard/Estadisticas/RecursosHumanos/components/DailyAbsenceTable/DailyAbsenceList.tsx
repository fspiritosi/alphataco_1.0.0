import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { getDailyAbsenceTimeseries } from '../../actions.server';
import { _DailyAbsenceDataTable } from './_DailyAbsenceDataTable';

const logger = new Logger('features/Dashboard/RRHH/DailyAbsenceList');

function getCurrentMonthYearLabel(date = new Date()) {
  const month = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date);
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

export async function DailyAbsenceList() {
  logger.debug('Cargando serie temporal diaria de ausentismo');

  // `companyId` sólo discrimina la caché de React Query del detalle por día; la empresa
  // de la consulta la resuelve la action desde la sesión.
  const [data, companyId] = await Promise.all([getDailyAbsenceTimeseries(), getServerCompanyId()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ausentismo Diario - {getCurrentMonthYearLabel()}</CardTitle>
        <CardDescription>
          Esta tabla muestra la serie diaria de ausentismo del período seleccionado para analizar su evolución día a
          día. Haz click en una fila para ver el detalle de empleados ausentes en esa fecha.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <_DailyAbsenceDataTable data={data} companyId={companyId} />
      </CardContent>
    </Card>
  );
}
