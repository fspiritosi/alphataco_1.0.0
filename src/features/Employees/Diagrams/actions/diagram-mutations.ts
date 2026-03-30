'use server';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Employees/Diagrams');

export const UpdateDiagramsById = async (diagramData: { diagram_type: string; diagramId: string }[]) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const promises = diagramData.map(async ({ diagram_type, diagramId }) => {
    const { data, error } = await supabase.from('employees_diagram').update({ diagram_type }).eq('id', diagramId);
    if (error) {
      logger.error('Error updating diagram', { data: { error } });
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
      logger.error('Error creating diagram', { data: { error } });
    }
    return data;
  });

  const results = await Promise.all(promises);
  return results;
};
