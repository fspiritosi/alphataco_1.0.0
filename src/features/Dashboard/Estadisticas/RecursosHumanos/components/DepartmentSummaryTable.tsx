import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { getDepartmentAbsenceSummary } from '../actions.server';
import { _DepartmentSummaryDataTable } from './DepartmentSummaryTable/_DepartmentSummaryDataTable';

export async function DepartmentSummaryTable() {
  const companyId = await getServerCompanyId();
  const data = await getDepartmentAbsenceSummary(companyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Resumen por Sector</CardTitle>
        <CardDescription>
          Esta tabla resume el ausentismo actual por sector para comparar rápidamente el impacto en cada área.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <_DepartmentSummaryDataTable data={data} />
      </CardContent>
    </Card>
  );
}
