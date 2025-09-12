import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Cookies from 'js-cookie';
import { getDailyAbsenceTimeseries } from '../actions/actions';
import { DetailedAbsenceTableComponent } from './charts/detailed-absence-table';

function getCurrentMonthYearLabel(date = new Date()) {
  const month = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date);
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

export async function DetailedAbsenceTable() {
  const data = await getDailyAbsenceTimeseries({});
  const tableId = 'detailedAbsenceTable';
  const visibilityCookie = Cookies.get(tableId);
  const filtersCookie = Cookies.get(`${tableId}-filters`);

  const savedVisibility = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersFromCookie = filtersCookie ? JSON.parse(filtersCookie) : [];

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
        <DetailedAbsenceTableComponent
          data={data as any}
          savedVisibility={savedVisibility}
          savedFiltersFromCookie={savedFiltersFromCookie}
        />
      </CardContent>
    </Card>
  );
}
