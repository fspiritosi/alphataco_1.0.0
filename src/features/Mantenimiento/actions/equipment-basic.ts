'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('features/Mantenimiento/equipment-basic');

export const fetchAllEquipmentBasicData = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  let { data: equipments, error } = await supabase
    .from('vehicles')
    .select(
      `id,condition,picture,year,company_id, domain, serie, intern_number,kilometer, engine_hours, types_of_vehicles(name)`
    )
    .eq('company_id', company_id);

  if (error) {
    logger.error('Error fetching equipment', { data: { error } });
    return [];
  }
  return equipments || [];
};

/**
 * Encuentra el equipo enganchado relacionado a partir de un checklist_answer_id del UT
 * Busca otro checklist_answer con el mismo template_id, fecha, hora y chofer pero diferente equipment_id
 */
export const findRelatedHitchEquipmentId = async (
  utChecklistAnswerId: string
): Promise<{ hitchEquipmentId: string; hitchChecklistAnswerId: string } | null> => {
  const supabase = await supabaseServer();

  try {
    // Obtener el checklist_answer del UT
    const { data: utAnswer, error: utError } = await supabase
      .from('checklist_answers')
      .select('id, template_id, equipment_id, answer_data, created_at')
      .eq('id', utChecklistAnswerId)
      .single();

    if (utError || !utAnswer) {
      logger.error('[HITCH] Error fetching UT checklist answer', { data: { utError } });
      return null;
    }

    const answerData = utAnswer.answer_data as { fecha?: string; hora?: string; chofer?: string };
    const fecha = answerData?.fecha;
    const hora = answerData?.hora;
    const chofer = answerData?.chofer;

    if (!fecha || !hora || !chofer) {
      logger.info('[HITCH] UT checklist answer missing fecha/hora/chofer, cannot find related hitch equipment');
      return null;
    }

    // Buscar checklists con el mismo template, fecha, hora y chofer pero diferente equipment_id
    // Limitamos a los últimos 10 para mejorar rendimiento (checklists recientes)
    const { data: relatedAnswers, error: relatedError } = await supabase
      .from('checklist_answers')
      .select('id, equipment_id, answer_data')
      .eq('template_id', utAnswer.template_id)
      .neq('equipment_id', utAnswer.equipment_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (relatedError || !relatedAnswers || relatedAnswers.length === 0) {
      logger.info('[HITCH] No related checklist answers found');
      return null;
    }

    // Buscar el que coincida en fecha, hora y chofer
    const matchingAnswer = relatedAnswers.find((answer) => {
      const hitchAnswerData = answer.answer_data as { fecha?: string; hora?: string; chofer?: string };
      const hitchFecha = hitchAnswerData?.fecha;
      const hitchHora = hitchAnswerData?.hora;
      const hitchChofer = hitchAnswerData?.chofer;

      const fechaMatch = hitchFecha === fecha;
      const choferMatch = hitchChofer?.toUpperCase() === chofer?.toUpperCase();

      // Comparar hora permitiendo diferencia de hasta 5 minutos
      let horaMatch = false;
      if (hitchHora && hora) {
        try {
          const utTimeParts = hora.split(':');
          const hitchTimeParts = hitchHora.split(':');
          const utMinutes = parseInt(utTimeParts[0]) * 60 + parseInt(utTimeParts[1] || '0');
          const hitchMinutes = parseInt(hitchTimeParts[0]) * 60 + parseInt(hitchTimeParts[1] || '0');
          const diffMinutes = Math.abs(utMinutes - hitchMinutes);
          horaMatch = diffMinutes <= 5; // Permitir hasta 5 minutos de diferencia
        } catch {
          horaMatch = hora === hitchHora; // Fallback a comparación exacta
        }
      }

      return fechaMatch && horaMatch && choferMatch;
    });

    if (matchingAnswer) {
      logger.info('[HITCH] Found related hitch equipment', { data: { equipmentId: matchingAnswer.equipment_id } });
      return {
        hitchEquipmentId: matchingAnswer.equipment_id as string,
        hitchChecklistAnswerId: matchingAnswer.id,
      };
    }

    return null;
  } catch (error) {
    logger.error('Error in findRelatedHitchEquipmentId', { data: { error } });
    return null;
  }
};
