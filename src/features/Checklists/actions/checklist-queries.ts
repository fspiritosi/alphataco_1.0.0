'use server';

import { Logger } from '@/lib/logger';
import { mapEquipmentToChecklistFormat } from '@/lib/utils';
import { callFunction } from '@/shared/lib/sql';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { z } from 'zod';

const logger = new Logger('features/Checklists/queries');

/**
 * Empresa del contexto de un checklist.
 *
 * `equipmentId` llega en los flujos QR anónimos (`/maintenance/**`): ahí no hay sesión ni
 * empresa activa, así que la empresa sale del equipo (misma regla que
 * `Mantenimiento/shared/resource-company.ts::getResourceCompanyId`). En el dashboard
 * se usa la empresa activa de la sesión.
 */
async function resolveCompanyId(equipmentId?: string): Promise<string> {
  if (equipmentId) {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: equipmentId },
      select: { company_id: true },
    });
    if (!vehicle?.company_id) throw new Error('No se encontró la empresa del equipo');
    return vehicle.company_id;
  }
  return getActiveCompanyId();
}

const employeeRowSchema = z.object({
  id: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  cuil: z.string().nullable(),
  file: z.string().nullable(),
  company_id: z.string().nullable(),
});

/**
 * Busca un empleado de la empresa activa por nombre completo (en cualquier orden).
 * Envuelve la función SQL `find_employee_by_full_name_v2(p_full_name text, p_company_id uuid)`.
 */
export const findEmployeeByFullName = async (fullName: string) => {
  try {
    const company_id = await getActiveCompanyId();
    const employees = await callFunction(
      'find_employee_by_full_name_v2',
      [fullName, { uuid: company_id }],
      z.array(employeeRowSchema.passthrough())
    );
    return employees[0] ?? null;
  } catch (error) {
    logger.error('Error al buscar empleado por nombre completo', { data: { error } });
    return null;
  }
};

const templateSectionSelect = {
  id: true,
  template_id: true,
  section_id: true,
  code: true,
  name: true,
  order_index: true,
  is_required: true,
  is_specific: true,
  created_at: true,
  checklist_sections: {
    select: { id: true, code: true, name: true, description: true, is_reusable: true },
  },
  checklist_template_items: {
    orderBy: { order_index: 'asc' },
    select: {
      id: true,
      template_id: true,
      section_id: true,
      item_id: true,
      code: true,
      label: true,
      description: true,
      input_type: true,
      options: true,
      is_critical: true,
      requires_certification: true,
      certification_validity_days: true,
      requires_side_validation: true,
      order_index: true,
      validation_rules: true,
      checklist_items: {
        select: {
          id: true,
          code: true,
          label: true,
          description: true,
          input_type: true,
          options: true,
          is_critical: true,
          requires_side_validation: true,
          default_value: true,
        },
      },
    },
  },
} as const;

/**
 * Obtiene un template de checklist completo con sus secciones e items.
 *
 * `equipmentId` (flujo QR anónimo) fija la empresa desde el equipo; sin él se usa la
 * empresa activa de la sesión. En ningún caso se devuelve una plantilla de otra empresa.
 */
export const fetchChecklistTemplateById = async (templateId: string, options?: { equipmentId?: string }) => {
  try {
    const company_id = await resolveCompanyId(options?.equipmentId);

    const template = await prisma.checklist_templates.findFirst({
      where: withCompany({ id: templateId }, company_id),
      select: {
        id: true,
        company_id: true,
        name: true,
        description: true,
        code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        checklist_template_sub_types: {
          select: { sub_type_id: true, sub_type: { select: { id: true, name: true } } },
        },
        checklist_template_types: {
          select: { type_id: true, type: { select: { id: true, name: true } } },
        },
        checklist_template_sections: {
          orderBy: { order_index: 'asc' },
          select: templateSectionSelect,
        },
      },
    });

    if (!template) return null;

    // Se mantienen los alias `section` / `reusable_item` que consumen el formulario y el PDF.
    return {
      ...template,
      checklist_template_sections: template.checklist_template_sections.map(
        ({ checklist_sections, checklist_template_items, ...section }) => ({
          ...section,
          section: checklist_sections,
          checklist_template_items: checklist_template_items.map(({ checklist_items, ...item }) => ({
            ...item,
            reusable_item: checklist_items,
          })),
        })
      ),
    };
  } catch (error) {
    logger.error('Error al obtener el template de checklist', { data: { error, templateId } });
    return null;
  }
};

