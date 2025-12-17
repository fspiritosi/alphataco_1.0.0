'use server';

import { supabaseServer } from '@/lib/supabase/server';

export async function assignEquipmentsToCustomer(customerId: string, equipmentIds: string[]) {
  const supabase = await supabaseServer();

  try {
    // Verificar que el cliente existe
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar que los equipos existen
    if (equipmentIds.length > 0) {
      const { data: equipments, error: equipmentsError } = await supabase
        .from('vehicles')
        .select('id')
        .in('id', equipmentIds);

      if (equipmentsError) {
        console.error('Error al verificar equipos:', equipmentsError);
        throw equipmentsError;
      }

      if (equipments.length !== equipmentIds.length) {
        throw new Error('Uno o más equipos no existen');
      }
    }

    // Obtener asignaciones actuales
    const { data: currentAssignments, error: fetchError } = await supabase
      .from('contractor_equipment')
      .select('equipment_id')
      .eq('contractor_id', customerId);

    if (fetchError) {
      console.error('Error al obtener asignaciones existentes:', fetchError);
      throw fetchError;
    }

    // Filtrar valores nulos y asegurar que sean strings
    const currentEquipmentIds = new Set(
      (currentAssignments || []).map((a) => a.equipment_id).filter((id): id is string => id !== null)
    );

    // Asegurarse de que todos los IDs sean strings válidos
    const validEquipmentIds = equipmentIds.map((id) => id?.toString()).filter((id): id is string => Boolean(id));

    const newEquipmentIds = new Set(validEquipmentIds);

    // Identificar equipos para eliminar (están en current pero no en new)
    const toDelete = Array.from(currentEquipmentIds).filter((id) => !newEquipmentIds.has(id));

    // Identificar equipos para agregar (están en new pero no en current)
    const toAdd = Array.from(newEquipmentIds).filter((id) => !currentEquipmentIds.has(id));

    // Iniciar transacción
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('contractor_equipment')
        .delete()
        .eq('contractor_id', customerId)
        .in('equipment_id', toDelete);

      if (deleteError) {
        console.error('Error al eliminar asignaciones de equipos:', deleteError);
        throw deleteError;
      }
    }

    // Insertar solo las nuevas asignaciones que no existen
    if (toAdd.length > 0) {
      // Primero verificamos qué asignaciones ya existen para evitar duplicados
      const { data: existingAssignments, error: fetchError } = await supabase
        .from('contractor_equipment')
        .select('equipment_id')
        .eq('contractor_id', customerId)
        .in('equipment_id', toAdd);

      if (fetchError) {
        console.error('Error al verificar asignaciones existentes:', fetchError);
        throw fetchError;
      }

      const existingEquipmentIds = new Set((existingAssignments || []).map((a) => a.equipment_id));

      // Filtrar para insertar solo los que no existen
      const newAssignments = toAdd
        .filter((id) => !existingEquipmentIds.has(id))
        .map((equipmentId) => ({
          contractor_id: customerId,
          equipment_id: equipmentId,
        }));

      if (newAssignments.length > 0) {
        const { error: insertError } = await supabase.from('contractor_equipment').insert(newAssignments);

        if (insertError) {
          console.error('Error al insertar asignaciones de equipos:', insertError);
          throw insertError;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error en assignEquipmentsToCustomer:', error);
    throw error;
  }
}

export async function assignEmployeesToCustomer(customerId: string, employeeIds: string[]) {
  const supabase = await supabaseServer();

  try {
    // Verificar que el cliente existe
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar que los empleados existen
    if (employeeIds.length > 0) {
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .in('id', employeeIds);

      if (employeesError) {
        console.error('Error al verificar empleados:', employeesError);
        throw employeesError;
      }

      if (employees.length !== employeeIds.length) {
        throw new Error('Uno o más empleados no existen');
      }
    }

    // Obtener asignaciones actuales
    const { data: currentAssignments, error: fetchError } = await supabase
      .from('contractor_employee')
      .select('employee_id')
      .eq('contractor_id', customerId);

    if (fetchError) {
      console.error('Error al obtener asignaciones existentes:', fetchError);
      throw fetchError;
    }

    const currentEmployeeIds = new Set(currentAssignments?.map((a) => a.employee_id) || []);
    const newEmployeeIds = new Set(employeeIds);

    // Identificar asignaciones a eliminar (están en current pero no en new)
    const assignmentsToDelete = Array.from(currentEmployeeIds).filter((id) => !newEmployeeIds.has(id as any));

    // Identificar asignaciones a agregar (están en new pero no en current)
    const assignmentsToAdd = Array.from(newEmployeeIds).filter((id) => !currentEmployeeIds.has(id));

    // Eliminar asignaciones que ya no son necesarias
    if (assignmentsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('contractor_employee')
        .delete()
        .eq('contractor_id', customerId)
        .in('employee_id', assignmentsToDelete);

      if (deleteError) {
        console.error('Error al eliminar asignaciones:', deleteError);
        throw deleteError;
      }
    }

    // Agregar nuevas asignaciones
    if (assignmentsToAdd.length > 0) {
      const newAssignments = assignmentsToAdd.map((employeeId) => ({
        contractor_id: customerId,
        employee_id: employeeId,

        // No incluimos equipment_id ya que es opcional y tiene una restricción de clave foránea
      }));

      const { error: insertError } = await supabase.from('contractor_employee').insert(newAssignments).select();

      if (insertError) {
        console.error('Error al insertar asignaciones:', insertError);
        throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error en assignEmployeesToCustomer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
