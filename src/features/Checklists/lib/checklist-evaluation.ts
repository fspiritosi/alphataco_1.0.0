/**
 * Evaluación de un checklist normalizado: qué ítems generan desvío, cuáles son críticos y
 * cómo se agrupan las respuestas para guardarlas.
 *
 * Módulo puro (sin React ni acceso a datos): lo consume el formulario al enviar y es lo que
 * decide qué se escribe en `checklist_deviations`. Por eso vive aparte y con tests.
 */

/** Sufijo del campo de observación de un item dentro del formulario. */
export const OBS_SUFFIX = '__obs';

/**
 * Tercera opción de respuesta, para items que no corresponden a la unidad revisada
 * (ej. "Conector de ABS (para acoplado o semi)" en un vehículo liviano).
 *
 * Un item en este estado NO cuenta como falla: la evaluación compara estrictamente contra
 * 'M', así que queda excluido sin lógica adicional.
 */
export const NOT_APPLICABLE_VALUE = 'NA';

/** Valor que marca un item como fallado en las plantillas normalizadas. */
export const FAILED_VALUE = 'M';

export type ChecklistEvaluationItem = {
  id: string;
  code?: string | null;
  label?: string | null;
  is_critical?: boolean | null;
  input_type?: string | null;
  requires_side_validation?: boolean | null;
};

export type ChecklistEvaluationSection = {
  id: string;
  code?: string | null;
  /** Sección reutilizable de la que hereda el código, si la plantilla no define uno propio. */
  section?: { code?: string | null } | null;
  checklist_template_items: ChecklistEvaluationItem[];
};

/** Respuestas planas del formulario: `seccion__item`, `seccion__item_left/_right`, `...__obs`. */
export type ChecklistAnswers = Record<string, unknown>;

export type ChecklistDeviation = {
  item_code: string;
  item_label: string;
  section_code: string;
  is_critical: boolean;
  /** Lo que escribió el operario frente al equipo; viaja al desvío y a la orden de trabajo. */
  driver_comment?: string;
  /**
   * El desvío se imputa al acoplado (ticket 677): se guarda en el checklist del enganche,
   * con su propia patente, para que la solicitud y el costo queden en la unidad correcta.
   */
  is_hitch: boolean;
};

export type ChecklistEvaluationTemplate = {
  /** Secciones realmente renderizadas (las ocultas no se evalúan). */
  sections: ChecklistEvaluationSection[];
  /** Códigos de las secciones que describen al acoplado. */
  hitchSectionCodes?: ReadonlySet<string>;
};

/** Código de una sección: el propio, el de la sección reutilizable, o uno derivado del id. */
export function getSectionCode(section: ChecklistEvaluationSection): string {
  return section.code || section.section?.code || `section_${section.id}`;
}

/** Código de un item: el propio, o uno derivado del id. */
export function getItemCode(item: ChecklistEvaluationItem): string {
  return item.code || `item_${item.id}`;
}

/**
 * Determina si un item debe tratarse como "doble lado" (izquierda/derecha).
 * Importante: un `input_type === 'date'` NUNCA se mapea como doble lado, aunque por error
 * venga con `requires_side_validation = true` desde la BD.
 */
export function isSideValidationItem(item: ChecklistEvaluationItem): boolean {
  return item.input_type !== 'date' && (item.input_type === 'double_side' || Boolean(item.requires_side_validation));
}

/** Nombre del campo del formulario para un item de una sección. */
export function getFieldName(sectionCode: string, itemCode: string): string {
  return `${sectionCode}__${itemCode}`;
}

function readObservation(answers: ChecklistAnswers, fieldName: string): string | undefined {
  const raw = answers[`${fieldName}${OBS_SUFFIX}`];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasFailed(answers: ChecklistAnswers, item: ChecklistEvaluationItem, fieldName: string): boolean {
  if (isSideValidationItem(item)) {
    return answers[`${fieldName}_left`] === FAILED_VALUE || answers[`${fieldName}_right`] === FAILED_VALUE;
  }
  const value = answers[fieldName];
  // `false` / `'false'` son el formato de las plantillas viejas con respuesta booleana.
  return value === FAILED_VALUE || value === false || value === 'false';
}

/**
 * Ítems que generan desvío, en el orden en que aparecen en la plantilla.
 *
 * Sólo cuenta la respuesta del item: una observación que diga "M" no genera desvío (por eso
 * las observaciones viajan en una clave aparte de `answer_data`).
 */
export function computeDeviations(
  answers: ChecklistAnswers,
  template: ChecklistEvaluationTemplate
): ChecklistDeviation[] {
  const hitchSectionCodes = template.hitchSectionCodes ?? new Set<string>();
  const deviations: ChecklistDeviation[] = [];

  template.sections.forEach((section) => {
    const sectionCode = getSectionCode(section);
    const isHitchSection = hitchSectionCodes.has(sectionCode);

    section.checklist_template_items?.forEach((item) => {
      const itemCode = getItemCode(item);
      const fieldName = getFieldName(sectionCode, itemCode);
      if (!hasFailed(answers, item, fieldName)) return;

      const observation = readObservation(answers, fieldName);
      deviations.push({
        item_code: itemCode,
        item_label: item.label || itemCode,
        section_code: sectionCode,
        is_critical: item.is_critical || false,
        ...(observation ? { driver_comment: observation } : {}),
        is_hitch: isHitchSection,
      });
    });
  });

  return deviations;
}

/** Respuestas agrupadas por sección, con los items de doble lado anidados en `{ left, right }`. */
export function buildAnswersBySection(
  answers: ChecklistAnswers,
  sections: ChecklistEvaluationSection[]
): Record<string, Record<string, unknown>> {
  const bySection: Record<string, Record<string, unknown>> = {};

  sections.forEach((section) => {
    const sectionCode = getSectionCode(section);
    bySection[sectionCode] = {};

    section.checklist_template_items?.forEach((item) => {
      const itemCode = getItemCode(item);
      const fieldName = getFieldName(sectionCode, itemCode);

      bySection[sectionCode][itemCode] = isSideValidationItem(item)
        ? { left: answers[`${fieldName}_left`], right: answers[`${fieldName}_right`] }
        : answers[fieldName];
    });
  });

  return bySection;
}

/**
 * Observaciones por item (columna OBSERVACIONES de los formularios en papel), indexadas por
 * `seccion__item`. Van en una clave propia de `answer_data`, fuera de `answers`.
 */
export function collectItemObservations(
  answers: ChecklistAnswers,
  sections: ChecklistEvaluationSection[]
): Record<string, string> {
  const observations: Record<string, string> = {};

  sections.forEach((section) => {
    const sectionCode = getSectionCode(section);
    section.checklist_template_items?.forEach((item) => {
      const fieldName = getFieldName(sectionCode, getItemCode(item));
      const observation = readObservation(answers, fieldName);
      if (observation) observations[fieldName] = observation;
    });
  });

  return observations;
}
