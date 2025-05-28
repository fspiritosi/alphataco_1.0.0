import {
  fetchAllCategories,
  fetchAllEmployeesWithRelations,
  fetchAllEquipmentWithRelations,
  fetchCompanyPositions,
  fetchCovenants,
  fetchCustomers,
  fetchGuilds,
  fetchHierrarchicalPositions,
  fetchProvinces,
  fetchTypesOfVehicles,
  fetchTypeVehicles,
  fetchVehicleBrands,
  fetchVehicleModels,
  fetchWorkDiagrams,
} from '@/app/server/GET/actions';
import NewDocumentType from '@/components/NewDocumentType';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import ButtonTypeRefetch from './ButtonTypeRefetch';

export const setVehicleDataOptions = async () => {
  const brands = await fetchVehicleBrands();
  const models = await fetchVehicleModels();
  const types = await fetchTypeVehicles();
  const typesOfVehicles = await fetchTypesOfVehicles();
  const customers = await fetchCustomers();

  return {
    brand: brands.map((brand) => brand.name!),
    model: models.map((model) => model.name!),
    type: types.map((type) => type.name!),
    types_of_vehicles: typesOfVehicles.map((type) => type.name!),
    contractor_equipment: customers.map((customer) => customer.name!),
  };
};

export const setEmployeeDataOptions = async () => {
  const workDiagrams = await fetchWorkDiagrams();
  const guilds = await fetchGuilds();
  const covenants = await fetchCovenants();
  const categories = await fetchAllCategories();
  const hierarchicalPositions = await fetchHierrarchicalPositions();
  const customers = await fetchCustomers();
  const provinces = await fetchProvinces();
  const companyPositions = await fetchCompanyPositions();

  return {
    workflow_diagram: workDiagrams.map((diagram) => diagram.name),
    guild: guilds.map((guild) => guild.name!) || [],
    covenant: covenants.map((covenant) => covenant.name!),
    category: categories.map((category) => category.name!),
    hierarchical_position: hierarchicalPositions.map((position) => position.name),
    contractor_employee: customers.map((customer) => customer.name),
    province: provinces.map((province) => province.name.trim()),
    gender: ['Masculino', 'Femenino', 'No Declarado'],
    marital_status: ['Soltero', 'Casado', 'Viudo', 'Divorciado', 'Separado'],
    nationality: ['Argentina', 'Extranjero'],
    document_type: ['DNI', 'LE', 'LC', 'PASAPORTE'],
    level_of_education: ['Primario', 'Secundario', 'Terciario', 'Posgrado', 'Universitario'],
    status: ['Avalado', 'Completo', 'Incompleto', 'No avalado', 'Completo con doc vencida'],
    company_position: companyPositions.map((position) => position.name || ''),
    type_of_contract: ['Período de prueba', 'A tiempo indeterminado', 'Plazo fijo'],
  };
};

export default function TypesDocumentAction({
  optionChildrenProp,
  EmployeesOptionsData,
  VehicleOptionsData,
  empleadosCargados,
  equiposCargados,
  role,
}: {
  optionChildrenProp: string;
  EmployeesOptionsData: Awaited<ReturnType<typeof setEmployeeDataOptions>>;
  VehicleOptionsData: Awaited<ReturnType<typeof setVehicleDataOptions>>;
  empleadosCargados: Awaited<ReturnType<typeof fetchAllEmployeesWithRelations>>;
  equiposCargados: Awaited<ReturnType<typeof fetchAllEquipmentWithRelations>>;
  role: string;
}) {
  // const role = await getRole();
  console.log(empleadosCargados);
  // const EmployeesOptionsData = await setEmployeeDataOptions();
  // const VehicleOptionsData = await setVehicleDataOptions();

  // const empleadosCargados = await fetchAllEmployeesWithRelations();
  // const equiposCargados = await fetchAllEquipmentWithRelations();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild className="mr-4">
        {role !== 'Invitado' && <Button>Crear nuevo</Button>}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90vh] overflow-y-scroll max-w-[40vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Nuevo tipo de documento</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <NewDocumentType
              codeControlClient
              optionChildrenProp={optionChildrenProp}
              employeeMockValues={EmployeesOptionsData}
              vehicleMockValues={VehicleOptionsData}
              employees={empleadosCargados}
              vehicles={equiposCargados}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <ButtonTypeRefetch />
          <AlertDialogCancel id="close_document_modal">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
