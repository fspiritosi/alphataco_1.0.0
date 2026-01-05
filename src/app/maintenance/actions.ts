'use server';

import { adminSupabaseServer, supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

function normalizeCuil(input: string) {
  return (input ?? '').replace(/[-\s]/g, '');
}

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

/**
 * Busca equipos (vehículos) por dominio o serie.
 * Pública (sin autenticación) para permitir selección antes del login.
 */
export async function searchEquipmentByDomain(domainOrSerie: string): Promise<
  | Ok<{
      equipment: Array<{
        id: string;
        domain: string | null;
        serie: string | null;
        intern_number: string | null;
        label: string;
      }>;
    }>
  | Err
> {
  if (!domainOrSerie || domainOrSerie.trim().length < 2) {
    return { ok: false, error: 'Debe ingresar al menos 2 caracteres para buscar.' };
  }

  const searchTerm = domainOrSerie.trim().toUpperCase();
  const admin = await adminSupabaseServer();

  // Buscar por dominio o serie (case-insensitive, ilike)
  const { data, error } = await admin
    .from('vehicles')
    .select('id, domain, serie, intern_number')
    .or(`domain.ilike.%${searchTerm}%,serie.ilike.%${searchTerm}%`)
    .limit(10)
    .order('domain', { ascending: true, nullsFirst: false });

  if (error) {
    return { ok: false, error: `Error al buscar equipos: ${error.message}` };
  }

  const equipment =
    data?.map((v) => ({
      id: v.id,
      domain: v.domain,
      serie: v.serie,
      intern_number: v.intern_number,
      label: `${v.domain ?? v.serie ?? 'Sin dominio/serie'}${v.intern_number ? ` (Nº ${v.intern_number})` : ''}`,
    })) ?? [];

  return { ok: true, equipment };
}

export async function getCompanyIdForEquipment(equipmentId: string): Promise<Ok<{ companyId: string }> | Err> {
  if (!equipmentId) return { ok: false, error: 'No se ha seleccionado un equipo.' };

  const admin = await adminSupabaseServer();
  const { data, error } = await admin.from('vehicles').select('company_id').eq('id', equipmentId).single();

  if (error || !data?.company_id) {
    return { ok: false, error: 'No se pudo obtener la empresa del equipo seleccionado.' };
  }

  return { ok: true, companyId: data.company_id as string };
}

export async function completeMaintenanceEmployeeAnonymousSession(params: {
  cuil: string;
  equipmentId: string;
}): Promise<
  | Ok<{
      companyId: string;
      employeeId: string;
      employeeName: string;
      employeeEmail: string | null;
    }>
  | Err
> {
  const { cuil, equipmentId } = params;

  if (!cuil) return { ok: false, error: 'El CUIL es requerido.' };
  if (!equipmentId) return { ok: false, error: 'No se ha seleccionado un equipo.' };

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return { ok: false, error: 'No hay sesión activa. Reintenta iniciar sesión.' };
  }

  const admin = await adminSupabaseServer();

  // 1) Resolver company_id del equipo (para setear app_metadata.company y validar consistencia)
  const { data: vehicle, error: vehicleError } = await admin
    .from('vehicles')
    .select('id, company_id')
    .eq('id', equipmentId)
    .single();

  if (vehicleError || !vehicle?.company_id) {
    return { ok: false, error: 'Equipo no encontrado o sin empresa asignada.' };
  }

  const companyId = vehicle.company_id as string;

  // 2) Buscar empleado por CUIL (usando service role para evitar depender de RLS durante el login)
  const normalized = normalizeCuil(cuil);

  const selectEmployee = async (value: string) => {
    const { data, error } = await admin
      .from('employees')
      .select('id, firstname, lastname, email, phone, cuil, company_id, is_active')
      .eq('cuil', value)
      .limit(1);
    return { data: data?.[0], error };
  };

  let { data: employee, error: employeeError } = await selectEmployee(normalized);
  if (!employee && normalized !== cuil) {
    ({ data: employee, error: employeeError } = await selectEmployee(cuil));
  }

  if (employeeError) {
    return { ok: false, error: 'Error consultando empleado.' };
  }

  if (!employee?.id) {
    return { ok: false, error: 'Empleado no encontrado.' };
  }

  if (employee.company_id && employee.company_id !== companyId) {
    return { ok: false, error: 'El empleado no pertenece a la empresa del equipo.' };
  }

  if (employee.is_active === false) {
    return { ok: false, error: 'El empleado no se encuentra activo.' };
  }

  const employeeId = employee.id as string;
  const employeeEmail = (employee.email as string | null) ?? null;
  const employeePhone = (employee.phone as string | null) ?? null;
  const employeeName = `${employee.firstname ?? ''} ${employee.lastname ?? ''}`.trim();

  // 3) Asegurar profile (necesario para FKs como repair_solicitudes.user_id -> profile.id)
  // Evitar choque por UNIQUE(email): si el email ya pertenece a otro profile, lo omitimos en profile y lo dejamos en user_metadata.
  let emailForProfile: string | null = employeeEmail;
  if (emailForProfile) {
    const { data: existingEmail } = await admin.from('profile').select('id').eq('email', emailForProfile).limit(1);
    if (existingEmail?.[0]?.id && existingEmail[0].id !== user.id) {
      emailForProfile = null;
    }
  }

  const { error: profileUpsertError } = await admin.from('profile').upsert(
    [
      {
        id: user.id,
        credential_id: user.id,
        email: emailForProfile,
        fullname: employeeName,
        role: 'Usuario',
      },
    ],
    { onConflict: 'id' }
  );

  if (profileUpsertError) {
    return { ok: false, error: `No se pudo crear/actualizar el perfil: ${profileUpsertError.message}` };
  }

  // 4) Completar metadata de Auth para sesiones/RLS y UI (nombre/email/etc)
  const nextAppMetadata = {
    ...(user.app_metadata ?? {}),
    company: companyId,
    employee_id: employeeId,
    maintenance_login: true,
  } as Record<string, unknown>;

  const nextUserMetadata = {
    ...(user.user_metadata ?? {}),
    login_type: 'empleado',
    employee_id: employeeId,
    cuil: normalized,
    fullname: employeeName,
    email: employeeEmail,
    phone: employeePhone,
  } as Record<string, unknown>;

  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: nextAppMetadata,
    user_metadata: nextUserMetadata,
  });

  if (metadataError) {
    return { ok: false, error: `No se pudo completar la sesión del empleado: ${metadataError.message}` };
  }

  return { ok: true, companyId, employeeId, employeeName, employeeEmail };
}

