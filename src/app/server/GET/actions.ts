'use server';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { getActualRole, mapEquipmentToChecklistFormat } from '@/lib/utils';
import moment from 'moment';
import { cookies } from 'next/headers';
// Employee-related actions

export const setNewCompanyUserMetadata = async (company_id: string) => {
  const supabase = await adminSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.company !== company_id && company_id) {
    const { data, error } = await supabase.auth.admin.updateUserById(user?.id || '', {
      app_metadata: {
        company: company_id,
      },
    });

    if (error) {
      // console.error('Error updating user metadata:', error);
      return;
    }
  }

  return;
};

export const updateDocumentType = async (id: string, data: any) => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return;

  const { error } = await supabase.from('document_types').update(data).eq('id', id);

  if (error) {
    return error;
  }

  return null;
};

export const fetchallResources = async (applies: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  if (applies === 'Persona') {
    const { data, error } = await supabase
      .from('employees')
      .select('firstname,lastname, cuil,id')
      .eq('company_id', company_id || '');

    if (error) {
      console.error('Error al obtener datos adicionales:', error);
    } else {
      return data;
    }
  } else if (applies === 'Equipos') {
    const { data, error } = await supabase
      .from('vehicles')
      .select('domain, serie, intern_number,id')
      .eq('company_id', company_id || '');

    if (error) {
      console.error('Error al obtener datos adicionales:', error);
    } else {
      return data;
    }
  }
};

export const fettchExistingEntries = async (applies: string, id_document_types: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const tableNames = {
    Equipos: 'documents_equipment',
    Persona: 'documents_employees',
  };
  const table = tableNames[applies as 'Equipos' | 'Persona'];

  const { data: existingEntries, error: existingEntriesError } = await supabase
    .from(table as 'documents_equipment' | 'documents_employees')
    .select('applies(*),id')
    .eq('id_document_types', id_document_types)
    .eq('applies.company_id', company_id || '')
    .not('applies', 'is', null);

  if (existingEntriesError) {
    console.error('Error al obtener los recursos con documentos:', existingEntriesError);
    return;
  }
  return existingEntries;
};

export const fetchAllEmployeesWithRelations = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  let { data, error } = await supabase
    .from('employees')
    .select(
      `*,guild(*),covenant(*),category(*), city (
      *
    ),
    province(
      *
    ),
    workflow_diagram(
      *
    ),
    hierarchical_position(
      *
    ),
    company_position(
      *
    ),
    birthplace(
      *
    ),
    contractor_employee(
      customers(
        *
      )
    )`
    )
    .eq('company_id', company_id || '')
    .order('lastname')
    .returns<EmployeeDetailed[]>();

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data ?? [];
};
export const fetchAllEmployeesWithRelationsById = async (id: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const user = await fetchCurrentUser();
  if (!company_id) return [];

  let { data, error } = await supabase
    .from('employees')
    .select(
      `*,guild(*),covenant(*),category(*), city (
    *
  ),
  province(
    *
  ),
  workflow_diagram(
    *
  ),
  hierarchical_position(
    *
  ),
  birthplace(
    *
  ),
  contractor_employee(
    customers(
      *
    )
  )`
    )
    .eq('company_id', company_id || '')
    .eq('id', id)
    .returns<EmployeeDetailed[]>();

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data ?? [];
};
export const fetchAllEquipmentWithRelations = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('vehicles')
    .select('*,brand(*),model(*),type(*),types_of_vehicles(*),contractor_equipment(*,contractor_id(*))')
    .eq('company_id', company_id || '')
    .order('domain')
    .returns<VehicleWithBrand[]>();

  if (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
  return data;
};
export const fetchAllEquipmentWithRelationsById = async (id: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('vehicles')
    .select('*,brand(*),model(*),type(*),types_of_vehicles(*),contractor_equipment(*,contractor_id(*))')
    .eq('company_id', company_id || '')
    .eq('id', id)
    .returns<VehicleWithBrand[]>();

  if (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
  return data;
};
// Company-related actions
export const fetchCurrentCompany = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  let company_id = cookiesStore.get('actualComp')?.value;

  // Si no hay cookie, intentar obtener company_id desde app_metadata (contexto de maintenance)
  if (!company_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si estamos en contexto de maintenance, el company_id está en app_metadata
    if (user?.app_metadata?.company) {
      company_id = user.app_metadata.company as string;
    }
  }

  // Si aún no hay company_id, retornar array vacío sin hacer query (evitar error de UUID vacío)
  if (!company_id || company_id.trim() === '') {
    return [];
  }

  const { data, error } = await supabase.from('company').select('*').eq('id', company_id);

  if (error) {
    console.error('Error fetching company:', error);
    return [];
  }
  return data || [];
};
export const findEmployeeByFullName = async (fullName: string) => {
  try {
    const cookiesStore = await cookies();
    const company_id = cookiesStore.get('actualComp')?.value;

    const supabase = await supabaseServer();
    const { data: employees, error } = await supabase
      .rpc('find_employee_by_full_name_v2', {
        p_full_name: fullName,
        p_company_id: company_id || '',
      })
      .returns<Employee[]>();

    if (error) {
      console.error('Error al buscar empleado por nombre completo:', error);
      return null;
    }

    return employees?.[0] || null;
  } catch (error) {
    console.error('Error al buscar empleado por nombre completo:', error);
    return null;
  }
};
export const fetchSingEmployee = async (employeesId: string) => {
  //Traer el tipo de documento que se llame firma
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('document_types')
    .select('id')
    .eq('name', 'Firma')
    .eq('is_active', true)
    .single();

  const { data: employeeSingDocument, error: employeeSingDocumentError } = await supabase
    .from('documents_employees')
    .select('*')
    .eq('id_document_types', data?.id || '')
    .eq('applies', employeesId)
    .not('document_path', 'is', null)
    .eq('is_active', true);
  // .single();

  if (error) {
    console.error('Error fetching document type:', error);
    return null;
  }

  const data2 = supabase.storage.from('document-files').getPublicUrl(employeeSingDocument?.[0]?.document_path || '');

  return data2.data.publicUrl || null;
};
export const fetchCompanyDocuments = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_company')
    .select('*,id_document_types(*),user_id(*)')
    .eq('applies', company_id)
    .returns<CompanyDocumentDetailed[]>();

  if (error || !data) {
    console.error('Error fetching company documents:', error);
    return [];
  }
  return data;
};
// Employee-related actions
export const fetchAllEmployees = async (role?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const user = await fetchCurrentUser();
  if (!company_id) return [];

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('share_company_users')
      .select(
        `*,
        customer_id(*,contractor_employee(*,employee_id(*)))`
      )
      .eq('profile_id', user?.id || '')
      .eq('company_id', company_id)
      .returns<ShareCompanyUsersWithRelations[]>();

    const employees = data?.[0].customer_id?.contractor_employee;
    const allEmployees = employees?.map((employee) => employee.employee_id);

    return allEmployees || [];
  }

  const { data, error } = await supabase
    .from('employees')
    .select(
      '*,guild_id(name),covenants_id(name),category_id(name),company_position(name),hierarchical_position(name),city(name),province(name),workflow_diagram(name),birthplace(name)'
    )
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchAllActivesEmployees = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', company_id)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchAllEmployeesJUSTEXAMPLE = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('employees').select('*');

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchAllEquipmentJUSTEXAMPLE = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('vehicles')
    .select('*,type(*),brand(*),model(*)')
    .returns<VehicleWithBrand[]>();

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchAllRepairsJUSTEXAMPLE = async () => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('repair_solicitudes').select('*');

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchEmployeeMonthlyDocuments = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_employees')
    .select(
      '*,documents_employees_logs(updated_at),document_types(*),employees(*,contractor_employee(*, customers(*)))'
    )
    .eq('employees.company_id', company_id)
    .eq('document_types.is_it_montlhy', true)
    .not('document_types', 'is', null)
    .not('employees', 'is', null);

  if (error) {
    console.error('Error fetching employee monthly documents:', error);
    return [];
  }
  return data;
};
export const fetchEmployeeMonthlyDocumentsByEmployeeId = async (employeeId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();
  // const role = await getActualRole(company_id as string, user?.id as string);

  // if (role === 'Invitado') {
  //   const { data, error } = await supabase
  //     .from('documents_employees')
  //     .select('*,id_document_types(*),applies(*,contractor_employee(*, customers(*)))')
  //     .eq('applies', employeeId)
  //     .eq('id_document_types.is_it_montlhy', true)
  //     .eq('id_document_types.private', false)
  //     .not('id_document_types', 'is', null)
  //     .returns<EmployeeDocumentWithContractors[]>();

  //   if (error) {
  //     console.error('Error fetching employee monthly documents:', error);
  //     return [];
  //   }
  //   return data;
  // } else {
  const { data, error } = await supabase
    .from('documents_employees')
    .select('*,id_document_types(*),applies(*,contractor_employee(*, customers(*)))')
    .eq('applies', employeeId)
    .eq('id_document_types.is_it_montlhy', true)
    .not('id_document_types', 'is', null)
    .returns<EmployeeDocumentWithContractors[]>();

  if (error) {
    console.error('Error fetching employee monthly documents:', error);
    return [];
  }
  return data;
};
// };
export const fetchEmployeePermanentDocumentsByEmployeeId = async (employeeId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();
  // const role = await getActualRole(company_id as string, user?.id as string);

  // if (role === 'Invitado') {
  //   const { data, error } = await supabase
  //     .from('documents_employees')
  //     .select('*,id_document_types(*),applies(*,contractor_employee(*, customers(*)))')
  //     .eq('applies', employeeId)
  //     .eq('id_document_types.is_it_montlhy', false)
  //     .eq('id_document_types.private', false)
  //     .not('id_document_types', 'is', null)
  //     .returns<EmployeeDocumentWithContractors[]>();

  //   if (error) {
  //     console.error('Error fetching employee permanent documents:', error);
  //     return [];
  //   }
  //   return data;
  // } else {
  const { data, error } = await supabase
    .from('documents_employees')
    .select('*,id_document_types(*),applies(*,contractor_employee(*, customers(*)))')
    .eq('applies', employeeId)
    .eq('id_document_types.is_it_montlhy', false)
    .not('id_document_types', 'is', null)
    .returns<EmployeeDocumentWithContractors[]>();

  if (error) {
    console.error('Error fetching employee permanent documents:', error);
    return [];
  }
  return data;
};
// };
export const fetchEmployeePermanentDocuments = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_employees')
    .select(
      '*,documents_employees_logs(updated_at),document_types(*),employees(*,contractor_employee(*, customers(*)))'
    )
    .eq('employees.company_id', company_id)
    .not('document_types.is_it_montlhy', 'is', true)
    .not('document_types', 'is', null)
    .not('employees', 'is', null);

  if (error) {
    console.error('Error fetching employee permanent documents:', error);
    return [];
  }
  return data;
};
export const getDiagramEmployee = async ({ employee_id }: { employee_id: string }) => {
  const supabase = await supabaseServer();
  let { data: employees_diagram, error } = await supabase
    .from('employees_diagram')
    .select('*')
    .eq('employee_id', employee_id);
  if (error) {
    console.error('Error fetching document types:', error);
    return [];
  }
  return employees_diagram || [];
};

