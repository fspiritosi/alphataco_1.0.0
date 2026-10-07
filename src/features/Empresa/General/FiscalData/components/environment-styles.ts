import type { ARCA_ENVIRONMENTS } from '../schemas/fiscal-data';

/**
 * Badge del ambiente. Clases escritas completas (Tailwind v4 escanea el código como texto: una
 * clase armada por concatenación no se genera). Homologación en ámbar porque es "de prueba";
 * producción con el color de marca, como los estados confirmados de Certificaciones.
 */
export const ENVIRONMENT_BADGE_STYLES: Record<(typeof ARCA_ENVIRONMENTS)[number], string> = {
  homologacion: 'border-amber-500/50 text-amber-700 dark:text-amber-400',
  produccion: 'bg-brand text-brand-foreground',
};
