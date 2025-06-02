import ViewcomponentInternal from '@/components/ViewComponentInternal';
import { FetchBrandOfVehicles, FetchModelOfVehicles, FetchTypeOfVehicles } from './actions/actions';
import EquipmentBrands from './components/equipmentBrands';
import EquipmentTypes from './components/equipmentTypes';
import EquipmentsModel from './components/equipmentsModel';

async function EquipmentsTabs() {
  const vehicleTypes = await FetchTypeOfVehicles();
  const vehicleBrands = await FetchBrandOfVehicles();
  const vehicleModels = await FetchModelOfVehicles();

  // Asegurarse de que vehicleTypes sea siempre un array
  const safeVehicleTypes = vehicleTypes || [];
  const safeVehicleBrands = vehicleBrands || [];
  const safeVehicleModels = vehicleModels || [];

  const viewData = {
    defaultValue: 'tipos',
    path: '/dashboard/company/actualCompany',
    tabsValues: [
      {
        value: 'tipos',
        name: 'Tipos de Unidad',
        restricted: [''],
        content: {
          title: 'Tipos de Unidad',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentTypes vehicleTypes={safeVehicleTypes} />,
        },
      },
      {
        value: 'marcas',
        name: 'Marcas',
        restricted: [''],
        content: {
          title: 'Marcas',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentBrands vehicleBrands={safeVehicleBrands} />,
        },
      },
      {
        value: 'modelos',
        name: 'Modelos',
        restricted: [''],
        content: {
          title: 'Modelos',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: <EquipmentsModel vehicleModels={safeVehicleModels} vehicleBrands={safeVehicleBrands} />,
        },
      },
    ],
  };

  return <ViewcomponentInternal viewData={viewData} />;
}

export default EquipmentsTabs;
