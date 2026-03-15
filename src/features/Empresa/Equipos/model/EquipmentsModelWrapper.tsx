import { FetchBrandOfVehicles, FetchModelOfVehicles } from '../actions/actions';
import EquipmentsModel from './equipmentsModel';

export default async function EquipmentsModelWrapper() {
  const [vehicleBrands, vehicleModels] = await Promise.all([FetchBrandOfVehicles(), FetchModelOfVehicles()]);

  return <EquipmentsModel vehicleBrands={vehicleBrands ?? []} vehicleModels={vehicleModels ?? []} />;
}