/**
 * Verifica si una cadena es un UUID válido
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Obtiene el company_id del empleado usando su employee_id o CUIL.
 */
async function getEmployeeCompanyId(employeeId?: string, cuil?: string): Promise<string | null> {
  if (!employeeId && !cuil) return null;

  const admin = await adminSupabaseServer();

  // Prioridad 1: Si tenemos employee_id y es un UUID válido, usarlo directamente
  if (employeeId && isValidUUID(employeeId)) {
    const { data: employee, error } = await admin
      .from('employees')
      .select('company_id')
      .eq('id', employeeId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[MAINTENANCE] Error fetching employee company_id by ID:', error);
    } else if (employee?.company_id) {
      return employee.company_id as string | null;
    }
  }

  // Prioridad 2: Si employee_id no es un UUID (probablemente es un CUIL), o si tenemos CUIL explícito, buscar por CUIL
  const cuilToSearch = employeeId && !isValidUUID(employeeId) ? employeeId : cuil;

  if (cuilToSearch) {
    const normalized = normalizeCuil(cuilToSearch);

    // Buscar empleado por CUIL normalizado
    const { data: employee, error } = await admin
      .from('employees')
      .select('company_id')
      .eq('cuil', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[MAINTENANCE] Error fetching employee company_id by CUIL:', error);
    } else if (employee?.company_id) {
      return employee.company_id as string | null;
    }

    // Si falla con CUIL normalizado, intentar sin normalizar
    if (normalized !== cuilToSearch) {
      const { data: employeeAlt, error: errorAlt } = await admin
        .from('employees')
        .select('company_id')
        .eq('cuil', cuilToSearch)
        .eq('is_active', true)
        .maybeSingle();

      if (errorAlt) {
        console.error('[MAINTENANCE] Error fetching employee company_id by CUIL (alt):', errorAlt);
      } else if (employeeAlt?.company_id) {
        return employeeAlt.company_id as string | null;
      }
    }
  }

  return null;
}

