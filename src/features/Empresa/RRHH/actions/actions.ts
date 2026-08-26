'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { WorkDiagram } from '@/shared/types/legacy';

const logger = new Logger('features/Empresa/RRHH');

export async function createContractType(contractType: { name: string; description: string | null }) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('types_of_contract').insert(contractType).returns<ContractType[]>();

  if (error) {
    logger.error('Error creating contract type', { data: { error } });
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
  const supabase = await supabaseServer();

  const { id, ...rest } = contractType;

  const { data, error } = await supabase
    .from('types_of_contract')
    .update(rest)
    .eq('id', contractType.id)
    .returns<ContractType[]>();

  if (error) {
    logger.error('Error updating contract type', { data: { error } });
    throw new Error('Error updating contract type');
  }
  return data;
}

export async function deleteContractType(contractType: { id: string }) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('types_of_contract')
    .delete()
    .eq('id', contractType.id)
    .returns<ContractType[]>();

  if (error) {
    logger.error('Error deleting contract type', { data: { error } });
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
  const supabase = await supabaseServer();

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
    logger.error('Error creating work diagram', { data: { error: workDiagramError } });
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
      logger.error('Error creating work diagram novelties', { data: { error: noveltiesError } });
      throw new Error('Error creating work diagram novelties');
    }
  }

  // 3. Obtener el work_diagram con sus relaciones
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
    logger.error('Error fetching work diagram with relations', { data: { error: fetchError } });
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
    })
    .eq('id', workDiagram.id)
    .select()
    .single();

  if (updateError) {
    logger.error('Error updating work diagram', { data: { error: updateError } });
    throw new Error('Error updating work diagram');
  }

  // 2. Eliminar las relaciones existentes
  const { error: deleteError } = await supabase
    .from('work_diagram_active_novelties' as any)
    .delete()
    .eq('work_diagram_id', workDiagram.id);

  if (deleteError) {
    logger.error('Error deleting work diagram novelties', { data: { error: deleteError } });
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
      logger.error('Error creating work diagram novelties', { data: { error: insertError } });
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
    logger.error('Error fetching updated work diagram', { data: { error: fetchError } });
    return updatedWorkDiagram;
  }

  return fullWorkDiagram || updatedWorkDiagram;
}

export async function deleteWorkDiagram(workDiagram: { id: string }) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('work_diagram')
    .delete()
    .eq('id', workDiagram.id)
    .returns<WorkDiagram[]>();

  if (error) {
    logger.error('Error deleting work diagram', { data: { error } });
    throw new Error('Error deleting work diagram');
  }
  return data;
}

export async function fetchAllPositions() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.from('company_positions').select('*').order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching positions', { data: { error } });
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
  const supabase = await supabaseServer();

  try {
    // Guarda contra duplicados: repetir el alta del mismo puesto (por doble click o
    // por volver a cargarlo mas tarde) creaba una segunda fila identica (ticket 616).
    const { data: existingPosition } = await supabase
      .from('company_positions')
      .select('id, name')
      .ilike('name', position.name.trim())
      .limit(1);

    if (existingPosition && existingPosition.length > 0) {
      // Se devuelve como dato en vez de lanzarlo: Next reemplaza el mensaje de un
      // Error lanzado en una server action por un texto generico en produccion.
      return { ok: false as const, error: `Ya existe el puesto "${existingPosition[0].name}".` };
    }

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
      logger.error('Error creating position', { data: { error: positionError } });
      return { ok: false as const, error: 'No se pudo crear el puesto. Intente nuevamente.' };
    }

    if (!positionData?.id) {
      logger.error('Position ID not found after creation');
      return { ok: false as const, error: 'No se pudo crear el puesto. Intente nuevamente.' };
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
        logger.error('Error creating aptitudes relations', { data: { error: relationError } });
        return { ok: false as const, error: 'El puesto se creó, pero no se pudieron asignar las aptitudes técnicas.' };
      }
    }

    return { ok: true as const, data: positionData };
  } catch (error) {
    logger.error('Error in createPosition', { data: { error } });
    return { ok: false as const, error: 'No se pudo crear el puesto. Intente nuevamente.' };
  }
}

export async function updatePosition(position: {
  id: string;
  name: string;
  is_active: boolean;
  hierarchical_position_id: string[];
  aptitudes_tecnicas_id: string[];
}) {
  const supabase = await supabaseServer();

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
      logger.error('Error updating position', { data: { error: positionError } });
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
        logger.error('Error deleting aptitudes relations', { data: { error: deleteError } });
        throw new Error('Error deleting aptitudes relations');
      }

      // Luego creamos las nuevas relaciones
      const aptitudesRelations = position.aptitudes_tecnicas_id.map((aptitudeId) => ({
        puesto_id: position.id,
        aptitud_id: aptitudeId,
      }));

      const { error: insertError } = await supabase.from('aptitudes_tecnicas_puestos').insert(aptitudesRelations);

      if (insertError) {
        logger.error('Error creating new aptitudes relations', { data: { error: insertError } });
        throw new Error('Error creating new aptitudes relations');
      }
    }

    return position;
  } catch (error) {
    logger.error('Error in updatePosition', { data: { error } });
    throw error;
  }
}

export async function fetchAllHierarchicalPositions() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('hierarchy')
    .select('*')
    .order('name', { ascending: true })
    .returns<any[]>();

  if (error) {
    logger.error('Error fetching hierarchical positions', { data: { error } });
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
    logger.error('Error fetching aptitudes tecnicas', { data: { error } });
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
    logger.error('Error fetching position aptitudes', { data: { error } });
    return [];
  }
  return data?.map((item: any) => item.aptitudes_tecnicas) || [];
}
