import EquipmentSubTypeList from '../EquipmentSubTypes/EquipmentSubTypeList';

interface EquipmentSubTypesWrapperProps {
  searchParams?: Record<string, string | string[] | undefined>;
  permissions?: Record<string, boolean>;
}

/**
 * Wrapper de Subtipos de Equipos.
 * Delega al nuevo sistema (Prisma + DataTable) en EquipmentSubTypes/.
 */
export default function EquipmentSubTypesWrapper({
  searchParams = {},
  permissions = {},
}: EquipmentSubTypesWrapperProps) {
  return <EquipmentSubTypeList searchParams={searchParams} permissions={permissions} />;
}
