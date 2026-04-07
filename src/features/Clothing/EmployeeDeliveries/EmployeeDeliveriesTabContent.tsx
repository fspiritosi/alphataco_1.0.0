import EmployeeDeliveriesList from './EmployeeDeliveriesList/EmployeeDeliveriesList';

interface EmployeeDeliveriesTabContentProps {
  employeeId: string;
  searchParams: Record<string, string | string[] | undefined>;
}

export async function EmployeeDeliveriesTabContent({ employeeId, searchParams }: EmployeeDeliveriesTabContentProps) {
  return <EmployeeDeliveriesList employeeId={employeeId} searchParams={searchParams} />;
}
