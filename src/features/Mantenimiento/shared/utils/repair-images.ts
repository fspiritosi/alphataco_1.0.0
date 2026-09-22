/**
 * Constantes y helpers de las fotos de reparación.
 *
 * Viven en un módulo SIN directiva para que los componentes de cliente puedan importar el
 * límite de tamaño sin arrastrar la Server Action que hace la subida.
 */

/** Bucket ya existente en el proyecto, usado por el flujo anterior de solicitudes de reparación */
export const REPAIR_IMAGES_BUCKET = 'repair-images';

export const MAX_REPAIR_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Nombre de archivo sin tildes, espacios ni caracteres que el storage no admite. */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}
