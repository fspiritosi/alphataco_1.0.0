import { tab } from './define.ts';
import type { CoverageExclusion } from './types.ts';

/**
 * Tabs del mapa de permisos que el manual deliberadamente NO documenta. Toda tab nueva tiene que
 * tener guía o figurar acá con su motivo: si no, `npm run manual:check` falla.
 */
export const COVERAGE_EXCLUSIONS: CoverageExclusion[] = [
  // Pasos viejos del circuito de mantenimiento, desconectados de la interfaz.
  { ...tab('mantenimiento', 'pendientes_ejecutar'), reason: 'permiso legado sin pantalla' },
  { ...tab('mantenimiento', 'para_taller'), reason: 'permiso legado sin pantalla' },
  { ...tab('mantenimiento', 'planificacion'), reason: 'permiso legado sin pantalla' },
];
