import { tab } from './define.ts';
import type { CoverageExclusion } from './types.ts';

/**
 * Tabs del mapa de permisos que el manual deliberadamente NO documenta. Toda tab nueva tiene que
 * tener guía o figurar acá con su motivo: si no, `npm run manual:check` falla.
 */
export const COVERAGE_EXCLUSIONS: CoverageExclusion[] = [
  // Equipos → Mantenimiento: vista del sistema anterior que convive con el módulo Mantenimiento.
  // El manual enseña el circuito oficial (módulo Mantenimiento) y omite esta vista.
  { ...tab('equipos', 'type_of_repairs'), reason: 'vista anterior de mantenimiento; el manual documenta el módulo Mantenimiento' },
  { ...tab('equipos', 'type_of_repair'), reason: 'parte de la vista anterior Equipos → Mantenimiento' },
  { ...tab('equipos', 'equipments_with_deviations'), reason: 'parte de la vista anterior Equipos → Mantenimiento' },
  { ...tab('equipos', 'maintenance_groups'), reason: 'parte de la vista anterior Equipos → Mantenimiento' },
  // Pasos viejos del circuito de mantenimiento, desconectados de la interfaz.
  { ...tab('mantenimiento', 'pendientes_ejecutar'), reason: 'permiso legado sin pantalla' },
  { ...tab('mantenimiento', 'para_taller'), reason: 'permiso legado sin pantalla' },
  { ...tab('mantenimiento', 'planificacion'), reason: 'permiso legado sin pantalla' },
];
