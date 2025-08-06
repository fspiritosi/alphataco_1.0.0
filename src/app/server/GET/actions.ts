'use server';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { getActualRole } from '@/lib/utils';
import moment from 'moment';
import { cookies } from 'next/headers';
// Employee-related actions

export const setNewCompanyUserMetadata = async (company_id: string) => {
  const supabase = adminSupabaseServer();
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
  const supabase = supabaseServer();
  const cookiesStore = cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return;

  const { error } = await supabase.from('document_types').update(data).eq('id', id);

  if (error) {
    return error;
  }

  return null;
};

export const fetchallResources = async (applies: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const user = await fetchCurrentUser();
  if (!company_id) return [];

  supabase.auth.admin.updateUserById(user?.id || '', {
    app_metadata: {
      company: company_id,
    },
  });

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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('company').select('*').eq('id', company_id);

  if (error) {
    console.error('Error fetching company:', error);
    return [];
  }
  return data || [];
};
export const findEmployeeByFullName = async (fullName: string) => {
  try {
    const cookiesStore = cookies();
    const company_id = cookiesStore.get('actualComp')?.value;

    const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();

  const { data, error } = await supabase.from('repair_solicitudes').select('*');

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data;
};
export const fetchEmployeeMonthlyDocuments = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('documents_employees')
      .select('*,id_document_types(*),applies(*,contractor_employee(*, customers(*)))')
      .eq('applies', employeeId)
      .eq('id_document_types.is_it_montlhy', true)
      .eq('id_document_types.private', false)
      .not('id_document_types', 'is', null)
      .returns<EmployeeDocumentWithContractors[]>();

    if (error) {
      console.error('Error fetching employee monthly documents:', error);
      return [];
    }
    return data;
  } else {
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
  }
};
export const fetchEmployeePermanentDocumentsByEmployeeId = async (employeeId: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('documents_employees')
      .select('*,id_document_types(*),applies(*,contractor_employee(*, customers(*)))')
      .eq('applies', employeeId)
      .eq('id_document_types.is_it_montlhy', false)
      .eq('id_document_types.private', false)
      .not('id_document_types', 'is', null)
      .returns<EmployeeDocumentWithContractors[]>();

    if (error) {
      console.error('Error fetching employee permanent documents:', error);
      return [];
    }
    return data;
  } else {
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
  }
};
export const fetchEmployeePermanentDocuments = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
    // .eq('applies.is_active', true)
    .not('id_document_types.is_it_montlhy', 'is', true)
    .or(`validity.lte.${today.toISOString()},validity.lte.${nextMonth.toISOString()}`)
    .not('validity', 'is', null)
    .eq('applies.company_id', company_id || user?.app_metadata?.company_id || '')
    .order('validity', { ascending: true }) // Ordenar por fecha de validez en orden ascendente
    .returns<EmployeeDocumentWithContractors[]>();

  if (error) {
    console.error('Error fetching next month expiring documents:', error);
    return [];
  }
  return data;
};
export const getNextMonthExpiringDocumentsVehicles = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
    .eq('applies.company_id', company_id || user?.app_metadata?.company_id || '')
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
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('type').select('*');

  if (error) {
    console.error('Error fetching vehicle types:', error);
    return [];
  }
  return data;
};
export const fetchCompanyPositions = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('company_positions').select('*');

  if (error) {
    console.error('Error fetching company positions:', error);
    return [];
  }
  return data;
};
export const fetchProvinces = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('provinces').select('*');

  if (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
  return data;
};
export const fetchHierrarchicalPositions = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('hierarchy').select('*');

  if (error) {
    console.error('Error fetching hierarchical positions:', error);
    return [];
  }
  return data;
};

export const fetchAllCategories = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('category').select('*');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data;
};

export const fetchCovenants = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('covenant').select('*');

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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('work_diagram').select('*');

  if (error) {
    console.error('Error fetching work diagrams:', error);
    return [];
  }
  return data;
};

export const fetchCustomers = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  const { data, error } = await supabase.from('customers').select('*');

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data;
};

export const fetchTypesOfVehicles = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('types_of_vehicles').select('*');

  if (error) {
    console.error('Error fetching types of vehicles:', error);
    return [];
  }
  return data;
};
export const fetchVehicleModels = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('model_vehicles').select('*');

  if (error) {
    console.error('Error fetching vehicle models:', error);
    return [];
  }
  return data;
};
// Equipment-related actions
export const fetchVehicleBrands = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('brand_vehicles').select('*');

  if (error) {
    console.error('Error fetching vehicle brands:', error);
    return [];
  }
  return data;
};

