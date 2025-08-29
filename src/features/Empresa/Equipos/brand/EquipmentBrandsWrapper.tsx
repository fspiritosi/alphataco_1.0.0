import { FetchBrandOfVehicles } from '../actions/actions';
import EquipmentBrands from './equipmentBrands';

export default async function EquipmentBrandsWrapper() {
  const vehicleBrands = await FetchBrandOfVehicles();

  // Asegurarse de que vehicleBrands sea siempre un array
  const safeVehicleBrands = vehicleBrands || [];

  return <EquipmentBrands vehicleBrands={safeVehicleBrands} />;
}
