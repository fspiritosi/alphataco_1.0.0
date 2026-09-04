'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';
import { cookies } from 'next/headers';

const logger = new Logger('features/Mantenimiento/equipment-basic');

/**
 * Datos basicos de los equipos de la empresa, para los selectores de mantenimiento.
 *
 * Migrada de Supabase a Prisma (ticket 592) para poder resolver `type` y `sub_type`:
 * en Supabase esos joins son ambiguos porque la columna y la tabla se llaman igual.
 * El shape de salida se mantiene identico al anterior — solo se AGREGAN
 * `type_name` y `sub_type_name` — para no tocar a ninguno de sus consumidores.
 */
export const fetchAllEquipmentBasicData = async () => {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  try {
    const equipments = await prisma.vehicles.findMany({
      where: { company_id },
      select: {
        id: true,
        condition: true,
        picture: true,
        year: true,
        company_id: true,
        domain: true,
        serie: true,
        intern_number: true,
        kilometer: true,
        engine_hours: true,
        types_of_vehicles: { select: { name: true } },
        type_vehicles_typeTotype: { select: { name: true } },
        sub_type: { select: { name: true } },
      },
    });

    // Aplanamos los nombres de relacion generados por Prisma a claves legibles.
    //
    // `condition` se mantiene como string (y no como el enum de Prisma) a proposito:
    // con Supabase llegaba asi, y varios consumidores lo comparan contra literales
    // que no coinciden con el enum ('no operativo' en vez de 'no_operativo').
    // Tiparlo estricto rompe esos archivos y arreglar esas comparaciones cambiaria
    // el comportamiento de pantallas fuera del alcance de este ticket.
    return equipments.map(({ type_vehicles_typeTotype, sub_type, condition, ...rest }) => ({
      ...rest,
      condition: condition as string | null,
      type_name: type_vehicles_typeTotype?.name ?? null,
      sub_type_name: sub_type?.name ?? null,
    }));
  } catch (error) {
    logger.error('Error fetching equipment', { data: { error } });
    return [];
  }
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

/**
 * Datos basicos de los EQUIPAMIENTOS (other_equipment) de la empresa, para el
 * selector de mantenimiento (ticket 596).
 *
 * Espeja a `fetchAllEquipmentBasicData` pero con las claves propias de esta
 * entidad: un equipamiento no tiene dominio ni kilometraje — se identifica por
 * numero de serie y mide uso con horometro.
 */
export const fetchAllOtherEquipmentBasicData = async () => {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  try {
    const equipments = await prisma.other_equipment.findMany({
      where: { company_id, is_active: true },
      select: {
        id: true,
        condition: true,
        year: true,
        company_id: true,
        serial_number: true,
        intern_number: true,
        horometer: true,
        type: { select: { name: true } },
        sub_type: { select: { name: true } },
      },
      orderBy: [{ serial_number: 'asc' }, { intern_number: 'asc' }],
    });

    return equipments.map(({ type, sub_type, condition, horometer, ...rest }) => ({
      ...rest,
      condition: condition as string | null,
      // El horometro es Decimal en la BD; el form trabaja con strings, igual que
      // el engine_hours de los vehiculos.
      engine_hours: horometer != null ? String(horometer) : null,
      type_name: type?.name ?? null,
      sub_type_name: sub_type?.name ?? null,
    }));
  } catch (error) {
    logger.error('Error fetching other equipment', { data: { error } });
    return [];
  }
};

export type OtherEquipmentBasicData = Awaited<ReturnType<typeof fetchAllOtherEquipmentBasicData>>;
export type OtherEquipmentBasicItem = OtherEquipmentBasicData[number];
