'use server';

// import { TablesInsert, TablesUpdate } from "@/database.types";
import { supabaseServer } from '@/lib/supabase/server';

// Tipos explícitos para el grupo y las relaciones
// export type MaintenanceGroupInsert = TablesInsert<'maintenance_request_groups'>;
export type MaintenanceGroupInsert = Database['public']['Tables']['maintenance_request_groups']['Insert'];
export type MaintenanceGroupUpdate = Database['public']['Tables']['maintenance_request_groups']['Update'];
export type MaintenanceGroupRelationInsert =
  Database['public']['Tables']['maintenance_group_type_of_repairs']['Insert'];

// Crear grupo y relaciones
export const createMaintenanceGroupAction = async (groupData: MaintenanceGroupInsert, typeIds: string[]) => {
  try {
    const supabase = await supabaseServer();
    // Crear grupo
    const { data: group, error: groupError } = await supabase
      .from('maintenance_request_groups')
      .insert([groupData])
      .select()
      .single();
    if (groupError) throw groupError;
    // Crear relaciones
    if (typeIds.length > 0) {
      const relations = typeIds.map((type_id) => ({
        group_id: group.id,
        type_id,
      }));
      const { error: relError } = await supabase.from('maintenance_group_type_of_repairs').insert(relations);
      if (relError) throw relError;
    }
    return { group, error: null };
  } catch (error: any) {
    console.error('Error en createMaintenanceGroupAction:', error);
    return { group: null, error: error.message };
  }
};
export type createMaintenanceGroupActionType = Awaited<ReturnType<typeof createMaintenanceGroupAction>>;

// Actualizar grupo y relaciones
export const updateMaintenanceGroupAction = async (
  groupId: string,
  groupData: MaintenanceGroupUpdate,
  newTypeIds: string[]
) => {
  try {
    const supabase = await supabaseServer();
    // Actualizar grupo
    const { data: updatedGroup, error: groupError } = await supabase
      .from('maintenance_request_groups')
      .update(groupData)
      .eq('id', groupId)
      .select()
      .single();
    if (groupError) throw groupError;
    // Obtener relaciones actuales
    const { data: currentRelations, error: relError } = await supabase
      .from('maintenance_group_type_of_repairs')
      .select('type_id')
      .eq('group_id', groupId);
    if (relError) throw relError;
    const currentTypeIds = currentRelations?.map((r) => r.type_id) || [];
    // Calcular relaciones a agregar y eliminar
    const toAdd = newTypeIds.filter((id) => !currentTypeIds.includes(id));
    const toRemove = currentTypeIds.filter((id) => !newTypeIds.includes(id));
    // Agregar nuevas relaciones
    if (toAdd.length > 0) {
      const addRelations = toAdd.map((type_id) => ({ group_id: groupId, type_id }));
      const { error: addError } = await supabase.from('maintenance_group_type_of_repairs').insert(addRelations);
      if (addError) throw addError;
    }
    // Eliminar relaciones quitadas
    if (toRemove.length > 0) {
      const { error: delError } = await supabase
        .from('maintenance_group_type_of_repairs')
        .delete()
        .eq('group_id', groupId)
        .in('type_id', toRemove);
      if (delError) throw delError;
    }
    return { updatedGroup, error: null };
  } catch (error: any) {
    console.error('Error en updateMaintenanceGroupAction:', error);
    return { updatedGroup: null, error: error.message };
  }
};
export type updateMaintenanceGroupActionType = Awaited<ReturnType<typeof updateMaintenanceGroupAction>>;

// Soft delete de grupo y relaciones
export const deleteMaintenanceGroupAction = async (groupId: string) => {
  try {
    const supabase = await supabaseServer();
    // Marcar grupo como inactivo
    const { data: deletedGroup, error: groupError } = await supabase
      .from('maintenance_request_groups')
      .update({ is_active: false })
      .eq('id', groupId)
      .select()
      .single();
    if (groupError) throw groupError;
    // Opcional: eliminar relaciones
    const { error: relError } = await supabase
      .from('maintenance_group_type_of_repairs')
      .delete()
      .eq('group_id', groupId);
    if (relError) throw relError;
    return { deletedGroup, error: null };
  } catch (error: any) {
    console.error('Error en deleteMaintenanceGroupAction:', error);
    return { deletedGroup: null, error: error.message };
  }
};
export type deleteMaintenanceGroupActionType = Awaited<ReturnType<typeof deleteMaintenanceGroupAction>>;

// Obtener todos los grupos con relaciones
export const fetchMaintenanceGroupsAction = async () => {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from('maintenance_request_groups')
      .select('*, maintenance_group_type_of_repairs(type_id)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { groups: data, error: null };
  } catch (error: any) {
    console.error('Error en fetchMaintenanceGroupsAction:', error);
    return { groups: [], error: error.message };
  }
};
export type fetchMaintenanceGroupsActionType = Awaited<ReturnType<typeof fetchMaintenanceGroupsAction>>;

export const fetchTypesOfRepairAction = async () => {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from('types_of_repairs')
      .select('id,name')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { types: data, error: null };
  } catch (error: any) {
    console.error('Error en fetchTypesOfRepairAction:', error);
    return { types: [], error: error.message };
  }
};
export type fetchTypesOfRepairActionType = Awaited<ReturnType<typeof fetchTypesOfRepairAction>>;

// Obtener grupo por ID con relaciones
export const fetchMaintenanceGroupByIdAction = async (groupId: string) => {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from('maintenance_request_groups')
      .select('*, maintenance_group_type_relations(type_id)')
      .eq('id', groupId)
      .single();
    if (error) throw error;
    return { group: data, error: null };
  } catch (error: any) {
    console.error('Error en fetchMaintenanceGroupByIdAction:', error);
    return { group: null, error: error.message };
  }
};
export type fetchMaintenanceGroupByIdActionType = Awaited<ReturnType<typeof fetchMaintenanceGroupByIdAction>>;
