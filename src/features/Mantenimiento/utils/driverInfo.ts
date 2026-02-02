/**
 * Utilidad para extraer información del chofer desde los datos de checklist_deviations
 */

/**
 * Extrae el nombre del chofer desde los datos de checklist_deviations
 * Prioriza: employee firstname+lastname > user.fullname > user.email
 */
export function getDriverName(item: unknown): string | null {
  const checklistAnswers = (item as any)?.maintenance_request_items?.checklist_deviations?.checklist_answers;

  if (!checklistAnswers) return null;

  // Prioridad 1: Employee firstname + lastname
  const employee = checklistAnswers.employee;
  if (employee?.firstname || employee?.lastname) {
    const name = [employee.firstname, employee.lastname].filter(Boolean).join(' ');
    if (name) return name;
  }

  // Prioridad 2: User fullname
  const user = checklistAnswers.user;
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
  const itemAny = item as any;

  // Prioridad al comentario en maintenance_request_items
  const requestComment = itemAny?.maintenance_request_items?.driver_comment;
  if (requestComment) return requestComment;

  // Fallback al comentario en checklist_deviations
  const deviationComment = itemAny?.maintenance_request_items?.checklist_deviations?.driver_comment;
  if (deviationComment) return deviationComment;

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
