import { fetchAllEquipmentWithBrand } from '@/app/server/GET/actions';
import {
  CompaniesTableOptions,
  DocumentsTableOptions,
  EmployeesTableOptions,
  VehiclesTableOptions,
} from '@/types/types';
import { supabaseServer } from '../supabase/server';
export const formatDate = (dateString: string) => {
  if (!dateString) return 'No vence';
  const [day, month, year] = dateString.split('/');
  const formattedDate = `${day}/${month}/${year}`;
  return formattedDate || 'No vence';
};
export const mapDocument = (doc: any) => {
  return {
    date: doc.created_at,
    allocated_to: doc.employees?.contractor_employee?.map((doc: any) => doc.contractors?.name).join(', '),
    documentName: doc.document_types?.name,
    state: doc.state,
    multiresource: doc.document_types?.multiresource ? 'Si' : 'No',
    isItMonthly: doc.document_types?.is_it_montlhy,
    validity: doc.validity,
    mandatory: doc.document_types?.mandatory ? 'Si' : 'No',
    id: doc.id,
    resource: `${doc.employees?.lastname?.charAt(0)?.toUpperCase()}${doc?.employees?.lastname.slice(
      1
    )} ${doc.employees?.firstname?.charAt(0)?.toUpperCase()}${doc?.employees?.firstname.slice(1)}`,
    document_number: doc.employees?.document_number,
    document_url: doc?.document_path,
    is_active: doc?.employees?.is_active,
    period: doc?.period,
    applies: doc?.document_types?.applies,
    id_document_types: doc?.document_types?.id,
    intern_number: '',
  };
};
export const mapVehicle = (doc: any) => {
  return {
    date: doc.created_at,
    allocated_to: doc.applies?.allocated_to,
    documentName: doc.document_types?.name,
    state: doc.state,
    multiresource: doc.document_types?.multiresource ? 'Si' : 'No',
    isItMonthly: doc.document_types?.is_it_montlhy,
    validity: doc.validity,
    mandatory: doc.document_types?.mandatory ? 'Si' : 'No',
    id: doc.id,
    resource: `${doc.applies?.domain}`,
    vehicle_id: doc.applies?.id,
    is_active: doc.applies?.is_active,
    period: doc.period,
    applies: doc.document_types.applies,
    id_document_types: doc.document_types.id,
    intern_number: `${doc.applies?.intern_number}`,
  };
};
export const setEmployeesToShow = (employees: any) => {
  const employee = employees?.map((employees: any) => {
    return {
      full_name: `${employees?.lastname?.charAt(0).toUpperCase()}${employees?.lastname?.slice(1)} ${employees?.firstname
        ?.charAt(0)
        .toUpperCase()}${employees?.firstname?.slice(1)}`,
      id: employees?.id,
      email: employees?.email,
      cuil: employees?.cuil,
      document_number: employees?.document_number,
      hierarchical_position: employees?.hierarchical_position?.name,
      company_position: employees?.company_position?.id || employees?.company_position, // Usar el ID del puesto
      company_position_name: employees?.company_position?.name, // Agregar el nombre del puesto
      normal_hours: employees?.normal_hours,
      type_of_contract: employees?.type_of_contract,
      allocated_to: employees?.allocated_to,
      picture: employees?.picture,
      nationality: employees?.nationality,
      lastname: `${employees?.lastname?.charAt(0)?.toUpperCase()}${employees?.lastname.slice(1)}`,
      firstname: `${employees?.firstname?.charAt(0)?.toUpperCase()}${employees?.firstname.slice(1)}`,
      document_type: employees?.document_type,
      birthplace: employees?.birthplace?.name?.trim(),
      gender: employees?.gender,
      marital_status: employees?.marital_status,
      level_of_education: employees?.level_of_education,
      street: employees?.street,
      street_number: employees?.street_number,
      province: employees?.province?.name?.trim(),
      country: employees?.country?.name?.trim(),
      postal_code: employees?.postal_code,
      phone: employees?.phone,
      file: employees?.file,
      date_of_admission: employees?.date_of_admission,
      born_date: employees?.born_date,
      affiliate_status: employees?.affiliate_status,
      city: employees?.city?.name?.trim(),
      hierrl_position: employees?.hierarchical_position?.name,
      workflow_diagram: employees?.workflow_diagram?.name,
      contractor_employee: employees?.contractor_employee?.map(({ customers }: any) => customers?.id),
      is_active: employees?.is_active,
      reason_for_termination: employees?.reason_for_termination,
      termination_date: employees?.termination_date,
      status: employees?.status,
      documents_employees: employees.documents_employees,
      guild_id: employees?.guild?.id || employees?.guild_id,
      covenants_id: employees?.covenant?.id || employees?.covenants_id,
      category_id: employees?.category?.id || employees?.category_id,
      guild: employees?.guild_id?.name || employees?.guild_id,
      covenants: employees?.covenants_id?.name || employees?.covenants_id,
      category: employees?.category_id?.name || employees?.category_id,
      cost_center_id: employees?.cost_center_id,
      empleado_aptitudes:
        employees?.empleado_aptitudes?.map((apt: any) => ({
          aptitud_id: apt.aptitud_id,
          aptitudes_tecnicas: apt.aptitudes_tecnicas,
        })) || [],
    };
  });

  return employee;
};
export const getUser = async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    return user;
  }
  return error;
};
export const formatDocumentTypeName = (documentType: string) => {
  const formatedDocumentTypeName = documentType
    .toLowerCase()
    .replace(/[áäàâ]/g, 'a')
    .replace(/[éëèê]/g, 'e')
    .replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o')
    .replace(/[úüùû]/g, 'u')
    .replace(/ñ/g, 'n') // Reemplaza ñ por n
    .replace(/['"]/g, '') // Elimina apóstrofes y comillas
    .replace(/[^a-z0-9-]/g, '-') // Reemplaza cualquier carácter que no sea letra, número o guión por guión
    .replace(/-+/g, '-') // Reemplaza múltiples guiones consecutivos por uno solo
    .replace(/^-|-$/g, ''); // Elimina guiones al inicio y al final
  return formatedDocumentTypeName;
};
export const EMPLOYEES_TABLE: EmployeesTableOptions = {
  nationality: 'Nacionalidad',
  lastname: 'Apellido',
  firstname: 'Nombre',
  cuil: 'CUIL',
  document_type: 'Tipo de documento',
  document_number: 'Numero de documento',
  birthplace: 'Lugar de nacimiento',
  gender: 'Genero',
  marital_status: 'Estado civil',
  level_of_education: 'Nivel de educacion',
  province: 'Provincia',
  file: 'Legajo',
  normal_hours: 'Horas normales',
  date_of_admission: 'Fecha de admision',
  affiliate_status: 'Estado de afiliacion',
  company_position: 'Posicion en la compañia',
  hierarchical_position: 'Posicion Jerarquica',
  workflow_diagram: 'Diagrama de trabajo',
  type_of_contract: 'Tipo de contrato',
  allocated_to: 'Afectaciones',
  status: 'Estado',
  created_at: 'Fecha de creación',
  is_active: 'Activo',
};

export const VEHICLES_TABLE: VehiclesTableOptions = {
  created_at: 'Fecha de creación',
  type_of_vehicle: 'Tipo de vehículo',
  domain: 'Dominio',
  chassis: 'Chasis',
  engine: 'Motor',
  serie: 'Serie',
  intern_number: 'Número interno',
  year: 'Año',
  brand: 'Marca',
  model: 'Modelo',
  is_active: 'Activo',
  termination_date: 'Fecha de terminación',
  reason_for_termination: 'Razón de terminación',
  type: 'Tipo',
  status: 'Estado',
  allocated_to: 'Asignado a',
};
export const COMPANIES_TABLE: CompaniesTableOptions = {
  company_name: 'Nombre de la compañía',
  contact_email: 'Correo electrónico de contacto',
  contact_phone: 'Teléfono de contacto',
  address: 'Dirección',
  city: 'Ciudad',
  country: 'País',
  industry: 'Industria',
  company_logo: 'Logo de la compañía',
  company_cuit: 'CUIT de la compañía',
};
export const DOCUMENTS_TABLE: DocumentsTableOptions = {
  created_at: 'Fecha de creación',
  applies: 'Aplica a',
  description: 'Descripción',
  down_document: 'Descargar documento',
  explired: 'Vencimiento',
  is_it_montlhy: 'Mensual',
  mandatory: 'Mandatorio',
  multiresource: 'Multirecursos',
  name: 'Nombre',
  private: 'Privados',
  special: 'Especiales',
};
export const setVehiclesToShow = (vehicles: Awaited<ReturnType<typeof fetchAllEquipmentWithBrand>>) => {
  return vehicles?.map((item) => ({
    ...item,
    types_of_vehicles: item.types_of_vehicles?.name,
    brand: item.brand_vehicles?.name,
    model: item.model_vehicles?.name,
    type: item.type?.name,
  }));
};
// export const stylesPDF = StyleSheet.create({
//   page: {
//     flexDirection: 'column',
//     padding: 20,
//   },
//   section: {
//     marginBottom: 10,
//   },
//   label: {
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   value: {
//     fontSize: 12,
//     marginTop: 4,
//   },
//   checkboxContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   checkbox: {
//     width: 12,
//     height: 12,
//     borderWidth: 1,
//     marginRight: 8,
//   },
//   radioButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   radioLabel: {
//     fontSize: 12,
//     marginRight: 4,
//   },
//   text: {
//     marginRight: 20,
//   },
//   text2: {
//   },
// });