// Document-related actions
export const fetchAllDocumentTypes = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .eq('is_active', true)
    .or(`company_id.eq.${company_id},company_id.is.null`)
    .order('name');

  if (error) {
    console.error('Error fetching document types:', error);
    return [];
  }
  return data || [];
};
export const fetchDocumentsByDocumentTypeId = async (documentTypeId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_employees')
    .select('*')
    .eq('id_document_types', documentTypeId)
    .neq('document_path', null);

  if (error) {
    console.error('Error fetching documents by document type:', error);
    return [];
  }
  return data;
};
export const getNextMonthExpiringDocumentsEmployees = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!company_id) return [];

  const today = moment().startOf('day');
  const nextMonth = moment().add(1, 'month').endOf('day');

  const { data, error } = await supabase
    .from('documents_employees')
    .select('*,id_document_types(*),applies!inner(*,contractor_employee(*, customers(*)))')
    .eq('applies.is_active', true)
    .not('id_document_types.is_it_montlhy', 'is', true)
    .or(`validity.lte.${today.toISOString()},validity.lte.${nextMonth.toISOString()}`)
    .not('validity', 'is', null)
    .eq('applies.company_id', company_id || user?.app_metadata?.company || '')
    .order('validity', { ascending: true }) // Ordenar por fecha de validez en orden ascendente
    .returns<EmployeeDocumentWithContractors[]>();

  if (error) {
    console.error('Error fetching next month expiring documents:', error);
    return [];
  }
  return data;
};
export const getNextMonthExpiringDocumentsVehicles = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!company_id) return [];

  const today = moment().startOf('day');
  const nextMonth = moment().add(1, 'month').endOf('day');

  const { data, error } = await supabase
    .from('documents_equipment')
    .select('*,id_document_types(*),applies!inner(*,type(*),brand(*),model(*))')
    .eq('applies.company_id', company_id || user?.app_metadata?.company || '')
    .not('id_document_types.is_it_montlhy', 'is', true)
    .not('id_document_types', 'is', null)
    .or(`validity.lte.${today.toISOString()},validity.lte.${nextMonth.toISOString()}`)
    .not('applies', 'is', null)
    .not('validity', 'is', null)
    .order('validity', { ascending: true }) // Ordenar por fecha de validez en orden ascendente
    .returns<EquipmentDocumentDetailed[]>();

  if (error) {
    console.error('Error fetching next month expiring documents:', error);
    return [];
  }
  return data;
};
export const getDocumentEmployeesById = async (id: string) => {
  const supabase = await supabaseServer();
  let { data: documents_employee } = await supabase
    .from('documents_employees')
    .select(
      `
    *,
    document_types(*),
    applies(*,
      city(name),
      province(name),
      contractor_employee(
        customers(*)),
        company_id(*,province_id(name))
          )
          `
    )
    .eq('id', id);
  return documents_employee;
};
export const getDocumentEquipmentById = async (id: string) => {
  const supabase = await supabaseServer();
  let { data: documents_vehicle } = await supabase
    .from('documents_equipment')
    .select(
      `
      *,
      document_types(*),
      applies(*,brand(name),model(name),type_of_vehicle(name), company_id(*,province_id(name)))`
    )
    .eq('id', id);
  return documents_vehicle;
};
export const fetchTypeVehicles = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('type')
    .select('id,name')
    .order('name', { ascending: true })
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching vehicle types:', error);
    return [];
  }
  return data;
};
export const fetchCompanyPositions = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('company_positions').select('*').eq('is_active', true);

  if (error) {
    console.error('Error fetching company positions:', error);
    return [];
  }
  return data;
};
export const fetchProvinces = async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('provinces').select('id,name');

  if (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
  return data;
};
export const fetchHierrarchicalPositions = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('hierarchy').select('*').eq('is_active', true);

  if (error) {
    console.error('Error fetching hierarchical positions:', error);
    return [];
  }
  return data;
};

export const fetchAllCategories = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('category').select('*').eq('is_active', true);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data;
};

export const fetchCovenants = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('covenant').select('*').eq('is_active', true);

  if (error) {
    console.error('Error fetching covenants:', error);
    return [];
  }
  return data;
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

export const fetchGuilds = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('guild').select('*');

  if (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }
  return data;
};

export const fetchWorkDiagrams = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('work_diagram').select('*').eq('is_active', true);

  if (error) {
    console.error('Error fetching work diagrams:', error);
    return [];
  }
  return data;
};

export const fetchCustomers = async () => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('customers').select('id,name').eq('is_active', true);

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data;
};

export const fetchTypesOfVehicles = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('types_of_vehicles').select('id,name').eq('is_active', true);

  if (error) {
    console.error('Error fetching types of vehicles:', error);
    return [];
  }
  return data;
};
export const fetchVehicleModels = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('model_vehicles').select('id,name').eq('is_active', true);

  if (error) {
    console.error('Error fetching vehicle models:', error);
    return [];
  }
  return data;
};
// Equipment-related actions
export const fetchVehicleBrands = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('brand_vehicles').select('id,name').eq('is_active', true);

  if (error) {
    console.error('Error fetching vehicle brands:', error);
    return [];
  }
  return data;
};

