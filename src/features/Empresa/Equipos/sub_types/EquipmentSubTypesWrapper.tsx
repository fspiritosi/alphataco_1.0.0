import { FetchSubTypeOfVehicles, FetchTypeOfVehicles } from '../actions/actions';
import EquipmentSubTypes from './EquipmentSubTypes';

export default async function EquipmentSubTypesWrapper() {
  const vehicleTypes = await FetchTypeOfVehicles();
  const vehicleSubTypes = await FetchSubTypeOfVehicles();

  // Asegurarse de que vehicleTypes sea siempre un array
  const safeVehicleTypes = vehicleTypes || [];
  const safeVehicleSubTypes = vehicleSubTypes || [];

  return <EquipmentSubTypes vehicleTypes={safeVehicleTypes} vehicleSubTypes={safeVehicleSubTypes} />;
}

// export default EquipmentSubTypesWrapper;

//
