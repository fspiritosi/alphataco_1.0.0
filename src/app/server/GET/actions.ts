'use server';
import { Logger } from '@/lib/logger';
import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { getActualRole, mapEquipmentToChecklistFormat } from '@/lib/utils';
import { cookies } from 'next/headers';

const actionsLogger = new Logger('GET/actions');
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

  // Empresa u otros tipos no tienen recursos individuales
  return [];
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

// Company-related actions
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
export const getDocumentCompanyById = async (id: string) => {
  const supabase = await supabaseServer();
  const { data: documents_company } = await supabase
    .from('documents_company')
    .select(
      `
      *,
      document_types(*),
      company(*,province_id(name))
      `
    )
    .eq('id', id);
  return documents_company;
};

// Equipment-related actions
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
    .select(
      `id,condition,picture,year,company_id, domain, serie, intern_number,kilometer, engine_hours, types_of_vehicles(name)`
    )
    .eq('company_id', company_id);

  if (error) {
    actionsLogger.error('Error fetching equipment', { data: { error } });
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
// Miscellaneous actions
export const fetchCurrentUser = async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
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

// ============================================
// NUEVAS FUNCIONES PARA CHECKLISTS NORMALIZADOS
// ============================================

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
