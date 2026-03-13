import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { getDepartmentAbsenceSummary } from '../../actions.server';
import { _DepartmentSummaryDataTable } from './_DepartmentSummaryDataTable';

const logger = new Logger('features/Dashboard/RRHH/DepartmentSummaryList');

export async function DepartmentSummaryList() {
  const companyId = await getServerCompanyId();

  logger.debug('Cargando resumen de ausentismo por sector', { data: { companyId } });

  const data = await getDepartmentAbsenceSummary(companyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Resumen por Sector</CardTitle>
        <CardDescription>
          Esta tabla resume el ausentismo actual por sector para comparar rápidamente el impacto en cada área. Haz click
          en una fila para ver el detalle de empleados ausentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <_DepartmentSummaryDataTable data={data} />
      </CardContent>
    </Card>
  );
}
