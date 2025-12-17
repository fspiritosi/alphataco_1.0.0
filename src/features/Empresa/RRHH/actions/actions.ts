'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { WorkDiagram } from '@/types/types';
// import { AptitudTecnica } from '../types/aptitudesTecnicas';
import { cookies } from 'next/headers';

export async function createContractType(contractType: { name: string; description: string | null }) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase.from('types_of_contract').insert(contractType).returns<ContractType[]>();

  if (error) {
    console.error('Error creating contract type:', error);
    throw new Error('Error creating contract type');
  }
  return data;
}

export async function updateContractType(contractType: {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { id, ...rest } = contractType;

  const { data, error } = await supabase
    .from('types_of_contract')
    .update(rest)
    .eq('id', contractType.id)
    .returns<ContractType[]>();

  if (error) {
    console.error('Error updating contract type:', error);
    throw new Error('Error updating contract type');
  }
  return data;
}

export async function deleteContractType(contractType: { id: string }) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('types_of_contract')
    .delete()
    .eq('id', contractType.id)
    .returns<ContractType[]>();

  if (error) {
    console.error('Error deleting contract type:', error);
    throw new Error('Error deleting contract type');
  }
  return data;
}

export async function createWorkDiagram(workDiagram: {
  name: string;
  is_active: boolean;
  active_working_days: number;
  inactive_working_days: number;
  active_novelty: string[]; // Cambiado a array de strings
  inactive_novelty: string;
}) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  // 1. Crear el work_diagram
  const { data: workDiagramData, error: workDiagramError } = await supabase
    .from('work_diagram')
    .insert({
      name: workDiagram.name,
      is_active: workDiagram.is_active,
      active_working_days: workDiagram.active_working_days,
      inactive_working_days: workDiagram.inactive_working_days,
      inactive_novelty: workDiagram.inactive_novelty,
    })
    .select()
    .single();

  if (workDiagramError) {
    console.error('Error creating work diagram:', workDiagramError);
    throw new Error('Error creating work diagram');
  }

  // 2. Si hay active_novelty, insertar en work_diagram_active_novelties
  if (workDiagram.active_novelty && workDiagram.active_novelty.length > 0) {
    const { error: noveltiesError } = await supabase.from('work_diagram_active_novelties' as any).insert(
      workDiagram.active_novelty.map((diagramTypeId) => ({
        work_diagram_id: workDiagramData.id,
        diagram_type_id: diagramTypeId,
      }))
    );

    if (noveltiesError) {
      console.error('Error creating work diagram novelties:', noveltiesError);
      // Opcional: Podrías querer eliminar el work_diagram creado si falla esto
      throw new Error('Error creating work diagram novelties');
    }
  }

  // 3. Obtener el work_diagram con sus relaciones si es necesario
  const { data: fullWorkDiagram, error: fetchError } = await supabase
    .from('work_diagram')
    .select(
      `
      *,
      work_diagram_active_novelties (
        id,
        diagram_type_id,
        created_at
      )
    `
    )
    .eq('id', workDiagramData.id)
    .single();

  if (fetchError) {
    console.error('Error fetching work diagram with relations:', fetchError);
    // Aún así retornamos el work_diagram aunque falle cargar las relaciones
    return workDiagramData;
  }

  return fullWorkDiagram || workDiagramData;
}

export async function updateWorkDiagram(workDiagram: {
  id: string;
  name: string;
  is_active: boolean;
  active_working_days: number;
  inactive_working_days: number;
  active_novelty: string[]; // Array de diagram_type_id
  inactive_novelty: string;
}) {
  const supabase = await supabaseServer();

  // 1. Actualizar el work_diagram
  const { data: updatedWorkDiagram, error: updateError } = await supabase
    .from('work_diagram')
    .update({
      name: workDiagram.name,
      is_active: workDiagram.is_active,
      active_working_days: workDiagram.active_working_days,
      inactive_working_days: workDiagram.inactive_working_days,
      inactive_novelty: workDiagram.inactive_novelty,
      // updated_at: new Date().toISOString()
    })
    .eq('id', workDiagram.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating work diagram:', updateError);
    throw new Error('Error updating work diagram');
  }

  // 2. Eliminar las relaciones existentes
  const { error: deleteError } = await supabase
    .from('work_diagram_active_novelties' as any)
    .delete()
    .eq('work_diagram_id', workDiagram.id);

  if (deleteError) {
    console.error('Error deleting work diagram novelties:', deleteError);
    throw new Error('Error updating work diagram novelties');
  }

  // 3. Insertar las nuevas relaciones si hay active_novelty
  if (workDiagram.active_novelty && workDiagram.active_novelty.length > 0) {
    const { error: insertError } = await supabase.from('work_diagram_active_novelties' as any).insert(
      workDiagram.active_novelty.map((diagramTypeId) => ({
        work_diagram_id: workDiagram.id,
        diagram_type_id: diagramTypeId,
      }))
    );

    if (insertError) {
      console.error('Error creating work diagram novelties:', insertError);
      throw new Error('Error creating work diagram novelties');
    }
  }

  // 4. Obtener el work_diagram actualizado con sus relaciones
  const { data: fullWorkDiagram, error: fetchError } = await supabase
    .from('work_diagram')
    .select(
      `
      *,
      work_diagram_active_novelties (
        id,
        diagram_type_id,
        created_at
      )
    `
    )
    .eq('id', workDiagram.id)
    .single();

  if (fetchError) {
    console.error('Error fetching updated work diagram:', fetchError);
    return updatedWorkDiagram;
  }

  return fullWorkDiagram || updatedWorkDiagram;
}

