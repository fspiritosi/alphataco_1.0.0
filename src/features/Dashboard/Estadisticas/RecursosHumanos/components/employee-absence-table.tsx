import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Cookies from 'js-cookie';
import { getCurrentAbsentEmployees } from '../actions/actions';
import { EmployeeAbsenceTableComponent } from './charts/employee-absence-table';

export async function EmployeeAbsenceTable() {
  const data = await getCurrentAbsentEmployees({});
  console.log(data, 'getCurrentAbsentEmployees');

  const tableId = 'employeeAbsenceTable';
  const visibilityCookie = Cookies.get(tableId);
  const filtersCookie = Cookies.get(`${tableId}-filters`);

  const savedVisibility = visibilityCookie ? JSON.parse(visibilityCookie) : {};
  const savedFiltersFromCookie = filtersCookie ? JSON.parse(filtersCookie) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Detalle de Ausencias por Empleado</CardTitle>
        <CardDescription>
          Esta tabla lista a los empleados actualmente ausentes e informa su período de ausencia, así como el motivo y
          área/turno involucrados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmployeeAbsenceTableComponent
          data={data as any}
          savedVisibility={savedVisibility}
          savedFiltersFromCookie={savedFiltersFromCookie}
        />
      </CardContent>
    </Card>
  );
}
