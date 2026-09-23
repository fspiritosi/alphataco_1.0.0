import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { getDailyAbsenceTimeseries } from '../actions.server';
import { _DailyAbsenceDataTable } from './DailyAbsenceTable/_DailyAbsenceDataTable';

function getCurrentMonthYearLabel(date = new Date()) {
  const month = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date);
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

export async function DetailedAbsenceTable() {
  // `companyId` sólo discrimina la caché de React Query del detalle por día.
  const [data, companyId] = await Promise.all([getDailyAbsenceTimeseries(), getServerCompanyId()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Ausentismo Diario - {getCurrentMonthYearLabel()}</CardTitle>
        <CardDescription>
          Esta tabla muestra la serie diaria de ausentismo del período seleccionado para analizar su evolución día a
          día.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <_DailyAbsenceDataTable data={data} companyId={companyId} />
      </CardContent>
    </Card>
  );
}