export const fetchAllEquipmentWithBrand = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  let { data: equipments, error } = await supabase
    .from('vehicles')
    .select(
      `*,
    types_of_vehicles(name),
    brand_vehicles(name),
    type(name),
    model_vehicles(name)`
    )
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  return equipments || [];
};
export const fetchAllEquipmentBasicData = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  let { data: equipments, error } = await supabase
    .from('vehicles')
    .select(`id,condition,picture,year,company_id, domain, serie, intern_number,kilometer, types_of_vehicles(name)`)
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  return equipments || [];
};

export const fetchAllEquipment = async (company_equipment_id?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id && !company_equipment_id) return [];

  const { data, error } = await supabase
    .from('vehicles')
    .select('*,brand(*),model(*),type(*),subType(*),types_of_vehicles(*),contractor_equipment(*,contractor_id(*))')
    .eq('company_id', (company_id ?? company_equipment_id) || '')
    .order('domain', { ascending: true })
    .returns<VehicleWithBrand[]>();

  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  return data;
};
export const fetchMonthlyDocumentsByEquipmentId = async (equipmentId: string) => {
  if (!equipmentId) return [];
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('documents_equipment')
      .select(`*,id_document_types(*),applies(*,type(*),type_of_vehicle(*),model(*),brand(*))`)
      .eq('id_document_types.is_it_montlhy', true)
      .eq('id_document_types.private', false)
      .not('id_document_types', 'is', null)
      .eq('applies', equipmentId)
      .returns<EquipmentDocumentDetailed[]>();

    if (error) {
      console.error('Error fetching equipment monthly documents:', error);
      return [];
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from('documents_equipment')
      .select(`*,id_document_types(*),applies(*,type(*),type_of_vehicle(*),model(*),brand(*))`)
      .eq('id_document_types.is_it_montlhy', true)
      .not('id_document_types', 'is', null)
      .eq('applies', equipmentId)
      .returns<EquipmentDocumentDetailed[]>();

    if (error) {
      console.error('Error fetching equipment monthly documents:', error);
      return [];
    }
    return data;
  }
};
export const fetchMonthlyDocumentsEquipment = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_equipment')
    .select(`*,id_document_types(*),applies(*,type(*),type_of_vehicle(*),model(*),brand(*))`)
    .eq('id_document_types.is_it_montlhy', true)
    .eq('applies.company_id', company_id)
    .not('id_document_types', 'is', null)
    .not('applies', 'is', null)
    .returns<EquipmentDocumentDetailed[]>();

  if (error) {
    console.error('Error fetching equipment monthly documents:', error);
    return [];
  }
  return data;
};
export const fetchSimpleMonthlyDocumentsEquipment = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_equipment')
    .select(
      `*,documents_equipment_logs(updated_at),document_types(*),vehicles(serie,intern_number,domain,id,is_active,contractor_equipment(*,customers(*)))`
    )
    .eq('document_types.is_it_montlhy', true)
    .eq('vehicles.company_id', company_id)
    .not('document_types', 'is', null)
    .not('vehicles', 'is', null);

  if (error) {
    console.error('Error fetching equipment monthly documents:', error);
    return [];
  }
  return data;
};
export const fetchPermanentDocumentsByEquipmentId = async (equipmentId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (!equipmentId) return [];

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('documents_equipment')
      .select(`*,id_document_types(*),applies(*,type(*),type_of_vehicle(*),model(*),brand(*))`)
      .not('id_document_types.is_it_montlhy', 'is', true)
      .eq('id_document_types.private', false)
      .eq('applies', equipmentId)
      .not('id_document_types', 'is', null)
      .returns<EquipmentDocumentDetailed[]>();

    if (error) {
      console.error('Error fetching equipment permanent documents:', error);
      return [];
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from('documents_equipment')
      .select(`*,id_document_types(*),applies(*,type(*),type_of_vehicle(*),model(*),brand(*))`)
      .not('id_document_types.is_it_montlhy', 'is', true)
      .eq('applies', equipmentId)
      .not('id_document_types', 'is', null)
      .returns<EquipmentDocumentDetailed[]>();

    if (error) {
      console.error('Error fetching equipment permanent documents:', error);
      return [];
    }
    return data;
  }
};
export const fetchTypeOfContracts = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('types_of_contract').select('*').eq('is_active', true);

  if (error) {
    console.error('Error fetching type of contracts:', error);
    return [];
  }
  return data;
};
export const fetchPermanentDocumentsEquipment = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_equipment')
    .select(`*,id_document_types(*),applies(*,type(*),type_of_vehicle(*),model(*),brand(*))`)
    .eq('applies.company_id', company_id)
    .not('id_document_types.is_it_montlhy', 'is', true)
    .not('id_document_types', 'is', null)
    .not('applies', 'is', null)
    .returns<EquipmentDocumentDetailed[]>();

  if (error) {
    console.error('Error fetching equipment permanent documents:', error);
    return [];
  }
  return data;
};
export const fetchSimplePermanentDocumentsEquipment = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('documents_equipment')
    .select(
      `*,documents_equipment_logs(updated_at),document_types(*),vehicles(serie,intern_number,domain,id,is_active,contractor_equipment(*,customers(*)))`
    )
    .eq('vehicles.company_id', company_id)
    .not('document_types.is_it_montlhy', 'is', true)
    .not('document_types', 'is', null)
    .not('vehicles', 'is', null);

  if (error) {
    console.error('Error fetching equipment permanent documents:', error);
    return [];
  }
  return data;
};
export const fetchEquipmentById = async (id: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data: vehicleData, error } = await supabase
    .from('vehicles')
    .select('*, brand_vehicles(name), model_vehicles(name),types_of_vehicles(name),type(name)')
    .eq('id', id);

  if (error) console.error('eroor', error);

  const vehicle = vehicleData?.map((item: any) => ({
    ...item,
    type_of_vehicle: item.types_of_vehicles.name,
    brand: item.brand_vehicles.name,
    model: item.model_vehicles.name,
    type: item.type.name,
  }));
  return vehicle;
};
// Repair-related actions
export const fetchAllOpenRepairRequests = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('repair_solicitudes')
    .select(
      '*,user_id(*),employee_id(*),equipment_id(*,type(*),brand(*),model(*)),reparation_type(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))'
    )
    .eq('equipment_id.company_id', company_id)
    .in('state', ['Pendiente', 'Esperando repuestos', 'En reparacion'])
    .returns<RepairRequestDetailed[]>();

  if (error) {
    console.error('Error fetching open repair requests:', error);
    return [];
  }
  return data;
};
export const fetchRepairRequestsByEquipmentId = async (equipmentId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('repair_solicitudes')
    .select(
      '*,user_id(*),employee_id(*),equipment_id(*,type(*),brand(*),model(*)),reparation_type(*),repairlogs(*,modified_by_employee(*),modified_by_user(*))'
    )
    .eq('equipment_id', equipmentId)
    .in('state', ['Pendiente', 'Esperando repuestos', 'En reparacion'])
    .returns<RepairRequestDetailed[]>();

  if (error) {
    console.error('Error fetching repair requests by equipment ID:', error);
    return [];
  }
  return data;
};
// Users-related actions

export const getAllUsers = async () => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const { data, error } = await supabase
    .from('share_company_users')
    .select('*,  profile_id(*),customer_id(*)')
    .eq('company_id', company_id || '')
    .order('profile_id(fullname)', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
};
export const getUsersbyId = async ({ id }: { id: string }) => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const { data, error } = await supabase
    .from('share_company_users')
    .select('*,  profile_id(*)')
    .eq('company_id', company_id || '')
    .eq('id', id || '');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
};
export const getOwnerUser = async () => {
  const supabase = await supabaseServer();
  const curretUser = await fetchCurrentCompany();
  if (!curretUser) return [];

  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('id', curretUser[0]?.owner_id || '');

  if (error) {
    console.error('Error fetching owner user:', error);
    return [];
  }
  return data;
};

