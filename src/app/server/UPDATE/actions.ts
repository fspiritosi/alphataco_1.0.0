'use server';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Re-exportar CreateChecklistAnswer desde la feature Checklist
// para mantener compatibilidad con imports existentes
// export { CreateChecklistAnswer } from '@/features/Checklist/actions/actionsServer';

const serverLogger = new Logger('UPDATE/actions');

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
    serverLogger.error('Error creating form answer', { data: { error } });
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
    serverLogger.error('Error updating vehicle', { data: { error } });
    // throw error;
  }
};

/**
 * Actualiza el kilometraje de un vehículo para usuarios anónimos
 * Usa una función SECURITY DEFINER en la base de datos para bypass RLS
 *
 * @deprecated Esta función ya no se usa en el nuevo flujo de mantenimiento.
 * El kilometraje ahora se actualiza cuando se aprueba la entrada a taller.
 */
export const UpdateVehicleKilometerAnonymous = async (vehicleId: string, kilometer: string) => {
  const supabase = await supabaseServer();

  // Llamar a una función RPC que permita actualizar el kilometraje sin restricciones RLS
  const { data, error } = await supabase.rpc('update_vehicle_kilometer_anonymous', {
    p_vehicle_id: vehicleId,
    p_kilometer: kilometer,
  });

  if (error) {
    serverLogger.error('Error updating vehicle kilometer', { data: { error } });
    throw error;
  }

  return data;
};
export const updateModulesSharedUser = async ({ id, modules }: { id: string; modules: ModulosEnum[] }) => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('share_company_users').update({ modules: modules }).eq('id', id).select();

  if (error) {
    serverLogger.error('Error updating shared user modules', { data: { error } });
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
      serverLogger.error('Error updating diagram', { data: { error } });
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
      serverLogger.error('Error creating diagram', { data: { error } });
    }
    return data;
  });

  const results = await Promise.all(promises);

  // revalidatePath('/dashboard/employee');

  return results;
};