export type ChecklistTemplateDetail = Awaited<ReturnType<typeof fetchChecklistTemplateById>>;

const equipmentForChecklistSelect = {
  id: true,
  domain: true,
  serie: true,
  intern_number: true,
  kilometer: true,
  engine_hours: true,
  brand_vehicles: { select: { id: true, name: true } },
  model_vehicles: { select: { id: true, name: true } },
  type_vehicles_typeTotype: { select: { id: true, name: true, is_tractor_unit: true, has_hitch: true } },
  sub_type: { select: { id: true, name: true } },
} as const;

type EquipmentForChecklistRow = {
  brand_vehicles: { id: number; name: string | null } | null;
  model_vehicles: { id: number; name: string | null } | null;
  type_vehicles_typeTotype: { id: string; name: string | null } | null;
  sub_type: { id: string; name: string | null } | null;
};

/** Alias `brand` / `model` / `subType` que esperan `mapEquipmentToChecklistFormat` y el formulario. */
function toEquipmentForChecklist<T extends EquipmentForChecklistRow>({
  brand_vehicles,
  model_vehicles,
  type_vehicles_typeTotype,
  sub_type,
  ...rest
}: T) {
  return {
    ...rest,
    brand: brand_vehicles,
    model: model_vehicles,
    type: type_vehicles_typeTotype,
    subType: sub_type,
  };
}

/**
 * Obtiene equipos filtrados optimizados para checklists.
 * Filtra directamente en la base de datos por los tipos y subtipos permitidos por el
 * checklist (si existen) y por la empresa activa.
 */
export const fetchFilteredEquipmentForChecklist = async (templateId: string) => {
  try {
    const company_id = await getActiveCompanyId();

    const template = await prisma.checklist_templates.findFirst({
      where: withCompany({ id: templateId }, company_id),
      select: {
        checklist_template_sub_types: { select: { sub_type_id: true } },
        checklist_template_types: { select: { type_id: true } },
      },
    });
    if (!template) return [];

    const allowedSubTypes = template.checklist_template_sub_types
      .map((st) => st.sub_type_id)
      .filter((id): id is string => Boolean(id));
    const allowedTypes = template.checklist_template_types
      .map((t) => t.type_id)
      .filter((id): id is string => Boolean(id));

    // Un equipo aplica si coincide por tipo O por subtipo; sin restricciones, aplican todos.
    const typeFilter =
      allowedTypes.length === 0 && allowedSubTypes.length === 0
        ? {}
        : {
            OR: [
              ...(allowedTypes.length > 0 ? [{ type: { in: allowedTypes } }] : []),
              ...(allowedSubTypes.length > 0 ? [{ subType: { in: allowedSubTypes } }] : []),
            ],
          };

    const equipment = await prisma.vehicles.findMany({
      where: withCompany({ is_active: true, ...typeFilter }, company_id),
      select: equipmentForChecklistSelect,
      orderBy: { domain: 'asc' },
    });

    return equipment.map(toEquipmentForChecklist);
  } catch (error) {
    logger.error('Error al obtener equipos para el checklist', { data: { error, templateId } });
    return [];
  }
};

export type EquipmentForChecklist = Awaited<ReturnType<typeof fetchFilteredEquipmentForChecklist>>[number];

/**
 * Obtiene una respuesta específica de checklist por su ID (empresa activa).
 */
