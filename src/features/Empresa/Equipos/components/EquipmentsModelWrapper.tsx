import { FetchBrandOfVehicles, FetchModelOfVehicles } from '../actions/actions';
import EquipmentsModel from './equipmentsModel';

export default async function EquipmentsModelWrapper() {
  const vehicleModels = await FetchModelOfVehicles();
  const vehicleBrands = await FetchBrandOfVehicles();

  // Asegurarse de que los datos sean siempre arrays
  const safeVehicleModels = vehicleModels || [];
  const safeVehicleBrands = vehicleBrands || [];

  return <EquipmentsModel vehicleModels={safeVehicleModels} vehicleBrands={safeVehicleBrands} />;
}
