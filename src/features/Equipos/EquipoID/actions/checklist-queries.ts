'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Equipos/EquipoID/checklist-queries');

/**
 * Respuestas de checklist de un equipo (tab "Checklists" de la ficha, flujo logueado).
 * Perímetro sin RLS: acotado a la empresa activa vía `checklist_answers.company_id`.
 */
export async function getChecklistAnswersByEquipment(equipmentId: string) {
  if (!equipmentId) return [];
  const companyId = await getActiveCompanyId();

  try {
    return await prisma.checklist_answers.findMany({
      where: withCompany({ equipment_id: equipmentId }, companyId),
      select: {
        id: true,
        created_at: true,
        result: true,
        observations: true,
        critical_items_failed: true,
        template_id: true,
        equipment_id: true,
        user_id: true,
        ut_checklist_answer_id: true,
        checklist_templates: { select: { id: true, name: true, description: true, code: true } },
        profile: { select: { id: true, fullname: true, email: true } },
        checklist_deviations: {
          select: { id: true, item_code: true, item_label: true, section_code: true, created_at: true },
        },
        // Checklist de la unidad tractor a la que estaba enganchado el equipo
        checklist_answers: {
          select: {
            id: true,
            equipment_id: true,
            vehicles: { select: { id: true, domain: true, serie: true, intern_number: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    logger.error('[GET] Error fetching checklist answers by equipment', { data: { error, equipmentId } });
    return [];
  }
}

export type EquipmentChecklistAnswer = Awaited<ReturnType<typeof getChecklistAnswersByEquipment>>[number];