export const fetchChecklistAnswerById = async (answerId: string) => {
  try {
    const company_id = await getActiveCompanyId();

    const answer = await prisma.checklist_answers.findFirst({
      where: withCompany({ id: answerId }, company_id),
      select: {
        id: true,
        template_id: true,
        equipment_id: true,
        employee_id: true,
        user_id: true,
        company_id: true,
        answer_data: true,
        result: true,
        observations: true,
        critical_items_failed: true,
        created_at: true,
        updated_at: true,
        ut_checklist_answer_id: true,
        chofer_employee_id: true,
        customer_id: true,
        horometro: true,
        kilometraje: true,
        checklist_templates: {
          select: {
            id: true,
            name: true,
            description: true,
            code: true,
            is_active: true,
            checklist_template_sections: { orderBy: { order_index: 'asc' }, select: templateSectionSelect },
          },
        },
        vehicles: {
          select: {
            id: true,
            domain: true,
            serie: true,
            intern_number: true,
            kilometer: true,
            brand_vehicles: { select: { name: true } },
            model_vehicles: { select: { name: true } },
          },
        },
        profile: { select: { id: true, fullname: true } },
      },
    });

    if (!answer) return null;

    // Si este checklist es de enganche (tiene ut_checklist_answer_id), el equipment_id es el enganche.
    // Si es el del UT, se busca el checklist de enganche que lo referencia.
    let hitchEquipmentId: string | null = null;
    if (answer.ut_checklist_answer_id) {
      hitchEquipmentId = answer.equipment_id;
    } else {
      const hitchAnswer = await prisma.checklist_answers.findFirst({
        where: withCompany({ ut_checklist_answer_id: answer.id }, company_id),
        select: { equipment_id: true },
      });
      hitchEquipmentId = hitchAnswer?.equipment_id ?? null;
    }

    const { checklist_templates, vehicles, profile, ...rest } = answer;

    return {
      ...rest,
      // Alias legacy (`template` / `equipment` / `user`) que consumen las páginas y el PDF.
      template: checklist_templates && {
        ...checklist_templates,
        checklist_template_sections: checklist_templates.checklist_template_sections.map(
          ({ checklist_sections, checklist_template_items, ...section }) => ({
            ...section,
            section: checklist_sections,
            checklist_template_items: checklist_template_items.map(({ checklist_items, ...item }) => ({
              ...item,
              reusable_item: checklist_items,
            })),
          })
        ),
      },
      equipment: vehicles && {
        id: vehicles.id,
        domain: vehicles.domain,
        serie: vehicles.serie,
        intern_number: vehicles.intern_number,
        kilometer: vehicles.kilometer,
        brand: vehicles.brand_vehicles,
        model: vehicles.model_vehicles,
      },
      user: profile,
      hitch_equipment_id: hitchEquipmentId,
    };
  } catch (error) {
    logger.error('Error al obtener la respuesta de checklist', { data: { error, answerId } });
    return null;
  }
};

export type ChecklistAnswerDetail = Awaited<ReturnType<typeof fetchChecklistAnswerById>>;

/**
 * Obtiene la información del tipo de un equipo para verificar si tiene enganche.
 * La empresa se deriva del propio equipo (el formulario corre también sin sesión).
 */
export const getEquipmentTypeInfo = async (equipmentId: string) => {
  if (!equipmentId) return null;

  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: equipmentId },
      select: { type_vehicles_typeTotype: { select: { id: true, name: true, is_tractor_unit: true, has_hitch: true } } },
    });

    const equipmentType = vehicle?.type_vehicles_typeTotype;
    if (!equipmentType) return null;

    return {
      id: equipmentType.id,
      name: equipmentType.name,
      has_hitch: equipmentType.has_hitch || false,
      is_tractor_unit: equipmentType.is_tractor_unit || false,
    };
  } catch (error) {
    logger.error('Error al obtener el tipo del equipo', { data: { error, equipmentId } });
    return null;
  }
};

/**
 * Equipos compatibles para enganche según el tipo del equipo UT (`type_hitch_types`).
 * La empresa sale del equipo UT, no de la sesión: el formulario corre también en el flujo QR.
 */