// Miscellaneous actions
export const fetchCurrentUser = async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};
export const fetchCustomForms = async (id_company?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id && !id_company) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data: share_company_users, error: share_company_users_error } = await supabase
      .from('share_company_users')
      .select(`*,customer_id(*,contractor_equipment(*,equipment_id(*,brand(*),model(*),type(*),types_of_vehicles(*))))`)
      .eq('profile_id', user?.id || '')
      .eq('company_id', company_id || '')
      .returns<ShareCompanyUsersWithEquipment[]>();

    const equipments_id = share_company_users?.flatMap((uc) =>
      uc.customer_id?.contractor_equipment?.map((ce) => ce.equipment_id.id)
    );

    // return [];

    const { data, error } = await supabase
      .from('custom_form')
      .select('*,form_answers(*)')
      .eq('company_id', company_id || id_company || '')
      .in('form_answers.answer->>movil', equipments_id || [])
      .returns<CheckListWithAnswer[]>();

    if (error) {
      console.error('Error fetching custom forms:', error);
      return [];
    }
    return data;
  }
  const { data, error } = await supabase
    .from('custom_form')
    .select('*,form_answers(*)')
    .eq('company_id', company_id || id_company || '')
    .returns<CheckListWithAnswer[]>();
  if (error) {
    console.error('Error fetching custom forms:', error);
    return [];
  }
  return data;
};
export const fetchCustomFormById = async (formId: string) => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('custom_form').select('*').eq('id', formId);

  if (error) {
    console.error('Error fetching custom form by ID:', error);
    return [];
  }
  return data;
};
export const fetchFormsAnswersByFormId = async (formId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data: share_company_users, error: share_company_users_error } = await supabase
      .from('share_company_users')
      .select(`*,customer_id(*,contractor_equipment(*,equipment_id(*,brand(*),model(*),type(*),types_of_vehicles(*))))`)
      .eq('profile_id', user?.id || '')
      .eq('company_id', company_id || '')
      .returns<ShareCompanyUsersWithEquipment[]>();

    const equipments_id =
      share_company_users?.flatMap((uc) => uc.customer_id?.contractor_equipment?.map((ce) => ce.equipment_id.id)) || [];

    const { data, error } = await supabase
      .from('form_answers')
      .select('*')
      .eq('form_id', formId)
      .in('answer->>movil', equipments_id || [])
      .returns<CheckListAnswerWithForm[]>();

    if (error) {
      console.error('Error fetching form answers:', error);
      return [];
    }
    return data;
  }

  // Si no es invitado, retorna todas las respuestas del formulario
  const { data, error } = await supabase
    .from('form_answers')
    .select('*')
    .eq('form_id', formId)
    .returns<CheckListAnswerWithForm[]>();

  if (error) {
    console.error('Error fetching form answers:', error);
    return [];
  }
  return data;
};
export const fetchAnswerById = async (answerId: string) => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('form_answers')
    .select('*,form_id(*)')
    .eq('id', answerId)
    .returns<CheckListAnswerWithForm[]>()
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching form answers:', error);
    return [];
  }
  return data ?? [];
};
export const getCurrentProfile = async () => {
  const user = await fetchCurrentUser();

  if (!user) return [];
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('id', user?.id || '');

  if (error) {
    console.error('Error fetching current profile:', error);
    return [];
  }
  return data;
};
// ❌ DEPRECATED: Sistema viejo de roles - Usar getUserAccessibleModulesServer() del nuevo sistema
// export const verifyUserRoleInCompany = async () => {
//   const cookiesStore = await cookies();
//   const supabase = await supabaseServer();
//   const company_id = cookiesStore.get('actualComp')?.value;
//   if (!company_id) return '';

//   const user = await fetchCurrentUser();
//   if (!user) return '';
//   const { data, error } = await supabase
//     .from('share_company_users')
//     .select('*')
//     .eq('profile_id', user?.id || '')
//     .eq('company_id', company_id);

//   if (error) {
//     console.error('Error verifying user role:', error);
//     return '';
//   }

//   return { rol: data[0]?.role || '', modulos: data[0]?.modules || [] };
// };

export const fetchDiagramsHistoryByEmployeeId = async (employeeId: string) => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('diagrams_logs')
    .select('*,modified_by(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching diagrams history:', error);
    return [];
  }
  return data;
};
export const fetchDiagrams = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees_diagram')
    .select('*,diagram_type(*),employee_id(*)')
    .eq('employee_id.company_id', company_id)
    .returns<EmployeeDiagramWithDiagramType[]>();

  if (error) {
    console.error('Error fetching diagrams:', error);
    return [];
  }
  return data;
};
export const fetchDiagramsByEmployeeId = async (employeeId: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees_diagram')
    .select('*,diagram_type(*),employee_id(*)')
    .eq('employee_id.id', employeeId)
    .not('employee_id', 'is', null)
    .returns<EmployeeDiagramWithDiagramType[]>();

  if (error) {
    console.error('Error fetching diagrams:', error);
    return [];
  }
  return data;
};

export const fetchDiagramsTypes = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const { data, error } = await supabase
    .from('diagram_type')
    .select('*')
    .eq('company_id', company_id || '')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching diagrams types:', error);
    return [];
  }
  return data;
};

export const fetchAllProvinces = async () => {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.from('provinces').select('*');

    if (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
    return data;
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
};

export const fetchServiceItems = async (company_id: string, user_id: string, customer_service_id: string) => {
  const supabase = await supabaseServer();

  try {
    if (!company_id || !customer_service_id) {
      console.error('Missing required parameters:', { company_id, customer_service_id });
      return [];
    }

    const { data: items, error } = await supabase
      .from('service_items')
      .select(
        `
        *,
        item_measure_units (
          id,
          unit
        ),
        customer_service_id (
          id,
          customers!customer_services_customer_id_fkey (
            id,
            name
          )
        )
      `
      )
      .eq('company_id', company_id)
      .eq('customer_service_id', customer_service_id);

    if (error) {
      console.error('Error fetching service items:', error);
      throw new Error(JSON.stringify(error));
    }

    return items || [];
  } catch (error) {
    console.error('Error in fetchServiceItems:', error);
    throw error;
  }
};

export async function fetchEmployeesByCompany() {
  try {
    const supabase = await supabaseServer();
    const cookiesStore = await cookies();
    const company_id = cookiesStore.get('actualComp')?.value;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    let { data: employees, error } = await supabase.from('employees').select('*').eq('company_id', company_id);

    if (error) {
      throw error;
    }

    return employees || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}
export async function getEmployeesIds() {
  try {
    const supabase = await supabaseServer();
    const cookiesStore = await cookies();
    const company_id = cookiesStore.get('actualComp')?.value;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    let { data: employees, error } = await supabase
      .from('employees')
      .select('id,firstname,lastname,document_number')
      .eq('company_id', company_id);

    if (error) {
      throw error;
    }

    return employees || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

export async function fetchEmployeeDiagrams(employeeId?: string) {
  try {
    const supabase = await supabaseServer();
    const PAGE_SIZE = 1000; // Tamaño máximo de página de Supabase
    let allDiagrams: any[] = [];
    let page = 0;
    let hasMore = true;

    if (employeeId) {
      // Consulta paginada para un empleado específico
      while (hasMore) {
        const {
          data: employeeDiagrams,
          error,
          count,
        } = await supabase
          .from('employees_diagram')
          .select('*, diagram_type(*)', { count: 'exact' })
          .eq('employee_id', employeeId)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
          throw error;
        }

        if (employeeDiagrams) {
          allDiagrams = [...allDiagrams, ...employeeDiagrams];
        }

        // Verificar si hay más páginas
        hasMore = employeeDiagrams?.length === PAGE_SIZE;
        page++;
      }

      return allDiagrams;
    }

    // Consulta paginada para todos los empleados
    while (hasMore) {
      const { data: diagramsPage, error } = await supabase
        .from('employees_diagram')
        .select(
          `
          *,
          employee_id,
          employees(*),
          diagram_type(*)
        `
        )
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        throw error;
      }

      if (diagramsPage) {
        allDiagrams = [...allDiagrams, ...diagramsPage];
      }

      // Verificar si hay más páginas
      hasMore = diagramsPage?.length === PAGE_SIZE;
      page++;
    }

    return allDiagrams;
  } catch (error) {
    console.error('Error fetching employee diagrams:', error);
    throw error;
  }
}

export async function getCompanyDetails(companyId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('company')
    .select('id, company_name, website, contact_email, company_logo')
    .eq('id', companyId)
    .single();

  if (error) {
    console.error('Error fetching company details:', error);
    return null;
  }

  return data;
}

export async function getDiagramsDay() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const supabase = await supabaseServer();
  let { data: diagrams_day, error } = await supabase
    .from('employees_diagram')
    .select('diagram_type(*)')

    // Filters
    .eq('day', day)
    .eq('month', month)
    .eq('year', year);

  if (error) {
    console.error('Error fetching company details:', error);
    return null;
  }

  return diagrams_day;
}

export async function getActiveEmployees() {
  const supabase = await supabaseServer();
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching company details:', error);
    return null;
  }
  return count;
}

