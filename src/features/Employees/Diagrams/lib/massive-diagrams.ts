import { z } from 'zod';
import type { ConflictRecord, ErrorRecord, ProcessingResult } from '../types/massive-diagram';
import { diagramDayKey, enumerateDiagramDays, type DiagramDay } from './diagram-dates';

/**
 * Lógica pura de la carga masiva de diagramas/novedades.
 *
 * - `computeMassiveConflicts`: reemplaza a la sobrecarga legacy de 5 argumentos de
 *   `check_diagram_conflicts_with_operations_v2` (la que devolvía `conflicts`), que no se
 *   portó al Postgres plano. La server action trae las filas y este módulo decide.
 * - `normalizeProcessingResult`: valida el JSON de `process_massive_*` y lo lleva a la
 *   forma que consume la UI (`ProcessingResult`).
 */

// ─── Conflictos ─────────────────────────────────────────────────────────────

export interface ConflictEmployee {
  id: string;
  firstname: string | null;
  lastname: string | null;
}

/** Fila de `employees_diagram` ya cargada, con el nombre/color de su novedad. */
export interface ExistingDiagramEntry {
  employee_id: string;
  year: number;
  month: number;
  day: number;
  diagram_type: string;
  diagram_name: string | null;
  diagram_color: string | null;
}

export interface NoveltyInfo {
  name: string | null;
  color: string | null;
}

/** Clave de "este empleado tiene parte diario ese día". `date` = `YYYY-MM-DD` o `Date`. */
export function operationDayKey(employeeId: string, date: string | Date): string {
  const iso = date instanceof Date ? date.toISOString().slice(0, 10) : date;
  return `${employeeId}|${iso}`;
}

const DEFAULT_NAME = 'Sin nombre';
const DEFAULT_COLOR = '#6b7280';

export function computeMassiveConflicts(params: {
  employees: ConflictEmployee[];
  from: DiagramDay;
  to: DiagramDay;
  existing: ExistingDiagramEntry[];
  /** Claves de `operationDayKey` de los días con parte diario. */
  operationDays: ReadonlySet<string>;
  /** Novedad que se asignaría al día `dayIndex` del rango (0 = `from`). */
  newNoveltyForDay: (dayIndex: number) => NoveltyInfo;
}): ConflictRecord[] {
  const days = enumerateDiagramDays(params.from, params.to);

  const existingByKey = new Map<string, ExistingDiagramEntry>();
  for (const entry of params.existing) {
    existingByKey.set(`${entry.employee_id}|${diagramDayKey(entry)}`, entry);
  }

  const conflicts: ConflictRecord[] = [];

  for (const employee of params.employees) {
    days.forEach((day, dayIndex) => {
      const dateKey = diagramDayKey(day);
      const current = existingByKey.get(`${employee.id}|${dateKey}`);
      if (!current) return;

      const inUse = params.operationDays.has(operationDayKey(employee.id, dateKey));
      const next = params.newNoveltyForDay(dayIndex);

      conflicts.push({
        employee_id: employee.id,
        employee_name: `${employee.firstname ?? ''} ${employee.lastname ?? ''}`.trim(),
        day: day.day,
        month: day.month,
        year: day.year,
        date_formatted: dateKey,
        current_diagram_type: current.diagram_type,
        current_diagram_name: current.diagram_name ?? DEFAULT_NAME,
        current_diagram_color: current.diagram_color ?? DEFAULT_COLOR,
        new_diagram_name: next.name ?? DEFAULT_NAME,
        new_diagram_color: next.color ?? DEFAULT_COLOR,
        is_used_in_operations: inUse,
        can_update: !inUse,
        conflict_type: inUse ? 'IN_USE' : 'CAN_UPDATE',
      });
    });
  }

  return conflicts;
}

// ─── Resultado del procesamiento ────────────────────────────────────────────

const recordSchema = z.object({
  employee_id: z.string(),
  employee_name: z.string().nullish(),
  date: z.string(),
  day: z.coerce.number(),
  month: z.coerce.number(),
  year: z.coerce.number(),
  is_active: z.boolean(),
  novelty_name: z.string().nullish(),
  novelty_color: z.string().nullish(),
});

