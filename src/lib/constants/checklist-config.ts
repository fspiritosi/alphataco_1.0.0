/**
 * Configuración para el sistema de checklists y desvíos críticos
 */
export const CHECKLIST_CONFIG = {
  // Valores que se consideran "malos" para items críticos
  CRITICAL_FAILED_VALUES: ['M', 'Malo'],

  // Si se deben analizar solo items críticos o todos
  ANALYZE_ONLY_CRITICAL: true, // Por ahora true, fácil de cambiar a false

  // Estado del equipo cuando se completan todas las solicitudes
  EQUIPMENT_CONDITION_ON_RESOLUTION: 'no operativo' as const,
} as const;
