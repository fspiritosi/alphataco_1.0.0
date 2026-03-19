import EmployeeDeliveriesList from './EmployeeDeliveriesList/EmployeeDeliveriesList';

// ============================================================================
// TYPES
// ============================================================================

interface EmployeeDeliveriesTabContentProps {
  employeeId: string;
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export async function EmployeeDeliveriesTabContent({ employeeId, searchParams }: EmployeeDeliveriesTabContentProps) {
  return <EmployeeDeliveriesList employeeId={employeeId} searchParams={searchParams} />;
}