export async function getUsegeEmployees() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('dailyreport')
    .select('id')
    .eq('date', new Date().toISOString().split('T')[0]);

  if (data?.length !== 0) {
    const { data: dailyreportrow, error } = await supabase
      .from('dailyreportrows')
      .select('id')
      .eq('dailyreport_id', data![0].id);
    return dailyreportrow;
  }

  if (error) {
    console.error('Error fetching company details:', error);
    return null;
  }
  return data;
}

export async function getUniqueEmployeeCountByDate(date: string) {
  try {
    // Realizar la consulta con JOINs para obtener el conteo de empleados únicos
    const supabase = await supabaseServer();
    const { count, error } = await supabase
      .from('dailyreport')
      .select(
        `
        dailyreportrows!inner(
          dailyreportemployeerelations!inner(
            employee_id
          )
        )
      `,
        { count: 'exact', head: true }
      )
      .eq('date', date);

    if (error) {
      console.error('Error fetching unique employee count:', error);
      return { success: false, error: error.message, count: 0 };
    }

    // Si necesitamos contar empleados únicos manualmente (alternativa)
    const { data, error: dataError } = await supabase
      .from('dailyreport')
      .select(
        `
        dailyreportrows!inner(
          dailyreportemployeerelations!inner(
            employee_id
          )
        )
      `
      )
      .eq('date', date);

    if (dataError) {
      console.error('Error fetching employee data:', dataError);
      return { success: false, error: dataError.message, count: 0 };
    }

    // Extraer y contar empleados únicos
    const uniqueEmployeeIds = new Set();
    data?.forEach((report: any) => {
      report.dailyreportrows?.forEach((row: any) => {
        row.dailyreportemployeerelations?.forEach((relation: any) => {
          uniqueEmployeeIds.add(relation.employee_id);
        });
      });
    });

    return {
      success: true,
      count: uniqueEmployeeIds.size,
      date: date,
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: 'Unexpected error occurred',
      count: 0,
    };
  }
}

export async function getVehiclesDisponibleFilterType(type_row_id?: string[], company_id?: string) {
  // const type1 = '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
  // const type2 = 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('get_vehicle_usage_indicator', {
    p_vehicle_type_ids: type_row_id || [],
    p_company_id: company_id || null,
    save_to_table: false,
  } as any);

  if (error) console.error(error, 'get_vehicle_usage_indicator');
  else return data;
}

export async function getEmployeeIndicator(company_id?: string, p_row_id: string[] = []) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase.rpc('get_employee_usage_indicator', {
      p_company_id: company_id || null,
      position_uuids: p_row_id.length > 0 ? p_row_id : null,
      save_to_table: false,
    } as any);

    if (error) {
      console.error('Error en getEmployeeIndicator:', error);
      return [
        {
          employees_operativos: 0,
          employees_used: 0,
          indicator: 0,
        },
      ];
    }

    // Asegurarse de que siempre devolvemos un array con al menos un elemento
    if (!data || data.length === 0) {
      return [
        {
          employees_operativos: 0,
          employees_used: 0,
          indicator: 0,
        },
      ];
    }

    return data;
  } catch (error) {
    console.error('Excepción en getEmployeeIndicator:', error);
    return [
      {
        employees_operativos: 0,
        employees_used: 0,
        indicator: 0,
      },
    ];
  }
}

export async function getEmployeesNotInDailyReport(company_id?: string, position_uuids?: string[]) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase.rpc('get_employees_not_in_daily_report', {
      p_company_id: company_id || undefined,
      position_uuids: position_uuids && position_uuids.length > 0 ? position_uuids : undefined,
    });

    if (error) {
      console.error('Error en getEmployeesNotInDailyReport:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Excepción en getEmployeesNotInDailyReport:', error);
    return [];
  }
}

export type EmployeeNotInDailyReportType = Awaited<ReturnType<typeof getEmployeesNotInDailyReport>>;

export async function getDiagramIndicator(p_company_position_ids?: string[]) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('get_employee_diagram_count_by_day', {
    p_day: new Date().getDate(),
    p_month: new Date().getMonth() + 1,
    p_year: new Date().getFullYear(),
    p_company_position_ids: p_company_position_ids || undefined,
    save_to_table: false,
  } as any);

  if (error) console.error(error);
  else return data;
}
export async function getEmployeeById(employeeId: string) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return null;

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      id,
      termination_date,
      reason_for_termination,
      firstname,
      lastname,
      nationality,
      born_date,
      cuil,
      document_type,
      document_number,
      birthplace,
      gender,
      marital_status,
      level_of_education,
      picture,
      street,
      street_number,
      provinces(id,name),
      cities(id,name),
      postal_code,
      phone,
      email,
      file,
      hierarchical_position,
      company_position,
      workflow_diagram,
      normal_hours,
      types_of_contract(id,name),
      date_of_admission,
      guild_id,
      covenants_id,
      category_id,
      company_positions(id,name),
      cost_center_id,
      contractor_employee(customers(id)),
      is_active,
      hierarchy(id,name),
      countries(id,name),
      empleado_aptitudes(aptitudes_tecnicas(id,nombre)),
      cost_type,
      workshop_sector_id
    `
    )
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  // Transform contractor relationships to allocated_to array
  const allocated_to = data.contractor_employee?.map((rel) => rel?.customers?.id) || [];
  const aptitudes = data.empleado_aptitudes?.map((rel) => rel?.aptitudes_tecnicas?.id) || [];

  return {
    ...data,
    allocated_to,
    contractor_employee: undefined, // Remove the nested object
    aptitudes,
  };
}
export async function getEmployeeNameById(employeeId: string) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return null;

  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      firstname,
      lastname
    `
    )
    .eq('id', employeeId)
    .eq('company_id', company_id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  return data;
}

export async function getVehiclesNonOperative(company_id?: string, vehicle_type_ids?: string[]) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase.rpc('get_vehicles_non_operative', {
      p_company_id: company_id || undefined,
      vehicle_type_ids: vehicle_type_ids && vehicle_type_ids.length > 0 ? vehicle_type_ids : undefined,
    });

    if (error) {
      console.error('Error en getVehiclesNonOperative:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Excepción en getVehiclesNonOperative:', error);
    return [];
  }
}

export async function getVehiclesNotInDailyReport(company_id?: string, vehicle_type_ids?: string[]) {
  const supabase = await supabaseServer();

  try {
    const { data, error } = await supabase.rpc('get_vehicles_not_in_daily_report', {
      p_company_id: company_id || undefined,
      vehicle_type_ids: vehicle_type_ids && vehicle_type_ids.length > 0 ? vehicle_type_ids : undefined,
    });

    if (error) {
      console.error('Error en getVehiclesNotInDailyReport:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Excepción en getVehiclesNotInDailyReport:', error);
    return [];
  }
}

export type VehicleNotInDailyReportType = Awaited<ReturnType<typeof getVehiclesNotInDailyReport>>;

// ============================================
// NUEVAS FUNCIONES PARA CHECKLISTS NORMALIZADOS
// ============================================

/**
 * Obtiene todos los templates de checklists disponibles con conteo de respuestas
 */
export const fetchChecklistTemplates = async () => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  // Obtener templates con conteo de respuestas
  const { data: templates, error: templatesError } = await supabase
    .from('checklist_templates')
    .select(
      `
      *,
      checklist_template_sub_types(
        sub_type_id,
        sub_type:sub_type(id, name)
      )
    `
    )
    .order('name', { ascending: true });

  if (templatesError) {
    console.error('Error fetching checklist templates:', templatesError);
    return [];
  }

  if (!templates || templates.length === 0) return [];

  // Obtener conteo de respuestas para cada template
  const templateIds = templates.map((t) => t.id);
  const { data: answersCount, error: answersError } = await supabase
    .from('checklist_answers')
    .select('template_id')
    .in('template_id', templateIds);

  if (answersError) {
    console.error('Error fetching answers count:', answersError);
  }

  // Contar respuestas por template
  const answersCountMap = new Map<string, number>();
  if (answersCount) {
    answersCount.forEach((answer) => {
      const count = answersCountMap.get(answer.template_id) || 0;
      answersCountMap.set(answer.template_id, count + 1);
    });
  }

  // Agregar conteo a cada template
  return templates.map((template) => ({
    ...template,
    total_responses: answersCountMap.get(template.id) || 0,
  }));
};

