/**
 * Tonos de los bloques del manual (Callout, FlowStep, State). Las clases van ESCRITAS COMPLETAS:
 * Tailwind v4 solo genera las que encuentra literales en el código, así que nada de armarlas con
 * `replace()` ni template literals.
 *
 * `success` usa la rampa esmeralda, que es la misma del tema (`--primary` = emerald-700 y los
 * `--chart-*` son esa rampa). El resto sale de las paletas que la app ya usa para avisos
 * (sky/amber/red con su variante `dark:`).
 *
 * Contraste medido (WCAG, sRGB) sobre el fondo de cada bloque:
 * - Rótulo (`label`) sobre `surface`: claro 5,1–6,9:1 · oscuro 8,3–10,4:1 (texto, piso 4,5).
 * - Barra de acento (`bar`) sobre `surface`: claro 3,1–4,4:1 · oscuro 5,6–8,7:1 (no texto, piso 3).
 * - El cuerpo va en `text-foreground` (>13:1 en los dos temas). `text-muted-foreground` sobre los
 *   fondos de color da 4,2–4,45:1 en claro: NO usarlo dentro de un bloque con tono.
 */
export type Tone = 'default' | 'info' | 'success' | 'warning' | 'danger';

type ToneClasses = {
  /** Fondo y borde del bloque. */
  surface: string;
  /** Barra de acento lateral (o superior) que marca el tono. */
  bar: string;
  /** Texto de rótulo e íconos. */
  label: string;
};

export const TONE_CLASSES: Record<Tone, ToneClasses> = {
  default: {
    surface: 'border-border bg-card',
    bar: 'bg-muted-foreground',
    label: 'text-muted-foreground',
  },
  info: {
    surface: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950',
    bar: 'bg-sky-600 dark:bg-sky-400',
    label: 'text-sky-700 dark:text-sky-300',
  },
  success: {
    surface: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950',
    bar: 'bg-emerald-600 dark:bg-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  warning: {
    surface: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
    bar: 'bg-amber-600 dark:bg-amber-400',
    label: 'text-amber-800 dark:text-amber-300',
  },
  danger: {
    surface: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
    bar: 'bg-red-600 dark:bg-red-400',
    label: 'text-red-700 dark:text-red-300',
  },
};

/** Los redactores escriben el tono a mano: uno desconocido cae a `default` en vez de romper. */
export function toTone(value: string | undefined): Tone {
  return value && value in TONE_CLASSES ? (value as Tone) : 'default';
}
