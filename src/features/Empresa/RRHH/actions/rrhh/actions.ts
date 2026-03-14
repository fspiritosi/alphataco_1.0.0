'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('features/Empresa/RRHH');

export async function fetchAllWorkDiagrams() {
  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase
      .from('work_diagram')
      .select(
        `
        *,
        work_diagram_active_novelties(
          id,
          created_at,
          diagram_type:diagram_type_id(*)
        ),
        inactive_novelty:diagram_type!work-diagram_inactive_novelty_fkey(*)
      `
      )
      .order('name', { ascending: true })
      .returns<WorkDiagramWithRelations[]>();

    if (error) {
      logger.error('Error fetching work diagrams', { data: { error } });
      return [];
    }
    return data || [];
  } catch (error) {
    logger.error('Error fetching work diagrams', { data: { error } });
    return [];
  }
}
