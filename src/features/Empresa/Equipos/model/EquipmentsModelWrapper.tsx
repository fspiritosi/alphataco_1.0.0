import { FetchBrandOfVehicles, FetchModelOfVehicles } from '../actions/actions';
import EquipmentsModel from './equipmentsModel';

export default async function EquipmentsModelWrapper() {
  // Solo necesitamos las marcas, ya que los modelos se cargarán del lado del cliente
  const vehicleBrands = await FetchBrandOfVehicles();
  const vehicleModels = await FetchModelOfVehicles();
  // Asegurarse de que los datos sean siempre un array
  const safeVehicleBrands = vehicleBrands || [];
  const safeVehicleModels = vehicleModels || [];

  return <EquipmentsModel vehicleBrands={safeVehicleBrands} vehicleModels={safeVehicleModels} />;
}
