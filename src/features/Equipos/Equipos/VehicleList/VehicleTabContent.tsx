import { VehicleList } from './VehicleList';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
  permissions: Record<string, boolean>;
}

// ============================================================================
// SERVER COMPONENT
// ============================================================================

/**
 * TabContent de "Vehículos".
 * Punto de entrada del subtab — delega al Server Component VehicleList.
 */
export async function VehicleTabContent({ searchParams, permissions }: Props) {
  return <VehicleList searchParams={searchParams} permissions={permissions} />;
}