/**
 * Obtiene los checklists (custom_form y checklist_templates) para el contexto de mantenimiento.
 * Usa el company_id del empleado (obtenido por employee_id o CUIL) en lugar del company_id del equipo.
 * Usa adminSupabaseServer para evitar problemas de RLS con usuarios anónimos.
 * @param employeeId ID del empleado (opcional)
 * @param cuil CUIL del empleado (opcional)
 * @param equipmentTypeId ID del tipo de vehículo del equipo (opcional, para filtrar)
 * @param equipmentSubTypeId ID del subtipo de vehículo del equipo (opcional, para filtrar)
 */
export async function fetchMaintenanceChecklists(
  employeeId?: string,
  cuil?: string,
  equipmentTypeId?: string,
  equipmentSubTypeId?: string
) {
  if (!employeeId && !cuil) {
    console.error('[MAINTENANCE] No se proporcionó employee_id ni CUIL');
    return [];
  }

  // Obtener company_id del empleado usando employee_id o CUIL
  const employeeCompanyId = await getEmployeeCompanyId(employeeId, cuil);

  if (!employeeCompanyId) {
    console.error('[MAINTENANCE] No se pudo obtener company_id del empleado. employeeId:', employeeId, 'cuil:', cuil);
    return [];
  }

  const admin = await adminSupabaseServer();

  // Buscar en custom_form (estructura antigua)
  const { data: oldChecklists, error: oldError } = await admin
    .from('custom_form')
    .select('id, name, form, created_at')
    // .eq('company_id', employeeCompanyId)
    .order('created_at', { ascending: false });

  if (oldError) {
    console.error('[MAINTENANCE] Error fetching old checklists:', oldError);
  }

  // Buscar en checklist_templates (estructura nueva normalizada)
  // Incluir relación con checklist_template_sub_types y checklist_template_types para filtrar
  let newChecklistsQuery = admin
    .from('checklist_templates')
    .select(
      'id, name, description, code, created_at, is_active, checklist_template_sub_types(sub_type_id), checklist_template_types(type_id)'
    )
    // .eq('company_id', employeeCompanyId)
    .eq('is_active', true);

  const { data: newChecklists, error: newError } = await newChecklistsQuery.order('created_at', { ascending: false });

  if (newError) {
    console.error('[MAINTENANCE] Error fetching new checklists:', newError);
  }

  // Filtrar checklists por subtipo O tipo del vehículo
  // Un checklist aplica si:
  // 1. No tiene subtipos ni tipos específicos (arrays vacíos, null, o undefined) -> aplica a todos
  // 2. Tiene subtipos específicos y el subtipo del equipo está incluido, O
  // 3. Tiene tipos específicos y el tipo del equipo está incluido
  let filteredNewChecklists = (newChecklists || []).filter((checklist: any) => {
    // Manejar diferentes formas en que Supabase puede devolver relaciones vacías
    const subTypes = checklist.checklist_template_sub_types;
    const types = checklist.checklist_template_types;

    // Filtrar subTypes y types válidos (que tengan id no nulo)
    const validSubTypes = subTypes && Array.isArray(subTypes) ? subTypes.filter((st: any) => st && st.sub_type_id) : [];
    const validTypes = types && Array.isArray(types) ? types.filter((t: any) => t && t.type_id) : [];

    // Si no tiene subtipos ni tipos específicos válidos, aplica a todos
    if (validSubTypes.length === 0 && validTypes.length === 0) {
      return true;
    }

    // Verificar si coincide en subtipo
    const matchesSubType =
      equipmentSubTypeId && validSubTypes.length > 0
        ? validSubTypes.some((st: any) => st.sub_type_id === equipmentSubTypeId)
        : false;

    // Verificar si coincide en tipo
    const matchesType =
      equipmentTypeId && validTypes.length > 0 ? validTypes.some((t: any) => t.type_id === equipmentTypeId) : false;

    // El checklist aplica si coincide en subtipo O en tipo
    return matchesSubType || matchesType;
  });

  // Mapear nuevos checklists al formato esperado (similar a custom_form)
  const mappedNewChecklists = filteredNewChecklists.map((checklist: any) => ({
    id: checklist.id,
    name: checklist.name,
    form: {
      title: checklist.name,
      description: checklist.description || '',
      vehicle_type: ['all'], // Por defecto, permitir todos los tipos de vehículos
    },
    created_at: checklist.created_at,
  }));

  // Combinar ambos tipos de checklists
  const allChecklists = [...(oldChecklists || []), ...mappedNewChecklists];

  return allChecklists;
}

