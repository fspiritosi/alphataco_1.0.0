import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logger } from '@/lib/logger';
import { getCurrentAbsentEmployees } from '../../actions.server';
import { _EmployeeAbsenceDataTable } from './_EmployeeAbsenceDataTable';

const logger = new Logger('features/Dashboard/RRHH/EmployeeAbsenceList');

export async function EmployeeAbsenceList() {
  logger.debug('Cargando empleados ausentes actuales');

  const result = await getCurrentAbsentEmployees();
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
