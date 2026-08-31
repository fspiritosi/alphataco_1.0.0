/**
 * Estados del seguimiento de taller.
 *
 * Vive en un módulo SIN directiva (no `'use server'`): un archivo de server
 * actions solo puede exportar funciones async, así que exportar constantes desde
 * ahí rompe en runtime aunque compile. El count del pipeline y la tabla necesitan
 * compartir exactamente esta lista para no mostrar números distintos.
 */

/** Todos los estados que el seguimiento puede llegar a mostrar */
export const WORKSHOP_TRACKING_STATUSES: string[] = [
  // Reunion 31/08/2026: el pedido aprobado que todavia no tiene fecha de taller
  // tambien se sigue desde aca. Antes desaparecia de la vista del supervisor hasta
  // que el taller lo programaba: "yo lo cargo y queda en la nada misma... dos
  // semanas despues el taller sigue sin ponerle fecha y yo no tengo como
  // reclamarle porque no corresponde".
  'pending_scheduling',
  'date_confirmed',
  'in_workshop',
  'pending_workshop_validation',
  // `pending_operations_validation` quedo fuera del circuito (reunion 31/08/2026):
  // el taller cierra sin pasar por Operaciones. Los registros historicos con ese
  // estado ya se migraron a 'completed'.
  'operations_rejected',
  'workshop_rejected',
  'completed',
];

/**
 * Estados visibles por defecto: el seguimiento muestra el trabajo en curso.
 * Las órdenes completadas quedan fuera del listado inicial (son la enorme mayoría
 * de los registros y ya se consultan desde el legajo del equipo), pero siguen
 * disponibles tildando "Completada" en el filtro de Estado.
 */
export const DEFAULT_TRACKING_STATUSES: string[] = WORKSHOP_TRACKING_STATUSES.filter((s) => s !== 'completed');
