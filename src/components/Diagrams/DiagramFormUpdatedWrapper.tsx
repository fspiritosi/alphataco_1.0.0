import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import { getEmployeesName } from '@/features/Employees/Empleados/lib/actions/employeesActions';
import { Card } from '../ui/card';
import DiagramFormUpdated from './DiagramFormUpdated';

export default async function DiagramFormUpdatedWrapper({ defaultId }: { defaultId?: string }) {
  // Fetch data
  const employees = await getEmployeesName();
  // const diagrams = [] ;
  const diagrams_types = await fetchDiagramsTypes();

  return (
    <Card className="p-6">
      <DiagramFormUpdated
        employees={employees}
        //diagrams={diagrams}
        diagrams_types={diagrams_types}
        defaultId={defaultId}
      />
    </Card>
  );
}