/**
 * Obtiene un template de checklist completo con sus secciones e items
 */
export const fetchChecklistTemplateById = async (templateId: string) => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('checklist_templates')
    .select(
      `
      *,
      checklist_template_sub_types(
        sub_type_id,
        sub_type:sub_type(id, name)
      ),
      checklist_template_types(
        type_id,
        type:type(id, name)
      ),
      checklist_template_sections(
        *,
        section:checklist_sections(*),
        checklist_template_items(
          *,
          reusable_item:checklist_items(*)
        )
      )
    `
    )
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching checklist template by ID:', error);
    return null;
  }

  // Deduplicar items en cada sección (por si Supabase retorna duplicados por los JOINs)
  if (data?.checklist_template_sections) {
    data.checklist_template_sections = data.checklist_template_sections.map((section: any) => {
      if (section.checklist_template_items && Array.isArray(section.checklist_template_items)) {
        // Eliminar duplicados por ID
        const uniqueItemsMap = new Map();
        section.checklist_template_items.forEach((item: any) => {
          if (!uniqueItemsMap.has(item.id)) {
            uniqueItemsMap.set(item.id, item);
          }
        });
        section.checklist_template_items = Array.from(uniqueItemsMap.values());

        // Log para debug
        const itemsCount = section.checklist_template_items.length;
        console.log(`[SERVER DEBUG] Sección ${section.code || section.section?.code}: ${itemsCount} items únicos`);
      }
      return section;
    });
  }

  return data;
};

/**
 * Obtiene equipos filtrados optimizados para checklists.
 * Filtra directamente en la base de datos por:
 * - Solo unidades tractoras (is_tractor_unit = true)
 * - Tipos y subtipos permitidos por el checklist (si existen)
 * - Que tengan model y brand (no null)
 */
export const fetchFilteredEquipmentForChecklist = async (templateId: string, company_equipment_id?: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  // if (!company_id && !company_equipment_id) return [];

  // Obtener el template para saber qué tipos/subtipos están permitidos
  const template = await fetchChecklistTemplateById(templateId);
  if (!template) {
    return [];
  }

  // Extraer tipos y subtipos permitidos
  const allowedSubTypes =
    template.checklist_template_sub_types?.filter((st) => st?.sub_type_id).map((st) => st.sub_type_id) || [];
  const allowedTypes = template.checklist_template_types?.filter((t) => t?.type_id).map((t) => t.type_id) || [];

  // Si no hay tipos ni subtipos configurados, retornar todos los equipos activos
  if (allowedTypes.length === 0 && allowedSubTypes.length === 0) {
    const { data, error } = await supabase
      .from('vehicles')
      .select(
        'id, domain, serie, intern_number, kilometer, brand:brand(*), model:model(*), type:type(*), subType:subType(*)'
      )
      .eq('is_active', true)
      .order('domain', { ascending: true })
      .returns<VehicleWithBrand[]>();

    if (error) {
      console.error('Error fetching all equipment:', error);
      return [];
    }

    return data || [];
  }

  // Construir queries separadas para tipos y subtipos
  // Necesitamos hacer un OR entre type y subType, así que haremos dos queries y combinaremos los resultados

  let equipmentByType: VehicleWithBrand[] = [];
  let equipmentBySubType: VehicleWithBrand[] = [];

  // Query 1: Equipos que coinciden en tipo
  if (allowedTypes.length > 0) {
    const { data: typeData, error: typeError } = await supabase
      .from('vehicles')
      .select(
        'id, domain, serie, intern_number, kilometer, brand:brand(*), model:model(*), type:type(*), subType:subType(*)'
      )
      .eq('is_active', true)
      .in('type', allowedTypes)
      .order('domain', { ascending: true })
      .returns<VehicleWithBrand[]>();

    if (typeError) {
      console.error('Error fetching equipment by type:', typeError);
    } else {
      equipmentByType = typeData || [];
    }
  }

  // Query 2: Equipos que coinciden en subtipo
  if (allowedSubTypes.length > 0) {
    const { data: subTypeData, error: subTypeError } = await supabase
      .from('vehicles')
      .select(
        'id, domain, serie, intern_number, kilometer, brand:brand(*), model:model(*), type:type(*), subType:subType(*)'
      )
      .eq('is_active', true)
      .in('subType', allowedSubTypes)
      .order('domain', { ascending: true })
      .returns<VehicleWithBrand[]>();

    if (subTypeError) {
      console.error('Error fetching equipment by subtype:', subTypeError);
    } else {
      equipmentBySubType = subTypeData || [];
    }
  }

  // Combinar resultados y eliminar duplicados (un equipo puede coincidir en tipo y subtipo)
  const allEquipment = [...equipmentByType, ...equipmentBySubType];
  const uniqueEquipment = Array.from(new Map(allEquipment.map((equipment) => [equipment.id, equipment])).values());

  return uniqueEquipment;
};

/**
 * Obtiene un template de checklist por su código
 */
export const fetchChecklistTemplateByCode = async (code: string) => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('checklist_templates')
    .select(
      `
      *,
      checklist_template_sub_types(
        sub_type_id,
        sub_type:sub_type(id, name)
      ),
      checklist_template_sections(
        *,
        section:checklist_sections(*),
        checklist_template_items(
          *,
          reusable_item:checklist_items(*)
        )
      )
    `
    )
    .eq('code', code)
    .single();

  if (error) {
    console.error('Error fetching checklist template by code:', error);
    return null;
  }

  return data;
};

/**
 * Obtiene todas las respuestas de un checklist template
 */
export const fetchChecklistAnswersByTemplateId = async (templateId: string) => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  let query = supabase
    .from('checklist_answers')
    .select(
      `
      *,
      equipment:equipment_id(
        id,
        domain,
        serie,
        intern_number,
        brand:brand_vehicles(name),
        model:model_vehicles(name)
      ),
      user:user_id(
        id,
        fullname
      )
    `
    )
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });

  // Si es invitado, filtrar por equipos compartidos
  if (role === 'Invitado') {
    const { data: share_company_users } = await supabase
      .from('share_company_users')
      .select(`*,customer_id(*,contractor_equipment(*,equipment_id(id)))`)
      .eq('profile_id', user?.id || '')
      .eq('company_id', company_id || '');

    const equipments_id =
      share_company_users?.flatMap((uc: any) => {
        const contractorEquipment = uc.customer_id?.contractor_equipment as any[] | undefined;
        return contractorEquipment?.map((ce: any) => ce.equipment_id?.id).filter((id: any) => id) || [];
      }) || [];

    query = query.in('equipment_id', equipments_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching checklist answers:', error);
    return [];
  }

  return data || [];
};

/**
 * Obtiene una respuesta específica de checklist por su ID
 */
