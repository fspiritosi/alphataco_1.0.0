import { fetchEmployeeDiagrams, fetchEmployeesByCompany } from '@/app/server/GET/actions';
import { setEmployeesToShow } from '@/lib/utils/utils';
import DiagramEmployeeView from './DiagramEmployeeView';

async function EmployesDiagramWrapper() {
  const diagrams = await fetchEmployeeDiagrams();
  const employees = await fetchEmployeesByCompany();
  const activeEmploees = setEmployeesToShow(employees?.filter((e: any) => e.is_active));
  return <DiagramEmployeeView diagrams={diagrams} activeEmployees={activeEmploees} />;
}

export default EmployesDiagramWrapper;
