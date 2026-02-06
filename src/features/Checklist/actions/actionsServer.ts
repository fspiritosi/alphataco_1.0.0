'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const serverLogger = new Logger('Checklist/actions');

/**
 * Crea una nueva respuesta de checklist normalizado
 *
 * NUEVO FLUJO:
 * - Ya NO actualiza vehicles.condition a 'no operativo' directamente
 * - Ya NO actualiza vehicles.kilometer directamente
 * - En su lugar, crea una maintenance_request que debe ser aprobada
 * - El kilometraje y condición se actualizan cuando se aprueba la entrada a taller
 */
export const CreateChecklistAnswer = async (templateId: string, answerData: any) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  serverLogger.info('Creando respuesta de checklist', {
    data: { templateId, equipmentId: answerData.equipment_id },
  });

  // checklist_answers.result tiene un CHECK constraint: solo permite 'B' o 'M'.
  // Calculamos el resultado global a partir de las respuestas (si existe algún 'M' => 'M', sino 'B').
  const hasMValue = (value: unknown): boolean => {
    if (value === 'M' || value === 'Malo') return true;
    if (Array.isArray(value)) return value.some(hasMValue);
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasMValue);
    return false;
  };

  // Sanitiza valores no serializables / sentinelas (ej: "$undefined" en payloads)
  const sanitize = (value: unknown): unknown => {
    if (value === '$undefined') return null;
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v)] as const);
      return Object.fromEntries(entries);
    }
    return value;
  };

  const sanitizedAnswers = sanitize(answerData.answers || {});
  // Soportar tanto el nuevo formato (failed_items) como el antiguo (critical_items_failed)
  const failedItems = answerData.failed_items || answerData.critical_items_failed || [];
  const computedResult: 'B' | 'M' = hasMValue(sanitizedAnswers) || failedItems.length > 0 ? 'M' : 'B';

  // Obtener employee_id del cookie o metadata si no viene en answerData
  const employeeId = answerData.employee_id || cookiesStore.get('empleado_id')?.value;
  const employeeIdFromMetadata =
    ((user?.app_metadata as any)?.employee_id as string | undefined) ??
    ((user?.user_metadata as any)?.employee_id as string | undefined);
  const finalEmployeeId = employeeId || employeeIdFromMetadata || null;

  // Preparar los datos de la respuesta según la estructura de la tabla
  const answerPayload = {
    template_id: templateId,
    equipment_id: answerData.equipment_id,
    employee_id: finalEmployeeId,
    user_id: user?.id || null,
    ut_checklist_answer_id: answerData.ut_checklist_answer_id || null, // ID del checklist UT si este es de enganche
    answer_data: {
      // Respuestas estructuradas por sección
      answers: sanitizedAnswers,
      // Metadata adicional
      customer_id: answerData.customer_id || null,
      chofer: answerData.chofer,
      fecha: answerData.fecha,
      hora: answerData.hora,
      kilometraje: answerData.kilometraje,
    } as any, // answer_data es Json type, pero TypeScript necesita ayuda con el tipado dinámico
    observations: answerData.observaciones || null,
    result: computedResult,
    // Guardar los items fallidos (nuevo formato incluye is_critical)
    critical_items_failed: failedItems.length > 0 ? failedItems : null,
  };

  const { data, error } = await supabase.from('checklist_answers').insert(answerPayload).select().single();

  if (error) {
    serverLogger.error('Error creating checklist answer', { data: { error } });
    throw error;
  }

  serverLogger.info('Checklist answer creado', { data: { answerId: data.id, result: computedResult } });

  // TODO: Descomentar este bloque cuando se reactive el flujo de desvíos de mantenimiento
  // ========================================================================================
  // // Si hay items fallidos, crear registros en checklist_deviations
  // // IMPORTANTE: NO crear desvíos si este checklist es de enganche (ut_checklist_answer_id existe)
  // // Los desvíos solo se crean en la unidad tractora
  // // NUEVO FLUJO: Ahora se detectan TODOS los items con valor "M", no solo los críticos
  // if (failedItems.length > 0 && data && !answerData.ut_checklist_answer_id) {
  //   // Crear registros de desvíos para cada item fallido (crítico o no)
  //   const deviationsToInsert = failedItems.map((item: any) => {
  //     // Soporta tanto formato antiguo (string) como nuevo (objeto)
  //     if (typeof item === 'string') {
  //       // Formato antiguo: solo label, necesitamos buscar el código en el template
  //       return {
  //         checklist_answer_id: data.id,
  //         equipment_id: answerData.equipment_id,
  //         item_code: item, // Como fallback, usamos el label como código
  //         item_label: item,
  //         section_code: null,
  //         is_critical: false, // Formato antiguo no tiene esta info
  //         driver_comment: null,
  //         created_by_user_id: user?.id || null,
  //         created_by_employee_id: finalEmployeeId,
  //       };
  //     } else {
  //       // Formato nuevo: objeto con item_code, item_label, section_code, is_critical, driver_comment
  //       return {
  //         checklist_answer_id: data.id,
  //         equipment_id: answerData.equipment_id,
  //         item_code: item.item_code || item.item_label || '',
  //         item_label: item.item_label || item.item_code || '',
  //         section_code: item.section_code || null,
  //         is_critical: item.is_critical || false,
  //         driver_comment: item.driver_comment || null,
  //         created_by_user_id: user?.id || null,
  //         created_by_employee_id: finalEmployeeId,
  //       };
  //     }
  //   });

  //   const { data: deviationsData, error: deviationsError } = await supabase
  //     .from('checklist_deviations')
  //     .insert(deviationsToInsert)
  //     .select();

  //   if (deviationsError) {
  //     serverLogger.error('Error creating checklist deviations', { data: { error: deviationsError } });
  //     // No lanzamos error para no fallar el guardado del checklist, solo lo logueamos
  //   } else {
  //     serverLogger.info(`Created ${deviationsToInsert.length} checklist deviations`, {
  //       data: { answerId: data.id, count: deviationsToInsert.length },
  //     });

  //     // Los desvíos quedan registrados sin solicitud de mantenimiento.
  //     // El usuario debe crear la solicitud desde el modal que aparece al finalizar
  //     // o desde la tabla de "Equipos con Desvíos" en el módulo de Mantenimiento.
  //   }
  // }
  // ========================================================================================

  return data;
};

