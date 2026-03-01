/**
 * Utilidad para extraer información de comentarios de items de mantenimiento.
 *
 * Maneja correctamente la distinción entre:
 * - Solicitudes de checklist (creadas por chofer): muestra "Comentario del chofer"
 * - Solicitudes manuales (creadas por supervisor): muestra "Comentario del supervisor"
 *
 * Deduplica comentarios idénticos entre driver_comment, validator_comment y description.
 */

/**
 * Extrae el nombre del chofer desde los datos de checklist_deviations
 * Prioriza: employee firstname+lastname > user.fullname > user.email
 */
export function getDriverName(item: unknown): string | null {
  const checklistAnswers = (item as Record<string, unknown>)?.maintenance_request_items as
    | Record<string, unknown>
    | undefined;
  const deviations = checklistAnswers?.checklist_deviations as Record<string, unknown> | undefined;
  const answers = deviations?.checklist_answers as Record<string, unknown> | undefined;

  if (!answers) return null;

  // Prioridad 1: Employee firstname + lastname
  const employee = answers.employee as { firstname?: string; lastname?: string } | undefined;
  if (employee?.firstname || employee?.lastname) {
    const name = [employee.firstname, employee.lastname].filter(Boolean).join(' ');
    if (name) return name;
  }

  // Prioridad 2: User fullname
  const user = answers.user as { fullname?: string; email?: string } | undefined;
  if (user?.fullname) {
    return user.fullname;
  }

  // Prioridad 3: User email
  if (user?.email) {
    return user.email;
  }

  return null;
}

/**
 * Extrae el comentario del chofer desde los datos del item
 * Busca en maintenance_request_items.driver_comment o checklist_deviations.driver_comment
 */
export function getDriverComment(item: unknown): string | null {
  const requestItems = (item as Record<string, unknown>)?.maintenance_request_items as
    | Record<string, unknown>
    | undefined;

  // Prioridad al comentario en maintenance_request_items
  const requestComment = requestItems?.driver_comment;
  if (typeof requestComment === 'string' && requestComment) return requestComment;

  // Fallback al comentario en checklist_deviations
  const deviations = requestItems?.checklist_deviations as Record<string, unknown> | undefined;
  const deviationComment = deviations?.driver_comment;
  if (typeof deviationComment === 'string' && deviationComment) return deviationComment;

  return null;
}

/**
 * Formatea la información del chofer con el comentario
 * Retorna un objeto con el nombre del chofer y el comentario, o null si no hay comentario
 */
export function getDriverCommentInfo(item: unknown): { driverName: string | null; comment: string } | null {
  const comment = getDriverComment(item);
  if (!comment) return null;

  const driverName = getDriverName(item);
  return { driverName, comment };
}

// =============================================================================
// NUEVO: Sistema de comentarios con deduplicación y detección de origen
// =============================================================================

export interface CommentEntry {
  /** Label a mostrar (ej: "Comentario del chofer", "Comentario del supervisor") */
  label: string;
  /** El texto del comentario */
  text: string;
  /** Estilo visual: 'driver' (amber), 'validator' (blue), 'description' (neutral), 'chief' (emerald) */
  style: 'driver' | 'validator' | 'description' | 'chief';
}

/**
 * Obtiene todos los comentarios de un item de maintenance_order deduplicados.
 *
 * @param item - Item de maintenance_order_items (con maintenance_request_items embebido)
 * @param source - Origen de la solicitud: 'checklist' | 'manual' | null
 * @returns Array de comentarios únicos con labels apropiados según el origen
 */
export function getItemComments(item: unknown, source: string | null | undefined): CommentEntry[] {
  const comments: CommentEntry[] = [];
  const seenTexts = new Set<string>();

  const requestItems = (item as Record<string, unknown>)?.maintenance_request_items as
    | Record<string, unknown>
    | undefined;

  const isManual = source === 'manual';

  // 1. driver_comment - "Comentario del chofer" o "Comentario del supervisor" según origen
  const driverComment = getDriverComment(item);
  if (driverComment) {
    const driverName = getDriverName(item);
    const nameStr = driverName ? ` (${driverName})` : '';

    comments.push({
      label: isManual ? `Comentario del supervisor${nameStr}` : `Comentario del chofer${nameStr}`,
      text: driverComment,
      style: isManual ? 'validator' : 'driver',
    });
    seenTexts.add(driverComment.trim().toLowerCase());
  }

  // 2. validator_comment - "Comentario del validador" (solo si es diferente al driver_comment)
  const validatorComment = requestItems?.validator_comment;
  if (typeof validatorComment === 'string' && validatorComment) {
    const normalized = validatorComment.trim().toLowerCase();
    if (!seenTexts.has(normalized)) {
      comments.push({
        label: 'Comentario del validador',
        text: validatorComment,
        style: 'validator',
      });
      seenTexts.add(normalized);
    }
  }

  // 3. description del request_item - "Descripción del desvío" (solo si es diferente)
  const requestDescription = requestItems?.description;
  if (typeof requestDescription === 'string' && requestDescription) {
    const normalized = requestDescription.trim().toLowerCase();
    if (!seenTexts.has(normalized)) {
      comments.push({
        label: 'Descripción del desvío',
        text: requestDescription,
        style: 'description',
      });
      seenTexts.add(normalized);
    }
  }

  // 4. description del order_item - "Descripción adicional" (solo si es diferente)
  const itemDescription = (item as Record<string, unknown>)?.description;
  if (typeof itemDescription === 'string' && itemDescription) {
    const normalized = itemDescription.trim().toLowerCase();
    if (!seenTexts.has(normalized)) {
      comments.push({
        label: 'Descripción adicional',
        text: itemDescription,
        style: 'description',
      });
      seenTexts.add(normalized);
    }
  }

  // 5. workshop_chief_comment - "Comentario del Jefe de Taller"
  const chiefComment = (item as Record<string, unknown>)?.workshop_chief_comment;
  if (typeof chiefComment === 'string' && chiefComment) {
    const normalized = chiefComment.trim().toLowerCase();
    if (!seenTexts.has(normalized)) {
      comments.push({
        label: 'Comentario del Jefe de Taller',
        text: chiefComment,
        style: 'chief',
      });
    }
  }

  return comments;
}