export const fetchAllEquipmentWithBrand = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  let { data: equipments, error } = await supabase
    .from('vehicles')
    .select(`id, domain, serie, intern_number`)
    .eq('company_id', company_id);

  if (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
  return equipments || [];
};

export const fetchAllEquipment = async (company_equipment_id?: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id && !company_equipment_id) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getActualRole(company_id as string, user?.id as string);

  if (role === 'Invitado') {
    const { data, error } = await supabase
      .from('share_company_users')
      .select(`*,customer_id(*,contractor_equipment(*,equipment_id(*,brand(*),model(*),type(*),types_of_vehicles(*))))`)
      .eq('profile_id', user?.id || '')
      .eq('company_id', (company_id ?? company_equipment_id) || '')
      .returns<ShareCompanyUsersWithEquipment[]>();

    const equipments = data?.[0].customer_id?.contractor_equipment;
    const allEquipments = equipments?.map((equipment) => equipment.equipment_id);
    return allEquipments || [];
  }

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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
export const fetchPermanentDocumentsEquipment = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data: vehicleData, error } = await supabase
    .from('vehicles')
    .select('*, brand_vehicles(name), model_vehicles(name),types_of_vehicles(name),type(name)')
    .eq('id', id);

  if (error) console.log('eroor', error);

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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
  const cookiesStore = cookies();
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
  const supabase = supabaseServer();
  const cookiesStore = cookies();
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
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};
export const fetchCustomForms = async (id_company?: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('custom_form').select('*').eq('id', formId);

  if (error) {
    console.error('Error fetching custom form by ID:', error);
    return [];
  }
  return data;
};
export const fetchFormsAnswersByFormId = async (formId: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
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
  const supabase = supabaseServer();
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
export const verifyUserRoleInCompany = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return '';

  const user = await fetchCurrentUser();
  const { data, error } = await supabase
    .from('share_company_users')
    .select('*')
    .eq('profile_id', user?.id || '')
    .eq('company_id', company_id);

  if (error) {
    console.error('Error verifying user role:', error);
    return '';
  }

  return { rol: data[0]?.role || '', modulos: data[0]?.modules || [] };
};

export const fetchDiagramsHistoryByEmployeeId = async (employeeId: string) => {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('diagrams_logs')
    .select('*,modified_by(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .returns<diagrams_logsWithUser[]>();

  if (error) {
    console.error('Error fetching diagrams history:', error);
    return [];
  }
  return data;
};
export const fetchDiagrams = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
  const cookiesStore = cookies();
  const supabase = supabaseServer();
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
    const supabase = supabaseServer();
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
  const supabase = supabaseServer();

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
    const supabase = supabaseServer();
    const cookiesStore = cookies();
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
    const supabase = supabaseServer();
    const cookiesStore = cookies();
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
    const supabase = supabaseServer();
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
  const supabase = supabaseServer();

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
  const supabase = supabaseServer();
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
  const { count, error } = await supabaseServer()
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
  const { data, error } = await supabaseServer()
    .from('dailyreport')
    .select('id')
    .eq('date', new Date().toISOString().split('T')[0]);

  if (data?.length !== 0) {
    const { data: dailyreportrow, error } = await supabaseServer()
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
    const { count, error } = await supabaseServer()
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
    const { data, error: dataError } = await supabaseServer()
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

export async function getVehiclesDisponibleFilterType(type_row_id?: string[]) {
  // const type1 = '5dc2bc44-de86-4e1d-ae0c-87eafd60dccf';
  // const type2 = 'ea07ff34-13fb-4483-b5bc-8389e41c7d89';
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc('get_vehicle_usage_indicator', {
    p_vehicle_type_ids: type_row_id || [],
  });

  if (error) console.error(error);
  else return data;
}

export async function getEmployeeIndicator(p_row_id?: string[], save_to_table?: boolean) {
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc('get_employee_usage_indicator', {
    position_uuids: p_row_id,
    save_to_table: save_to_table || false,
  });
  if (error) console.error(error);
  else return data;
}

export async function getDiagramIndicator(p_company_position_ids?: string[]) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc('get_employee_diagram_count_by_day', {
    p_day: new Date().getDate(),
    p_month: new Date().getMonth() + 1,
    p_year: new Date().getFullYear(),
    p_company_position_ids: p_company_position_ids || undefined,
  });
  if (error) console.error(error);
  else return data;
}
