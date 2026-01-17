/**
 * Configuración de empresa por defecto
 *
 * Este archivo centraliza la configuración de la empresa cuando el sistema
 * opera en modo single-tenant (una sola empresa).
 *
 * Si en el futuro se necesita multi-tenancy, este archivo se puede modificar
 * para leer de variables de entorno o de la cookie `actualComp`.
 */

// ID de la empresa por defecto (CodeControl / empresa principal)
export const DEFAULT_COMPANY_ID = 'be4119b0-12ca-4a8f-87ed-209239194dab';

// Nombre de la empresa por defecto (para UI)
export const DEFAULT_COMPANY_NAME = 'Grupo Horizonte';

/**
 * Obtiene el company_id a usar en las queries.
 * En modo single-tenant, siempre retorna la empresa por defecto.
 *
 * @param cookieValue - Valor de la cookie actualComp (opcional, para compatibilidad)
 * @returns El company_id a usar
 */
export function getCompanyId(cookieValue?: string | null): string {
  // Si hay un valor de cookie válido, usarlo (compatibilidad con multi-tenant)
  if (cookieValue && cookieValue.trim() !== '' && cookieValue !== 'undefined') {
    return cookieValue;
  }

  // Por defecto, usar la empresa configurada
  return DEFAULT_COMPANY_ID;
}

/**
 * Verifica si el sistema está en modo single-tenant
 */
export const IS_SINGLE_TENANT = true;