const updatedRecordSchema = recordSchema.extend({
  previous_novelty_name: z.string().nullish(),
  previous_novelty_color: z.string().nullish(),
});

const noveltySchema = z.object({ id: z.string(), name: z.string().nullable(), color: z.string().nullable() });

const errorRecordSchema = z.object({
  employee_id: z.string(),
  employee_name: z.string(),
  date: z.string().nullable(),
  error_type: z.string(),
  error_message: z.string(),
});

const successSchema = z.object({
  success: z.literal(true),
  summary: z.object({
    total_employees: z.coerce.number(),
    processed_employees: z.coerce.number(),
    total_days: z.coerce.number(),
    processed_days: z.coerce.number(),
    created_records: z.coerce.number(),
    updated_records: z.coerce.number(),
    skipped_records: z.coerce.number(),
    errors_count: z.coerce.number().nullable(),
    processing_time_seconds: z.coerce.number(),
    start_time: z.string(),
    end_time: z.string(),
  }),
  data: z.object({
    created: z.array(recordSchema).nullable(),
    updated: z.array(updatedRecordSchema).nullable(),
  }),
  details: z.object({
    date_range: z.object({ from: z.string(), to: z.string() }),
    mode: z.enum(['diagram', 'novelty']).optional(),
    work_diagram: z
      .object({
        id: z.string(),
        name: z.string(),
        active_days: z.coerce.number(),
        inactive_days: z.coerce.number(),
        cycle_length: z.coerce.number(),
      })
      .optional(),
    active_novelty: noveltySchema.optional(),
    inactive_novelty: noveltySchema.optional(),
    novelty: noveltySchema.optional(),
    conflict_resolution: z.string(),
    employee_ids: z.array(z.string()),
  }),
  // La función SQL acumula errores como texto; una versión futura podría devolver objetos.
  errors: z.array(z.union([z.string(), errorRecordSchema])).nullable(),
});

const failureSchema = z.object({ success: z.literal(false), error: z.string().optional() });

const resultSchema = z.discriminatedUnion('success', [successSchema, failureSchema]);

function toErrorRecord(error: string | ErrorRecord): ErrorRecord {
  if (typeof error !== 'string') return error;
  return { employee_id: '', employee_name: 'N/A', date: null, error_type: 'PROCESSING_ERROR', error_message: error };
}

function nullishToUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/** Valida el JSON de `process_massive_*` y lo normaliza. `success: false` lanza con el mensaje. */
export function normalizeProcessingResult(raw: unknown): ProcessingResult {
  const parsed = resultSchema.parse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error ?? 'La carga masiva falló');
  }

  const mapNovelty = (novelty: z.infer<typeof noveltySchema> | undefined) =>
    novelty ? { id: novelty.id, name: novelty.name ?? DEFAULT_NAME, color: novelty.color ?? DEFAULT_COLOR } : undefined;

  return {
    success: true,
    summary: parsed.summary,
    data: {
      created: (parsed.data.created ?? []).map((record) => ({
        ...record,
        employee_name: nullishToUndefined(record.employee_name),
        novelty_name: nullishToUndefined(record.novelty_name),
        novelty_color: nullishToUndefined(record.novelty_color),
      })),
      updated: (parsed.data.updated ?? []).map((record) => ({
        ...record,
        employee_name: nullishToUndefined(record.employee_name),
        novelty_name: nullishToUndefined(record.novelty_name),
        novelty_color: nullishToUndefined(record.novelty_color),
        previous_novelty_name: nullishToUndefined(record.previous_novelty_name),
        previous_novelty_color: nullishToUndefined(record.previous_novelty_color),
      })),
    },
    details: {
      date_range: parsed.details.date_range,
      mode: parsed.details.mode,
      work_diagram: parsed.details.work_diagram,
      active_novelty: mapNovelty(parsed.details.active_novelty),
      inactive_novelty: mapNovelty(parsed.details.inactive_novelty),
      novelty: mapNovelty(parsed.details.novelty),
      conflict_resolution: parsed.details.conflict_resolution,
      employee_ids: parsed.details.employee_ids,
    },
    errors: (parsed.errors ?? []).map(toErrorRecord),
  };
}
