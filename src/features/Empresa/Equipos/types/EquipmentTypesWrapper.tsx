import { FetchTypeOfVehicles } from '../actions/actions';
import EquipmentTypes from './equipmentTypes';

export default async function EquipmentTypesWrapper() {
  const vehicleTypes = await FetchTypeOfVehicles();

  // Asegurarse de que vehicleTypes sea siempre un array
  const safeVehicleTypes = vehicleTypes || [];

  return <EquipmentTypes vehicleTypes={safeVehicleTypes} />;
}