/**
 * Obtiene los desvíos pendientes (sin resolver) para un equipo
 * Solo retorna los desvíos que NO tienen solicitudes de reparación asociadas
 */
export async function getPendingDeviations(equipmentId: string) {
  if (!equipmentId) {
    return [];
  }

  const supabase = await supabaseServer();

  // Primero obtener todos los desvíos del equipo
  const { data: allDeviations, error: deviationsError } = await supabase
    .from('checklist_deviations')
    .select(
      `
      id,
      item_code,
      item_label,
      section_code,
      created_at,
      checklist_answer_id,
      created_by_user_id,
      created_by_employee_id,
      checklist_answers!inner(
        id,
        created_at,
        template_id,
        checklist_templates(
          id,
          name
        )
      ),
      profile:created_by_user_id(
        id,
        fullname,
        email
      ),
      employees:created_by_employee_id(
        id,
        firstname,
        lastname,
        cuil
      )
    `
    )
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (deviationsError) {
    console.error('[MAINTENANCE] Error fetching deviations:', deviationsError);
    return [];
  }

  if (!allDeviations || allDeviations.length === 0) {
    return [];
  }

  // Obtener los IDs de los desvíos que tienen solicitudes asociadas
  const deviationIds = allDeviations.map((d) => d.id);
  const { data: resolvedDeviations, error: resolvedError } = await supabase
    .from('checklist_answer_repairs')
    .select('item_code, checklist_answer_id')
    .in(
      'checklist_answer_id',
      allDeviations.map((d) => d.checklist_answer_id)
    );

  if (resolvedError) {
    console.error('[MAINTENANCE] Error fetching resolved deviations:', resolvedError);
    // Si hay error, retornar todos los desvíos como pendientes
    return allDeviations;
  }

  // Crear un set de los item_codes que están resueltos para cada checklist_answer_id
  const resolvedMap = new Map<string, Set<string>>();
  if (resolvedDeviations) {
    resolvedDeviations.forEach((resolved) => {
      const key = resolved.checklist_answer_id;
      if (!resolvedMap.has(key)) {
        resolvedMap.set(key, new Set());
      }
      resolvedMap.get(key)!.add(resolved.item_code);
    });
  }

  // Filtrar los desvíos: solo incluir aquellos que NO tienen una solicitud asociada
  const pendingDeviations = allDeviations.filter((deviation) => {
    const resolvedSet = resolvedMap.get(deviation.checklist_answer_id);
    // Si no hay ningún desvío resuelto para este checklist_answer_id, el desvío está pendiente
    if (!resolvedSet || resolvedSet.size === 0) {
      return true;
    }
    // Si el item_code de este desvío NO está en los resueltos, está pendiente
    return !resolvedSet.has(deviation.item_code);
  });

  return pendingDeviations;
}

/**
 * Crea solicitudes de reparación desde desvíos de checklist
 * @param equipmentId ID del equipo
 * @param repairRequests Array de objetos con repair_type_id, selected_deviations, description, images
 * @returns Resultado de la operación
 */
