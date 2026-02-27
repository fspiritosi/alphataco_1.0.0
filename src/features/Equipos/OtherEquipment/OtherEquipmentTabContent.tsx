import { OtherEquipmentList } from './list/OtherEquipmentList';

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
 * TabContent de "Otros" equipos.
 * Punto de entrada de la subtab — delega al Server Component OtherEquipmentList.
 */
export async function OtherEquipmentTabContent({ searchParams, permissions }: Props) {
  return <OtherEquipmentList searchParams={searchParams} permissions={permissions} />;
}
