import { fetchDiagramsTypes } from '@/app/server/GET/actions';
import { getEmployeesName } from '@/features/Employees/Empleados/lib/actions/employeesActions';
import DiagramFormUpdated from './DiagramFormUpdated';

export default async function DiagramFormUpdatedWrapper({ defaultId }: { defaultId?: string }) {
  // Fetch data
  const employees = await getEmployeesName();
  // const diagrams = [] ;
  const diagrams_types = await fetchDiagramsTypes();

  return (
    <DiagramFormUpdated
      employees={employees}
      //diagrams={diagrams}
      diagrams_types={diagrams_types}
      defaultId={defaultId}
    />
  );
}
