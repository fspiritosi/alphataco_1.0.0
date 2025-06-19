import {
  fetchAllDocumentTypes,
  fetchAllEmployeesWithRelations,
  fetchAllEquipmentWithRelations,
  setEmployeeDataOptions,
  setVehicleDataOptions,
} from '@/app/server/GET/actions';
import { cookies } from 'next/headers';

import TypesDocumentAction from './TypesDocumentAction';
import TypesDocumentsView from './TypesDocumentsView';
export const actionComponent = (optionChildrenProp: string) => {
  return <TypesDocumentAction optionChildrenProp={optionChildrenProp || 'Persona'} />;
};
async function TypesDocumentsViewWrapper({
  optionChildrenProp = 'all',
  equipos = false,
  empresa = false,
  personas = false,
}: {
  optionChildrenProp?: string;
  equipos?: boolean;
  empresa?: boolean;
  personas?: boolean;
}) {
  const cookiesStore = cookies();
  const savedVisibility = cookiesStore.get(`document_type_employees`)?.value;
  const savedFilters = cookiesStore.get(`document_type_employees-filters`)?.value;
  const equiposCargados = await fetchAllEquipmentWithRelations();
  const document_types = await fetchAllDocumentTypes();

  const empleadosCargados = await fetchAllEmployeesWithRelations();
  const role = cookiesStore.get('guestRole')?.value || '';

  const EmployeesOptionsData = await setEmployeeDataOptions();
  const VehicleOptionsData = await setVehicleDataOptions();

  // Preparamos el componente TypesDocumentAction que se pasará como children

  return (
    <TypesDocumentsView
      optionChildrenProp={optionChildrenProp}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : undefined}
      savedFilters={savedFilters ? JSON.parse(savedFilters) : []}
      equipos={equipos}
      empresa={empresa}
      personas={personas || true}
      employeeMockValues={EmployeesOptionsData}
      vehicleMockValues={VehicleOptionsData}
      employees={empleadosCargados}
      vehicles={equiposCargados}
      document_types={document_types}
      role={role}
      actionComponent={<TypesDocumentAction optionChildrenProp="all" />}
    />
  );
}

export default TypesDocumentsViewWrapper;
