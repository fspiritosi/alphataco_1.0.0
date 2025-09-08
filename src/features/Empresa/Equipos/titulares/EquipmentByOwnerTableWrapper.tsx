import Cookies from 'js-cookie';
import { FetchEquipmentByOwnerIdType } from './actions/actions';
import EquipmentByOwnerTable from './EquipmentByOwnerTable';

type EquipmentByOwnerTableWrapperProps = {
  selectedOwner: FetchEquipmentByOwnerIdType;
};

async function EquipmentByOwnerTableWrapper({ selectedOwner }: EquipmentByOwnerTableWrapperProps) {
  const savedVisibility = Cookies.get(`equipmentByOwnerTable`);
  const savedFilters = Cookies.get(`equipmentByOwnerTable-filters`);
  return (
    <>
      <EquipmentByOwnerTable
        equipmentData={selectedOwner}
        savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
        savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      />
    </>
  );
}

export default EquipmentByOwnerTableWrapper;