export async function deleteWorkDiagram(workDiagram: { id: string }) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('work_diagram')
    .delete()
    .eq('id', workDiagram.id)
    .returns<WorkDiagram[]>();

  if (error) {
    console.error('Error deleting work diagram:', error);
    throw new Error('Error deleting work diagram');
  }
  return data;
}

export async function fetchAllPositions() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('company_positions').select('*').order('name', { ascending: true });

  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
  return data;
}

export async function createPosition(position: {
  name: string;
  is_active: boolean;
  hierarchical_position_id: string[];
  aptitudes_tecnicas_id: string[];
}) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  try {
    // Primero creamos el puesto
    const { data: positionData, error: positionError } = await supabase
      .from('company_positions')
      .insert({
        name: position.name,
        is_active: position.is_active,
        hierarchical_position_id: position.hierarchical_position_id,
      })
      .select()
      .single();

    if (positionError) {
      console.error('Error creating position:', positionError);
      throw new Error('Error creating position');
    }

    if (!positionData?.id) {
      console.error('Position ID not found after creation');
      throw new Error('Position ID not found');
    }

    // Luego creamos las relaciones con las aptitudes técnicas
    if (position.aptitudes_tecnicas_id.length > 0) {
      const aptitudesRelations = position.aptitudes_tecnicas_id.map((aptitudeId) => ({
        position_id: positionData.id,
        aptitude_tecnica_id: aptitudeId,
      }));

      const { error: relationError } = await supabase
        .from('aptitudes_tecnicas_puestos' as any)
        .insert(aptitudesRelations);

      if (relationError) {
        console.error('Error creating aptitudes relations:', relationError);
        throw new Error('Error creating aptitudes relations');
      }
    }

    return positionData;
  } catch (error) {
    console.error('Error in createPosition:', error);
    throw error;
  }
}

export async function updatePosition(position: {
  id: string;
  name: string;
  is_active: boolean;
  hierarchical_position_id: string[];
  aptitudes_tecnicas_id: string[];
}) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  try {
    // Primero actualizamos el puesto
    const { error: positionError } = await supabase
      .from('company_positions')
      .update({
        name: position.name,
        is_active: position.is_active,
        hierarchical_position_id: position.hierarchical_position_id,
      })
      .eq('id', position.id);

    if (positionError) {
      console.error('Error updating position:', positionError);
      throw new Error('Error updating position');
    }

    // Luego actualizamos las relaciones con las aptitudes técnicas
    if (position.aptitudes_tecnicas_id.length > 0) {
      // Primero eliminamos las relaciones existentes
      const { error: deleteError } = await supabase
        .from('aptitudes_tecnicas_puestos')
        .delete()
        .eq('puesto_id', position.id);

      if (deleteError) {
        console.error('Error deleting aptitudes relations:', deleteError);
        throw new Error('Error deleting aptitudes relations');
      }

      // Luego creamos las nuevas relaciones
      const aptitudesRelations = position.aptitudes_tecnicas_id.map((aptitudeId) => ({
        puesto_id: position.id,
        aptitud_id: aptitudeId,
      }));

      const { error: insertError } = await supabase.from('aptitudes_tecnicas_puestos').insert(aptitudesRelations);

      if (insertError) {
        console.error('Error creating new aptitudes relations:', insertError);
        throw new Error('Error creating new aptitudes relations');
      }
    }

    return position;
  } catch (error) {
    console.error('Error in updatePosition:', error);
    throw error;
  }
}

export async function fetchAllHierarchicalPositions() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('hierarchy')
    .select('*')
    .order('name', { ascending: true })
    .returns<any[]>();

  if (error) {
    console.error('Error fetching hierarchical positions:', error);
    return [];
  }
  return data;
}

export async function fetchAllAptitudesTecnicas() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('aptitudes_tecnicas')
    .select('*,aptitudes_tecnicas_puestos(puesto_id)')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error fetching aptitudes tecnicas:', error);
    return [];
  }
  return data;
}

export async function fetchPositionAptitudes(positionId: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('aptitudes_tecnicas_puestos')
    .select('aptitudes_tecnicas:aptitud_id(*)')
    .eq('puesto_id', positionId);

  if (error) {
    console.error('Error fetching position aptitudes:', error);
    return [];
  }
  return data?.map((item: any) => item.aptitudes_tecnicas) || [];
}