export const fetchChecklistAnswerById = async (answerId: string) => {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('checklist_answers')
    .select(
      `
      *,
      template:template_id(
        *,
        checklist_template_sections(
          *,
          section:checklist_sections(*),
          checklist_template_items(
            *,
            reusable_item:checklist_items(*)
          )
        )
      ),
      equipment:equipment_id(
        id,
        domain,
        serie,
        intern_number,
        kilometer,
        brand:brand_vehicles(name),
        model:model_vehicles(name)
      ),
      user:user_id(
        id,
        fullname
      )
    `
    )
    .eq('id', answerId)
    .single();

  if (error) {
    console.error('Error fetching checklist answer by ID:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Si este checklist es de enganche (tiene ut_checklist_answer_id), el equipment_id es el enganche
  // Si este checklist es del UT, buscar si hay un checklist de enganche que apunte a este
  let hitchEquipmentId: string | null = null;

  const utChecklistAnswerId = (data as any).ut_checklist_answer_id;
  const equipmentId = (data as any).equipment_id;
  const currentAnswerId = (data as any).id;

  if (utChecklistAnswerId) {
    // Este es un checklist de enganche, el equipment_id es el enganche
    hitchEquipmentId = equipmentId;
  } else if (currentAnswerId) {
    // Este es un checklist del UT, buscar si hay un checklist de enganche que apunte a este
    const { data: hitchAnswer } = await supabase
      .from('checklist_answers')
      .select('equipment_id')
      .eq('ut_checklist_answer_id', currentAnswerId)
      .single();

    if (hitchAnswer) {
      hitchEquipmentId = (hitchAnswer as any).equipment_id;
    }
  }

  return {
    ...data,
    hitch_equipment_id: hitchEquipmentId,
  };
};
/**
 * Verifica si un template aplica a un sub_type específico
 * Retorna true si el template no tiene restricciones de sub_type o si el sub_type está en la lista
 */
export const checkTemplateAppliesToSubType = async (templateId: string, subTypeId: string | null) => {
  const supabase = await supabaseServer();

  // Si no hay sub_type, el template aplica a todos
  if (!subTypeId) return true;

  // Verificar si el template tiene restricciones de sub_type
  const { data, error } = await supabase.from('checklist_template_sub_types').select('*').eq('template_id', templateId);

  if (error) {
    console.error('Error checking template sub_types:', error);
    return false;
  }

  // Si no hay restricciones, aplica a todos
  if (!data || data.length === 0) return true;

  // Si hay restricciones, verificar si el sub_type está incluido
  return data.some((item) => item.sub_type_id === subTypeId);
};

/**
 * Obtiene todas las respuestas de checklist para un equipo específico
 */
export async function getChecklistAnswersByEquipment(equipmentId: string) {
  if (!equipmentId) {
    return [];
  }

  const supabase = await supabaseServer();

  const { data: answers, error } = await supabase
    .from('checklist_answers')
    .select(
      `
      id,
      created_at,
      result,
      observations,
      critical_items_failed,
      template_id,
      equipment_id,
      user_id,
      checklist_templates(
        id,
        name,
        description,
        code
      ),
      profile:user_id(
        id,
        fullname,
        email
      ),
      checklist_deviations(
        id,
        item_code,
        item_label,
        section_code,
        created_at
      ),
      ut_checklist_answer:ut_checklist_answer_id(
        id,
        equipment_id,
        equipment:equipment_id(
          id,
          domain,
          serie,
          intern_number
        )
      )
    `
    )
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET] Error fetching checklist answers by equipment:', error);
    return [];
  }

  return answers || [];
}

/**
 * Obtiene los equipos compatibles para enganche según el tipo del equipo UT
 * Esta función obtiene los equipos filtrados por tipo/subtipo compatibles desde type_hitch_types
 */
export const getCompatibleEquipmentForHitch = async (utEquipmentId: string) => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id || !utEquipmentId) {
    return [];
  }

  try {
    // Obtener el equipo UT y su tipo
    const { data: utEquipment, error: utError } = await supabase
      .from('vehicles')
      .select('type:type(id, name, is_tractor_unit, has_hitch), subType:subType(id, name)')
      .eq('id', utEquipmentId)
      .single();

    if (utError || !utEquipment || !utEquipment.type) {
      console.error('Error fetching UT equipment:', utError);
      return [];
    }

    const utType = utEquipment.type as any;

    // Verificar que sea UT y tenga enganche
    if (!utType.is_tractor_unit || !utType.has_hitch) {
      return [];
    }

    // Obtener los tipos compatibles para enganche
    const { data: hitchTypes, error: hitchError } = await supabase
      .from('type_hitch_types')
      .select('compatible_type_id')
      .eq('type_id', utType.id);

    if (hitchError || !hitchTypes || hitchTypes.length === 0) {
      console.error('Error fetching hitch types:', hitchError);
      return [];
    }

    const compatibleTypeIds = hitchTypes.map((ht) => ht.compatible_type_id);

    if (compatibleTypeIds.length === 0) {
      return [];
    }

    // Obtener los subtipos compatibles que pertenecen a esos tipos
    const { data: compatibleSubTypes, error: subTypesError } = await supabase
      .from('sub_type')
      .select('id, name, type')
      .in('type', compatibleTypeIds)
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (subTypesError) {
      console.error('Error fetching compatible sub types:', subTypesError);
    }

    const compatibleSubTypeIds = compatibleSubTypes?.map((st) => st.id) || [];
    const typesWithSubTypes = [...new Set(compatibleSubTypes?.map((st) => st.type) || [])];
    const typesWithoutSubTypes = compatibleTypeIds.filter((id: string) => !typesWithSubTypes.includes(id));

    // Construir la consulta de equipos compatibles
    // Primero obtener todos los equipos que coincidan con tipos/subtipos compatibles
    let compatibleEquipment: any[] = [];

    if (compatibleSubTypeIds.length > 0) {
      // Si hay subtipos compatibles, buscar equipos con esos subtipos
      const { data: subTypeEquipment, error: subTypeError } = await supabase
        .from('vehicles')
        .select(
          'id, domain, serie, intern_number, type:type(id, name), subType:subType(id, name), brand:brand(*), model:model(*)'
        )
        .eq('company_id', company_id)
        .eq('is_active', true)
        .neq('id', utEquipmentId)
        .in('subType', compatibleSubTypeIds)
        .order('domain', { ascending: true });

      if (!subTypeError && subTypeEquipment) {
        compatibleEquipment.push(...subTypeEquipment);
      }
    }

    // Si hay tipos sin subtipos, agregar también equipos de esos tipos
    if (typesWithoutSubTypes.length > 0) {
      const { data: typeEquipment, error: typeError } = await supabase
        .from('vehicles')
        .select(
          'id, domain, serie, intern_number, type:type(id, name), subType:subType(id, name), brand:brand(*), model:model(*)'
        )
        .eq('company_id', company_id)
        .eq('is_active', true)
        .neq('id', utEquipmentId)
        .in('type', typesWithoutSubTypes)
        .is('subType', null) // Solo equipos sin subtipo
        .order('domain', { ascending: true });

      if (!typeError && typeEquipment) {
        // Evitar duplicados
        const existingIds = new Set(compatibleEquipment.map((eq) => eq.id));
        compatibleEquipment.push(...typeEquipment.filter((eq) => !existingIds.has(eq.id)));
      }
    }

    // Si no hay subtipos ni tipos sin subtipos, buscar por tipos compatibles directamente
    if (compatibleSubTypeIds.length === 0 && typesWithoutSubTypes.length === 0) {
      const { data: allTypeEquipment, error: allTypeError } = await supabase
        .from('vehicles')
        .select(
          'id, domain, serie, intern_number, type:type(id, name), subType:subType(id, name), brand:brand(*), model:model(*)'
        )
        .eq('company_id', company_id)
        .eq('is_active', true)
        .neq('id', utEquipmentId)
        .in('type', compatibleTypeIds)
        .order('domain', { ascending: true });

      if (!allTypeError && allTypeEquipment) {
        compatibleEquipment = allTypeEquipment;
      }
    }

    // Obtener los equipos completos con todas las relaciones para mapearlos correctamente
    const equipmentIds =
      compatibleEquipment
        ?.filter((eq) => eq.model && eq.brand)
        .map((eq) => eq.id)
        .filter((id): id is string => id !== null && id !== undefined) || [];

    if (equipmentIds.length === 0) {
      return [];
    }

    // Obtener equipos completos con todas las relaciones necesarias
    const { data: fullEquipment, error: fullError } = await supabase
      .from('vehicles')
      .select(
        'id, domain, serie, intern_number, kilometer, brand:brand(*), model:model(*), type:type(*), subType:subType(*)'
      )
      .in('id', equipmentIds)
      .order('domain', { ascending: true })
      .returns<VehicleWithBrand[]>();

    if (fullError || !fullEquipment) {
      console.error('Error fetching full equipment:', fullError);
      return [];
    }

    // Mapear al formato esperado usando la función helper
    return fullEquipment.map(mapEquipmentToChecklistFormat);
  } catch (error) {
    console.error('Error in getCompatibleEquipmentForHitch:', error);
    return [];
  }
};

