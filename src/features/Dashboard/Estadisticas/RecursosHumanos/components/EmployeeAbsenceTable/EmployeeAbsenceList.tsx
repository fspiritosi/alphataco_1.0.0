import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { getCurrentAbsentEmployees } from '../../actions.server';
import { _EmployeeAbsenceDataTable } from './_EmployeeAbsenceDataTable';

const logger = new Logger('features/Dashboard/RRHH/EmployeeAbsenceList');

export async function EmployeeAbsenceList() {
  const companyId = await getServerCompanyId();

  logger.debug('Cargando empleados ausentes actuales', { data: { companyId } });

  const result = await getCurrentAbsentEmployees(companyId);
  const data = result?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Detalle de Ausencias por Empleado</CardTitle>
        <CardDescription>
          Esta tabla lista a los empleados actualmente ausentes e informa su período de ausencia, así como el motivo y
          área/turno involucrados.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <_EmployeeAbsenceDataTable data={data} />
      </CardContent>
    </Card>
  );
}
