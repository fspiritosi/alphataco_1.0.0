import { fetchEmployeeDiagrams, getEmployeesIds } from '@/app/server/GET/actions';
import DiagramEmployeeView from './DiagramEmployeeView';

async function EmployesDiagramWrapper() {
  const diagrams = await fetchEmployeeDiagrams();
  const employees = await getEmployeesIds();
  const activeEmploees = employees.map((employee: any) => {
    return {
      label: `${employee.lastname} ${employee.firstname}`,
      value: employee.id,
    };
  });
  return <DiagramEmployeeView diagrams={diagrams} activeEmployees={activeEmploees} />;
}

export default EmployesDiagramWrapper;