/**
 * Encuentra el checklist_answer relacionado del equipo enganchado
 * Basado en: mismo template_id, misma fecha, misma hora, mismo chofer
 * Esto permite relacionar checklists de UT y enganche que fueron guardados juntos
 */
export const findRelatedHitchChecklistAnswer = async (
  utChecklistAnswerId: string,
  hitchEquipmentId: string
): Promise<string | null> => {
  const supabase = await supabaseServer();

  try {
    // Obtener el checklist_answer del UT para obtener template_id, fecha, hora, chofer
    const { data: utAnswer, error: utError } = await supabase
      .from('checklist_answers')
      .select('id, template_id, answer_data, created_at')
      .eq('id', utChecklistAnswerId)
      .single();

    if (utError || !utAnswer) {
      console.error('Error fetching UT checklist answer:', utError);
      return null;
    }

    const answerData = utAnswer.answer_data as any;
    const fecha = answerData?.fecha;
    const hora = answerData?.hora;
    const chofer = answerData?.chofer;

    if (!fecha || !hora || !chofer) {
      console.log('[HITCH] UT checklist answer missing fecha/hora/chofer, cannot find related hitch answer');
      return null;
    }

    // Buscar checklist_answer relacionado en el equipo enganchado
    // Mismo template, misma fecha, misma hora, mismo chofer
    const { data: hitchAnswers, error: hitchError } = await supabase
      .from('checklist_answers')
      .select('id, answer_data')
      .eq('template_id', utAnswer.template_id)
      .eq('equipment_id', hitchEquipmentId)
      .limit(10); // Limitar resultados para mejorar rendimiento

    if (hitchError || !hitchAnswers || hitchAnswers.length === 0) {
      console.log('[HITCH] No hitch checklist answers found for equipment:', hitchEquipmentId);
      return null;
    }

    // Buscar el que coincida en fecha, hora y chofer (dentro de un margen de tiempo razonable)
    const matchingAnswer = hitchAnswers.find((answer) => {
      const hitchAnswerData = answer.answer_data as any;
      const hitchFecha = hitchAnswerData?.fecha;
      const hitchHora = hitchAnswerData?.hora;
      const hitchChofer = hitchAnswerData?.chofer;

      // Comparar fecha exacta y hora (permitir pequeña diferencia de minutos por posibles retrasos)
      const fechaMatch = hitchFecha === fecha;
      const choferMatch = hitchChofer?.toUpperCase() === chofer?.toUpperCase();

      // Comparar hora permitiendo diferencia de hasta 5 minutos
      let horaMatch = false;
      if (hitchHora && hora) {
        try {
          const utTimeParts = hora.split(':');
          const hitchTimeParts = hitchHora.split(':');
          const utMinutes = parseInt(utTimeParts[0]) * 60 + parseInt(utTimeParts[1] || '0');
          const hitchMinutes = parseInt(hitchTimeParts[0]) * 60 + parseInt(hitchTimeParts[1] || '0');
          const diffMinutes = Math.abs(utMinutes - hitchMinutes);
          horaMatch = diffMinutes <= 5; // Permitir hasta 5 minutos de diferencia
        } catch {
          horaMatch = hora === hitchHora; // Fallback a comparación exacta
        }
      }

      return fechaMatch && horaMatch && choferMatch;
    });

    if (matchingAnswer) {
      console.log('[HITCH] Found related hitch checklist answer:', matchingAnswer.id);
      return matchingAnswer.id;
    }

    console.log('[HITCH] No matching hitch checklist answer found');
    return null;
  } catch (error) {
    console.error('Error in findRelatedHitchChecklistAnswer:', error);
    return null;
  }
};

/**
 * Encuentra el equipo enganchado relacionado a partir de un checklist_answer_id del UT
 * Busca otro checklist_answer con el mismo template_id, fecha, hora y chofer pero diferente equipment_id
 */
export const findRelatedHitchEquipmentId = async (
  utChecklistAnswerId: string
): Promise<{ hitchEquipmentId: string; hitchChecklistAnswerId: string } | null> => {
  const supabase = await supabaseServer();

  try {
    // Obtener el checklist_answer del UT
    const { data: utAnswer, error: utError } = await supabase
      .from('checklist_answers')
      .select('id, template_id, equipment_id, answer_data, created_at')
      .eq('id', utChecklistAnswerId)
      .single();

    if (utError || !utAnswer) {
      console.error('[HITCH] Error fetching UT checklist answer:', utError);
      return null;
    }

    const answerData = utAnswer.answer_data as any;
    const fecha = answerData?.fecha;
    const hora = answerData?.hora;
    const chofer = answerData?.chofer;

    if (!fecha || !hora || !chofer) {
      console.log('[HITCH] UT checklist answer missing fecha/hora/chofer, cannot find related hitch equipment');
      return null;
    }

    // Buscar checklists con el mismo template, fecha, hora y chofer pero diferente equipment_id
    // Limitamos a los últimos 10 para mejorar rendimiento (checklists recientes)
    const { data: relatedAnswers, error: relatedError } = await supabase
      .from('checklist_answers')
      .select('id, equipment_id, answer_data')
      .eq('template_id', utAnswer.template_id)
      .neq('equipment_id', utAnswer.equipment_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (relatedError || !relatedAnswers || relatedAnswers.length === 0) {
      console.log('[HITCH] No related checklist answers found');
      return null;
    }

    // Buscar el que coincida en fecha, hora y chofer
    const matchingAnswer = relatedAnswers.find((answer) => {
      const hitchAnswerData = answer.answer_data as any;
      const hitchFecha = hitchAnswerData?.fecha;
      const hitchHora = hitchAnswerData?.hora;
      const hitchChofer = hitchAnswerData?.chofer;

      const fechaMatch = hitchFecha === fecha;
      const choferMatch = hitchChofer?.toUpperCase() === chofer?.toUpperCase();

      // Comparar hora permitiendo diferencia de hasta 5 minutos
      let horaMatch = false;
      if (hitchHora && hora) {
        try {
          const utTimeParts = hora.split(':');
          const hitchTimeParts = hitchHora.split(':');
          const utMinutes = parseInt(utTimeParts[0]) * 60 + parseInt(utTimeParts[1] || '0');
          const hitchMinutes = parseInt(hitchTimeParts[0]) * 60 + parseInt(hitchTimeParts[1] || '0');
          const diffMinutes = Math.abs(utMinutes - hitchMinutes);
          horaMatch = diffMinutes <= 5; // Permitir hasta 5 minutos de diferencia
        } catch {
          horaMatch = hora === hitchHora; // Fallback a comparación exacta
        }
      }

      return fechaMatch && horaMatch && choferMatch;
    });

    if (matchingAnswer) {
      console.log('[HITCH] Found related hitch equipment:', matchingAnswer.equipment_id);
      return {
        hitchEquipmentId: matchingAnswer.equipment_id as string,
        hitchChecklistAnswerId: matchingAnswer.id,
      };
    }

    return null;
  } catch (error) {
    console.error('Error in findRelatedHitchEquipmentId:', error);
    return null;
  }
};

/**
 * Obtiene la información del tipo de un equipo para verificar si tiene enganche
 * Función server-side que puede ser llamada desde el cliente
 */
export const getEquipmentTypeInfo = async (equipmentId: string) => {
  const supabase = await supabaseServer();
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id || !equipmentId) {
    return null;
  }

  try {
    const { data: equipmentData, error } = await supabase
      .from('vehicles')
      .select('type:type(id, name, is_tractor_unit, has_hitch)')
      .eq('id', equipmentId)
      .eq('company_id', company_id)
      .single();

    if (error || !equipmentData?.type) {
      console.error('Error fetching equipment type info:', error);
      return null;
    }

    const equipmentType = equipmentData.type as any;
    return {
      id: equipmentType.id,
      name: equipmentType.name,
      has_hitch: equipmentType.has_hitch || false,
      is_tractor_unit: equipmentType.is_tractor_unit || false,
    };
  } catch (error) {
    console.error('Error in getEquipmentTypeInfo:', error);
    return null;
  }
};
