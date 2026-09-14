import { SOURCE_LABELS_EXTENDED } from '@/features/Mantenimiento/shared/preventive-maintenance';
import { type_of_maintenance_ENUM } from '@/generated/prisma/enums';

/**
 * PALETA DE LOS GRÁFICOS DE MANTENIMIENTO (tickets 680 y 682)
 * ---------------------------------------------------------------------------
 * Las dos tarjetas comparten un mismo sistema de color para que convivan en la
 * misma pantalla sin contradecirse:
 *
 *   · aqua    → preventivo / planificado  (origen "Preventivo" y tipo "Preventivo")
 *   · naranja → reactivo / no planificado (origen "Manual" y tipo "Correctivo")
 *   · azul    → checklist (inspección de rutina)
 *   · violeta → "Otro" (residual del enum de tipo de mantenimiento)
 *
 * La palabra "Preventivo" aparece en los DOS gráficos con significados
 * distintos (origen del pedido vs. clasificación de la tarea); pintarla del
 * mismo color en ambos es deliberado — dos colores para la misma palabra en la
 * misma pantalla es lo que confunde.
 *
 * Cada color trae su valor para tema claro y oscuro (el oscuro NO es el claro
 * invertido: es el mismo hue re-escalonado para el fondo oscuro). Los dos
 * tríos se validaron por diferencia perceptual sobre TODOS los pares, en claro
 * y en oscuro, para visión normal y para deuteranopía/protanopía/tritanopía:
 * peor par ΔE CVD 9.2 (claro) / 9.4 (oscuro), muy por encima del piso de 8;
 * peor par en visión normal 24.0 / 20.9, sobre el piso de 15.
 *
 * El aqua queda por debajo de 3:1 de contraste contra el fondo claro, así que
 * ambos gráficos llevan etiquetas visibles con el valor y el porcentaje al lado
 * de cada color — la identidad nunca depende solo del color.
 */
type SeriesTheme = { light: string; dark: string };

const PALETTE = {
  blue: { light: '#2a78d6', dark: '#3987e5' },
  orange: { light: '#eb6834', dark: '#d95926' },
  aqua: { light: '#1baf7a', dark: '#199e70' },
  violet: { light: '#4a3aa7', dark: '#9085e9' },
} as const satisfies Record<string, SeriesTheme>;

// ── Ticket 680 · Origen de las solicitudes de mantenimiento ────────────────

/** Clave usada cuando `maintenance_requests.source` viene en null. */
export const UNKNOWN_SOURCE_KEY = 'sin-origen';

/**
 * Labels de origen: se reutilizan los del módulo de Mantenimiento
 * (`SOURCE_LABELS_EXTENDED`) para que el dashboard diga exactamente lo mismo
 * que las tablas de pedidos. Solo se agrega el caso null, que allá no aplica.
 */
export const REQUEST_SOURCE_LABELS: Record<string, string> = {
  ...SOURCE_LABELS_EXTENDED,
  [UNKNOWN_SOURCE_KEY]: 'Sin origen',
};

/** Orden fijo de presentación. El color sigue al origen, nunca a su ranking. */
export const REQUEST_SOURCE_ORDER: readonly string[] = ['checklist', 'manual', 'preventive', UNKNOWN_SOURCE_KEY];

export const REQUEST_SOURCE_COLORS: Record<string, SeriesTheme> = {
  checklist: PALETTE.blue,
  manual: PALETTE.orange,
  preventive: PALETTE.aqua,
  [UNKNOWN_SOURCE_KEY]: PALETTE.violet,
};

// ── Ticket 682 · Preventivo vs Correctivo ──────────────────────────────────

export type MaintenanceKind = type_of_maintenance_ENUM;

/** Orden fijo: primero los dos que pidió el cliente, "Otro" al final. */
export const MAINTENANCE_KIND_ORDER: readonly MaintenanceKind[] = [
  type_of_maintenance_ENUM.Preventivo,
  type_of_maintenance_ENUM.Correctivo,
  type_of_maintenance_ENUM.Otro,
];

export const MAINTENANCE_KIND_COLORS: Record<MaintenanceKind, SeriesTheme> = {
  [type_of_maintenance_ENUM.Preventivo]: PALETTE.aqua,
  [type_of_maintenance_ENUM.Correctivo]: PALETTE.orange,
  [type_of_maintenance_ENUM.Otro]: PALETTE.violet,
};

// ── Variables CSS compartidas ──────────────────────────────────────────────

/** Nombre de la variable CSS que expone el color de un origen de solicitud. */
export function requestSourceColorVar(source: string): string {
  return `var(--mnt-source-${source})`;
}

/** Nombre de la variable CSS que expone el color de un tipo de mantenimiento. */
export function maintenanceKindColorVar(kind: MaintenanceKind): string {
  return `var(--mnt-kind-${kind.toLowerCase()})`;
}
