/**
 * Tipos compartidos por el formulario de línea de parte diario (tablero comercial).
 *
 * El schema Zod cambia entre alta y edición (`useFormSchema`), así que el tipo de los
 * valores se declara acá con todos los campos posibles: los que sólo existen en un modo
 * quedan opcionales.
 */

import type { transformDailyReportsType } from '../lib/transform';

/** Valores del formulario de línea (alta y edición). */
export interface DailyReportRowFormValues {
  customer: string;
  services: string;
  item: string;
  working_day: string;
  start_time?: string;
  end_time?: string;
  employees?: string[];
  equipment?: string[];
  equipos_cliente?: string[];
  observations?: string;
  sector_service_id?: string;
  areas_service_id?: string;
  type_service?: 'mensual' | 'adicional' | 'adicional_permanente';
  /** Sólo en el alta. */
  date?: Date;
  /** Sólo en la edición. */
  status?: string;
  /** Jornada de 24 h: tramos cubiertos. */
  completed_day?: boolean;
  completed_night?: boolean;
  remit_number?: string;
}

/** Fila seleccionada que se está editando (la que arma `transformDailyReports`). */
export type DailyReportRowFormRow = transformDailyReportsType[number];
