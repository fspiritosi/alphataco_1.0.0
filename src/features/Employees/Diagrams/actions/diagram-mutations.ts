'use server';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Employees/Diagrams');

/**
 * Novedad a insertar. El comentario es opcional y se guarda por dia:
 * una carga sobre un rango replica el mismo texto en cada dia, salvo los
 * dias que el usuario haya personalizado.
 */
type DiagramInsert = EmployeeDiagramInsert & { comments?: string | null };

export const UpdateDiagramsById = async (
  diagramData: { diagram_type: string; diagramId: string; comments?: string | null }[]
) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const promises = diagramData.map(async ({ diagram_type, diagramId, comments }) => {
    // `comments` solo se pisa cuando viene definido, para no borrar el comentario
    // existente al actualizar un dia sin tocar ese campo.
    const payload: { diagram_type: string; comments?: string | null } = { diagram_type };
    if (comments !== undefined) payload.comments = comments;

    const { data, error } = await supabase.from('employees_diagram').update(payload).eq('id', diagramId);
    if (error) {
      logger.error('Error updating diagram', { data: { error } });
    }
    return data;
  });

  const results = await Promise.all(promises);
  return results;
};

export const CreateDiagrams = async (diagramData: DiagramInsert[]) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const promises = diagramData.map(async (diagram) => {
    const { data, error } = await supabase.from('employees_diagram').insert(diagram);
    if (error) {
      logger.error('Error creating diagram', { data: { error } });
    }
    return data;
  });

  const results = await Promise.all(promises);
  return results;
};