export type ChecklistAnswerData = Awaited<ReturnType<typeof CreateChecklistAnswer>>;

/**
 * Obtiene la lista de clientes activos para el checklist
 */
export async function fetchActiveCustomersForChecklist() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('id, name')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    serverLogger.error('Error fetching customers for checklist', { data: { error } });
    return [];
  }

  return data || [];
}

export type CustomerForChecklist = Awaited<ReturnType<typeof fetchActiveCustomersForChecklist>>[number];

/**
 * Obtiene la lista de empleados activos para el checklist (para el campo Chofer)
 */
export async function fetchActiveEmployeesForChecklist() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) return [];

  const { data, error } = await supabase
    .from('employees')
    .select('id, firstname, lastname, cuil')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .order('lastname', { ascending: true });

  if (error) {
    serverLogger.error('Error fetching employees for checklist', { data: { error } });
    return [];
  }

  // Formatear el nombre completo
  return (data || []).map((emp) => ({
    id: emp.id,
    fullName: `${emp.lastname || ''} ${emp.firstname || ''}`.trim(),
    document: emp.cuil || null,
  }));
}

export type EmployeeForChecklist = Awaited<ReturnType<typeof fetchActiveEmployeesForChecklist>>[number];

/**
 * Obtiene la lista de supervisores de turno (usuarios con rol "Administrador Operaciones")
 * Estos son los usuarios que el chofer puede seleccionar al registrar desvíos
 * Filtra por la compañía actual usando share_company_users
 */
export async function fetchSupervisorsForChecklist() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    serverLogger.warn('No company_id found in cookies for fetchSupervisorsForChecklist');
    return [];
  }

  // El rol "Administrador Operaciones" tiene id = 20
  const ADMIN_OPERACIONES_ROLE_ID = 20;

  // Paso 1: Obtener los user_ids que tienen el rol de Administrador Operaciones
  const { data: userRolesData, error: userRolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role_id', ADMIN_OPERACIONES_ROLE_ID);

  if (userRolesError) {
    serverLogger.error('Error fetching user_roles for supervisors', { data: { error: userRolesError } });
    return [];
  }

  if (!userRolesData || userRolesData.length === 0) {
    serverLogger.warn('No hay usuarios con rol Administrador Operaciones');
    return [];
  }

  const userIds = userRolesData.map((ur) => ur.user_id);

  // Paso 2: Filtrar por usuarios que pertenecen a la compañía actual
  // share_company_users tiene profile_id (= user_id) y company_id
  const { data: companyUsersData, error: companyUsersError } = await supabase
    .from('share_company_users')
    .select('profile_id')
    .eq('company_id', company_id)
    .in('profile_id', userIds);

  if (companyUsersError) {
    serverLogger.error('Error fetching company users for supervisors', { data: { error: companyUsersError } });
    return [];
  }

  if (!companyUsersData || companyUsersData.length === 0) {
    serverLogger.warn('No hay supervisores en la compañía actual', { data: { company_id } });
    return [];
  }

  const filteredUserIds = companyUsersData.map((cu) => cu.profile_id);

  // Paso 3: Obtener los datos de profile para los user_ids filtrados
  const { data: profilesData, error: profilesError } = await supabase
    .from('profile')
    .select('id, fullname, email')
    .in('id', filteredUserIds);

  if (profilesError) {
    serverLogger.error('Error fetching profiles for supervisors', { data: { error: profilesError } });
    return [];
  }

  if (!profilesData || profilesData.length === 0) {
    serverLogger.warn('No se encontraron perfiles para los supervisores');
    return [];
  }

  // Formatear los resultados
  return profilesData.map((profile) => ({
    id: profile.id,
    fullName: profile.fullname || profile.email || 'Sin nombre',
    email: profile.email,
  }));
}

export type SupervisorForChecklist = Awaited<ReturnType<typeof fetchSupervisorsForChecklist>>[number];
