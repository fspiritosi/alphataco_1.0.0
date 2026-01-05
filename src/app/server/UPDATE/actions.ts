'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Users-related actions

export const CreateNewFormAnswer = async (formId: string, formAnswer: any) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  // if (!company_id) return [];
  const { data, error } = await supabase.from('form_answers').insert({
    form_id: formId,
    answer: formAnswer,
  });
  if (error) {
    console.error(error, 'error');
  }

  return data;
};

/**
 * Crea una nueva respuesta de checklist normalizado
 */
export const CreateChecklistAnswer = async (templateId: string, answerData: any) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const computedResult: 'B' | 'M' =
    hasMValue(sanitizedAnswers) || (answerData.critical_items_failed && answerData.critical_items_failed.length > 0)
      ? 'M'
      : 'B';

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
    answer_data: {
      // Respuestas estructuradas por sección
      answers: sanitizedAnswers,
      // Metadata adicional
      chofer: answerData.chofer,
      fecha: answerData.fecha,
      hora: answerData.hora,
      kilometraje: answerData.kilometraje,
    } as any, // answer_data es Json type, pero TypeScript necesita ayuda con el tipado dinámico
    observations: answerData.observaciones || null,
    result: computedResult,
    critical_items_failed: answerData.critical_items_failed || null,
  };

  const { data, error } = await supabase.from('checklist_answers').insert(answerPayload).select().single();

  if (error) {
    console.error('Error creating checklist answer:', error);
    throw error;
  }

  // Si hay items críticos fallidos, crear registros en checklist_deviations
  if (answerData.critical_items_failed && answerData.critical_items_failed.length > 0 && data) {
    // Obtener employee_id del cookie o metadata
    const employeeId = cookiesStore.get('empleado_id')?.value;
    const employeeIdFromMetadata =
      ((user?.app_metadata as any)?.employee_id as string | undefined) ??
      ((user?.user_metadata as any)?.employee_id as string | undefined);

    const finalEmployeeId = employeeId || employeeIdFromMetadata || null;

    // Crear registros de desvíos para cada item crítico fallido
    const deviationsToInsert = answerData.critical_items_failed.map((item: any) => {
      // Soporta tanto formato antiguo (string) como nuevo (objeto)
      if (typeof item === 'string') {
        // Formato antiguo: solo label, necesitamos buscar el código en el template
        return {
          checklist_answer_id: data.id,
          equipment_id: answerData.equipment_id,
          item_code: item, // Como fallback, usamos el label como código
          item_label: item,
          section_code: null,
          created_by_user_id: user?.id || null,
          created_by_employee_id: finalEmployeeId,
        };
      } else {
        // Formato nuevo: objeto con item_code, item_label, section_code
        return {
          checklist_answer_id: data.id,
          equipment_id: answerData.equipment_id,
          item_code: item.item_code || item.item_label || '',
          item_label: item.item_label || item.item_code || '',
          section_code: item.section_code || null,
          created_by_user_id: user?.id || null,
          created_by_employee_id: finalEmployeeId,
        };
      }
    });

    const { error: deviationsError } = await supabase.from('checklist_deviations').insert(deviationsToInsert);

    if (deviationsError) {
      console.error('Error creating checklist deviations:', deviationsError);
      // No lanzamos error para no fallar el guardado del checklist, solo lo logueamos
    } else {
      console.log(`Created ${deviationsToInsert.length} checklist deviations for answer ${data.id}`);

      // Si hay items críticos fallidos, actualizar la condición del equipo a "no operativo"
      if (answerData.equipment_id) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ condition: 'no operativo' })
          .eq('id', answerData.equipment_id);

        if (updateError) {
          console.error('Error updating equipment condition to "no operativo":', updateError);
          // No lanzamos error para no fallar el guardado del checklist
        } else {
          console.log(`Updated equipment ${answerData.equipment_id} condition to "no operativo"`);
        }
      }
    }
  }

  return data;
};

export const UpdateVehicle = async (vehicleId: string, vehicleData: any) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];
  const { data, error } = await supabase.from('vehicles').update(vehicleData).eq('id', vehicleId);
  if (error) {
    console.error('error', error);
    // throw error;
  }
};

/**
 * Actualiza el kilometraje de un vehículo para usuarios anónimos
 * Usa una función SECURITY DEFINER en la base de datos para bypass RLS
 */
export const UpdateVehicleKilometerAnonymous = async (vehicleId: string, kilometer: string) => {
  const supabase = await supabaseServer();

  // Llamar a una función RPC que permita actualizar el kilometraje sin restricciones RLS
  const { data, error } = await supabase.rpc('update_vehicle_kilometer_anonymous', {
    p_vehicle_id: vehicleId,
    p_kilometer: kilometer,
  });

  if (error) {
    console.error('Error updating vehicle kilometer:', error);
    throw error;
  }

  return data;
};
export const updateModulesSharedUser = async ({ id, modules }: { id: string; modules: ModulosEnum[] }) => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('share_company_users').update({ modules: modules }).eq('id', id).select();

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
};

export const UpdateDiagramsById = async (diagramData: { diagram_type: string; diagramId: string }[]) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const promises = diagramData.map(async ({ diagram_type, diagramId }) => {
    const { data, error } = await supabase.from('employees_diagram').update({ diagram_type }).eq('id', diagramId);
    if (error) {
      console.error('error', error);
    }
    return data;
  });

  const results = await Promise.all(promises);
  return results;
};

export const CreateDiagrams = async (diagramData: EmployeeDiagramInsert[]) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const promises = diagramData.map(async (diagram) => {
    const { data, error } = await supabase.from('employees_diagram').insert(diagram);
    if (error) {
      console.error('error', error);
    }
    return data;
  });

  const results = await Promise.all(promises);

  // revalidatePath('/dashboard/employee');

  return results;
};
