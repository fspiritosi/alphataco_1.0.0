'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('features/Equipos/EquipoID/checklist-queries');

/**
 * Obtiene todas las respuestas de checklist para un equipo específico
 */
export async function getChecklistAnswersByEquipment(equipmentId: string) {
  if (!equipmentId) {
    return [];
  }

  const supabase = await supabaseServer();

  const { data: answers, error } = await supabase
    .from('checklist_answers')
    .select(
      `
      id,
      created_at,
      result,
      observations,
      critical_items_failed,
      template_id,
      equipment_id,
      user_id,
      checklist_templates(
        id,
        name,
        description,
        code
      ),
      profile:user_id(
        id,
        fullname,
        email
      ),
      checklist_deviations(
        id,
        item_code,
        item_label,
        section_code,
        created_at
      ),
      ut_checklist_answer:ut_checklist_answer_id(
        id,
        equipment_id,
        equipment:equipment_id(
          id,
          domain,
          serie,
          intern_number
        )
      )
    `
    )
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[GET] Error fetching checklist answers by equipment', { data: { error, equipmentId } });
    return [];
  }

  return answers || [];
}
