import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Cookies from 'js-cookie';
import { getDepartmentAbsenceSummary } from '../actions/actions';
import { DepartmentSummaryTableComponent } from './charts/department-summary-table';

export async function DepartmentSummaryTable() {
  const data = await getDepartmentAbsenceSummary({});

  const tableId = 'departmentSummaryTable';
  const visibilityCookie = Cookies.get(tableId);
  const filtersCookie = Cookies.get(`${tableId}-filters`);

  const savedVisibility = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersFromCookie = filtersCookie ? JSON.parse(filtersCookie) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Resumen por Sector</CardTitle>
        <CardDescription>
          Esta tabla resume el ausentismo actual por sector para comparar rápidamente el impacto en cada área.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DepartmentSummaryTableComponent
          data={data as any}
          savedVisibility={savedVisibility}
          savedFiltersFromCookie={savedFiltersFromCookie}
        />
      </CardContent>
    </Card>
  );
}
