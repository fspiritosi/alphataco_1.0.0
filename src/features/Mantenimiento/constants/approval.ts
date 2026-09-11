/**
 * Constantes de la validación de solicitudes de mantenimiento (Operaciones — Paso 1).
 *
 * Vive en un módulo sin directiva porque lo consumen tanto el modal de aprobación
 * (cliente) como la server action que persiste la orden.
 */

/**
 * Longitud mínima de la descripción que el validador debe escribir al aprobar
 * una solicitud. Ese texto se guarda en `maintenance_orders.description` y es lo
 * que el taller ve en la columna "Descripción" para poder planificar sin tener
 * que abrir el detalle de la orden.
 */
export const MIN_APPROVAL_DESCRIPTION_LENGTH = 15;
