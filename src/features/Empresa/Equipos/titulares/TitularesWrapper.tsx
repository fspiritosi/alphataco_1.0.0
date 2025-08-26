import { FetchEquipmentOwners } from './actions/actions';
import EquipmentTitulares from './EquipmentTitulares';

export default async function TitularesWrapper() {
  const equipmentOwners = await FetchEquipmentOwners();

  return <EquipmentTitulares equipmentOwners={equipmentOwners} />;
}
