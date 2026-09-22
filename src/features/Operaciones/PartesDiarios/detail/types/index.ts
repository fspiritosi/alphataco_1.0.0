/**
 * Tipos inferidos de las server actions del detalle del parte diario.
 * NO definir tipos manualmente — siempre usar Awaited<ReturnType<typeof fn>>.
 */

import type { getDailyReportDetailForExport } from '../export.server';
import type { getDailyReportRowHistory } from '../history.server';
import type { getDailyReportDetailPaginated, getDailyReportHeader } from '../queries.server';

/** Datos de la cabecera del parte diario */
export type DailyReportHeaderData = Awaited<ReturnType<typeof getDailyReportHeader>>;

/** Fila individual del parte diario (con todas sus relaciones) */
export type DailyReportDetailRow = Awaited<ReturnType<typeof getDailyReportDetailPaginated>>['data'][number];

/** Fila del parte diario para exportación (misma shape que DailyReportDetailRow) */
export type DailyReportExportRow = Awaited<ReturnType<typeof getDailyReportDetailForExport>>[number];

/** Entrada del historial de cambios de una fila del parte diario */
export type DailyReportHistoryEntry = Awaited<ReturnType<typeof getDailyReportRowHistory>>[number];
