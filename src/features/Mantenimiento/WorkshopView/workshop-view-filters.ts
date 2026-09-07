/**
 * Criterio de "trabajo abierto" de la Vista Taller (ticket 650).
 *
 * Vive en un módulo sin directiva porque lo comparten dos archivos `'use server'`
 * (los conteos del acordeón y la tabla de cada sector) y esos sólo pueden
 * exportar funciones async.
 */

/**
 * Estados terminales de una orden de trabajo.
 *
 * La Vista Taller es la pantalla del trabajo pendiente: una tarea cuya OT ya
 * terminó no se muestra. Como una OM puede tener varias OT, el filtro va a nivel
 * de la OT — la OM deja de aparecer sola cuando todas sus tareas quedaron
 * cerradas.
 */
export const CLOSED_WORK_ORDER_STATUSES = ['completed', 'completed_partial', 'cancelled'] as const;

/**
 * Condición Prisma sobre `maintenance_order_items` que deja sólo trabajo abierto.
 *
 * El `work_order_id: null` va explícito: una condición sobre la relación no
 * matchea cuando la relación no existe, y una tarea sin OT generada todavía es
 * justamente trabajo pendiente que el taller tiene que ver.
 */
export const OPEN_WORK_ONLY = {
  OR: [{ work_order_id: null }, { work_orders: { status: { notIn: [...CLOSED_WORK_ORDER_STATUSES] } } }],
};
