import { getUserPermissionsMapServer } from '@/features/Permissions';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';
import EquipmentOwnerList from './EquipmentOwnerList';

// ============================================================================
// SERVER COMPONENT — entry point de la tab Titulares
// Mismo patrón que EquipmentTypeList: Server async → fetch data → Client DataTable
// ============================================================================

interface EquipmentOwnersTabContentProps {
  searchParams: DataTableSearchParams;
}

export default async function EquipmentOwnersTabContent({ searchParams }: EquipmentOwnersTabContentProps) {
  const permissionsMap = await getUserPermissionsMapServer();

  return <EquipmentOwnerList searchParams={searchParams} permissions={permissionsMap} />;
}