export const getCompatibleEquipmentForHitch = async (utEquipmentId: string) => {
  if (!utEquipmentId) return [];

  try {
    const utEquipment = await prisma.vehicles.findUnique({
      where: { id: utEquipmentId },
      select: {
        company_id: true,
        type_vehicles_typeTotype: { select: { id: true, is_tractor_unit: true, has_hitch: true } },
      },
    });

    const utType = utEquipment?.type_vehicles_typeTotype;
    if (!utEquipment?.company_id || !utType) return [];
    // Sólo las unidades tractoras con enganche pueden llevar acoplado
    if (!utType.is_tractor_unit || !utType.has_hitch) return [];

    const company_id = utEquipment.company_id;

    const hitchTypes = await prisma.type_hitch_types.findMany({
      where: { type_id: utType.id },
      select: { compatible_type_id: true },
    });
    const compatibleTypeIds = hitchTypes.map((ht) => ht.compatible_type_id);
    if (compatibleTypeIds.length === 0) return [];

    const compatibleSubTypes = await prisma.sub_type.findMany({
      where: withCompany({ type: { in: compatibleTypeIds }, is_active: true }, company_id),
      select: { id: true, type: true },
    });

    const compatibleSubTypeIds = compatibleSubTypes.map((st) => st.id);
    const typesWithSubTypes = new Set(compatibleSubTypes.map((st) => st.type));
    const typesWithoutSubTypes = compatibleTypeIds.filter((id) => !typesWithSubTypes.has(id));

    // Equipos con subtipo compatible, o de un tipo compatible que no tiene subtipos definidos.
    const orFilters = [
      ...(compatibleSubTypeIds.length > 0 ? [{ subType: { in: compatibleSubTypeIds } }] : []),
      ...(typesWithoutSubTypes.length > 0 ? [{ type: { in: typesWithoutSubTypes }, subType: null }] : []),
    ];
    // Si no hay subtipos ni tipos sin subtipos, se buscan por tipo compatible directamente.
    const equipmentFilter = orFilters.length > 0 ? { OR: orFilters } : { type: { in: compatibleTypeIds } };

    const equipment = await prisma.vehicles.findMany({
      where: withCompany({ is_active: true, id: { not: utEquipmentId }, ...equipmentFilter }, company_id),
      select: equipmentForChecklistSelect,
      orderBy: { domain: 'asc' },
    });

    // Se descartan los equipos sin marca o modelo, igual que el mapeo legacy.
    return equipment
      .filter((eq) => eq.brand_vehicles && eq.model_vehicles)
      .map(toEquipmentForChecklist)
      .map(mapEquipmentToChecklistFormat);
  } catch (error) {
    logger.error('Error al obtener equipos compatibles para enganche', { data: { error, utEquipmentId } });
    return [];
  }
};

/**
 * Plantillas de checklist activas que aplican a un equipo, para el flujo QR anónimo
 * (`/maintenance/equipment/[id]/checklists`).
 *
 * La empresa sale del equipo, nunca de la sesión. Una plantilla aplica si su
 * `checklist_template_sub_types` incluye el subtipo del vehículo, si su
 * `checklist_template_types` incluye su tipo, o si no declara ninguna restricción.
 *
 * Reemplaza al filtro por título hardcodeado (`'Transporte SP-ANAY - CHK - HYS - 03'`) y
 * deja fuera los `custom_form` legacy: el detalle del flujo QR sólo sabe abrir plantillas
 * normalizadas, así que un `custom_form` listado ahí era un enlace muerto.
 *
 * Devuelve `null` si el equipo no existe (la página redirige), y `[]` si existe pero no
 * tiene plantillas aplicables.
 */
export const fetchChecklistTemplatesForEquipment = async (equipmentId: string) => {
  try {
    const vehicle = await prisma.vehicles.findUnique({
      where: { id: equipmentId },
      select: { company_id: true, type: true, subType: true },
    });
    if (!vehicle?.company_id) return null;

    const templates = await prisma.checklist_templates.findMany({
      where: withCompany({ is_active: true }, vehicle.company_id),
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        created_at: true,
        checklist_template_sub_types: { select: { sub_type_id: true } },
        checklist_template_types: { select: { type_id: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return templates
      .filter((template) => {
        const subTypeIds = template.checklist_template_sub_types
          .map((st) => st.sub_type_id)
          .filter((id): id is string => Boolean(id));
        const typeIds = template.checklist_template_types
          .map((t) => t.type_id)
          .filter((id): id is string => Boolean(id));

        // Sin restricciones declaradas, la plantilla aplica a todos los equipos.
        if (subTypeIds.length === 0 && typeIds.length === 0) return true;

        return (
          (vehicle.subType != null && subTypeIds.includes(vehicle.subType)) ||
          (vehicle.type != null && typeIds.includes(vehicle.type))
        );
      })
      .map((template) => ({
        id: template.id,
        name: template.name,
        code: template.code,
        description: template.description,
        created_at: template.created_at,
      }));
  } catch (error) {
    logger.error('Error al obtener las plantillas de checklist del equipo', { data: { error, equipmentId } });
    return [];
  }
};

export type ChecklistTemplateForEquipment = NonNullable<
  Awaited<ReturnType<typeof fetchChecklistTemplatesForEquipment>>
>[number];