export async function createRepairRequestsFromDeviations(
  equipmentId: string,
  repairRequests: Array<{
    repair_type_id: string;
    selected_deviations: string[]; // IDs de los desvíos
    description?: string;
    images?: (string | null)[];
    kilometer?: string;
  }>
): Promise<Ok<{ success: true; repairRequestIds: string[] }> | Err> {
  if (!equipmentId || !repairRequests || repairRequests.length === 0) {
    return { ok: false, error: 'Datos inválidos para crear solicitudes de reparación' };
  }

  const supabase = await supabaseServer();
  const cookiesStore = await cookies();

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener employee_id
  const employeeId = cookiesStore.get('empleado_id')?.value;
  const employeeIdFromMetadata =
    ((user?.app_metadata as any)?.employee_id as string | undefined) ??
    ((user?.user_metadata as any)?.employee_id as string | undefined);
  const finalEmployeeId = employeeId || employeeIdFromMetadata || null;

  // Obtener kilometraje del equipo si no se proporciona
  let equipmentKilometer: string | undefined;
  if (!repairRequests[0]?.kilometer) {
    const { data: equipment } = await supabase.from('vehicles').select('kilometer').eq('id', equipmentId).single();
    equipmentKilometer = equipment?.kilometer || undefined;
  }

  try {
    // 1. Obtener todos los desvíos que se van a asociar
    const allDeviationIds = repairRequests.flatMap((req) => req.selected_deviations);
    const { data: deviations, error: deviationsError } = await supabase
      .from('checklist_deviations')
      .select('id, checklist_answer_id, item_code, equipment_id')
      .in('id', allDeviationIds)
      .eq('equipment_id', equipmentId);

    if (deviationsError || !deviations) {
      return { ok: false, error: 'Error al obtener los desvíos' };
    }

    // Validar que todos los desvíos pertenezcan al mismo equipo
    const allSameEquipment = deviations.every((d) => d.equipment_id === equipmentId);
    if (!allSameEquipment) {
      return { ok: false, error: 'Los desvíos deben pertenecer al mismo equipo' };
    }

    // 2. Crear las solicitudes de reparación
    const repairSolicitudesToInsert = repairRequests.map((req) => ({
      reparation_type: req.repair_type_id,
      equipment_id: equipmentId,
      user_description: req.description || null,
      user_id: user?.id || null,
      user_images: req.images || null,
      state: 'Pendiente' as const,
      employee_id: finalEmployeeId,
      kilometer: req.kilometer || equipmentKilometer || null,
    }));

    const { data: createdRepairs, error: createRepairsError } = await supabase
      .from('repair_solicitudes')
      .insert(
        repairSolicitudesToInsert.map((r) => ({
          ...r,
          user_images: r.user_images?.filter((img): img is string => img !== null) || null,
        }))
      )
      .select('id');

    if (createRepairsError || !createdRepairs) {
      console.error('[MAINTENANCE] Error creating repair requests:', createRepairsError);
      return { ok: false, error: 'Error al crear las solicitudes de reparación' };
    }

    // 3. Crear registros en checklist_answer_repairs y eliminar desvíos
    const answerRepairsToInsert: Array<{
      checklist_answer_id: string;
      repair_solicitud_id: string;
      item_code: string;
    }> = [];

    for (let i = 0; i < repairRequests.length; i++) {
      const repairRequest = repairRequests[i];
      const repairId = createdRepairs[i]?.id;
      if (!repairId) continue;

      for (const deviationId of repairRequest.selected_deviations) {
        const deviation = deviations.find((d) => d.id === deviationId);
        if (deviation) {
          answerRepairsToInsert.push({
            checklist_answer_id: deviation.checklist_answer_id,
            repair_solicitud_id: repairId,
            item_code: deviation.item_code,
          });
        }
      }
    }

    // Insertar registros en checklist_answer_repairs
    if (answerRepairsToInsert.length > 0) {
      const { error: answerRepairsError } = await supabase
        .from('checklist_answer_repairs')
        .insert(answerRepairsToInsert);

      if (answerRepairsError) {
        console.error('[MAINTENANCE] Error creating checklist_answer_repairs:', answerRepairsError);
        // No fallar completamente, pero loguear el error
      }
    }

    // 4. Actualizar la condición del equipo a "no operativo" cuando se generan solicitudes de reparación
    // por items críticos fallidos (no eliminamos los desvíos, solo los marcamos como asociados a solicitudes)
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ condition: 'no operativo' })
      .eq('id', equipmentId);

    if (updateError) {
      console.error('[MAINTENANCE] Error updating equipment condition to "no operativo":', updateError);
      // No fallar completamente, pero loguear el error
    } else {
      console.log(`[MAINTENANCE] Updated equipment ${equipmentId} condition to "no operativo"`);
    }

    return {
      ok: true,
      success: true,
      repairRequestIds: createdRepairs.map((r) => r.id),
    };
  } catch (error) {
    console.error('[MAINTENANCE] Unexpected error in createRepairRequestsFromDeviations:', error);
    return { ok: false, error: 'Error inesperado al procesar las solicitudes' };
  }
}
