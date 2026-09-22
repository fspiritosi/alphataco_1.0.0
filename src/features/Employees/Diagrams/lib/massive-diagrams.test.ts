import { describe, expect, it } from 'vitest';
import { computeMassiveConflicts, normalizeProcessingResult, operationDayKey } from './massive-diagrams';

const employees = [
  { id: 'e1', firstname: 'Ana', lastname: 'Pérez' },
  { id: 'e2', firstname: 'Luis', lastname: 'Gómez' },
];

const from = { year: 2026, month: 3, day: 1 };
const to = { year: 2026, month: 3, day: 3 };

const novelty = (name: string, color: string) => () => ({ name, color });

describe('computeMassiveConflicts', () => {
  it('sin registros previos no hay conflictos', () => {
    const result = computeMassiveConflicts({
      employees,
      from,
      to,
      existing: [],
      operationDays: new Set(),
      newNoveltyForDay: novelty('Trabajo', '#00ff00'),
    });
    expect(result).toEqual([]);
  });

  it('un día ya cargado sin parte diario es CAN_UPDATE con la novedad actual y la nueva', () => {
    const result = computeMassiveConflicts({
      employees,
      from,
      to,
      existing: [
        {
          employee_id: 'e1',
          year: 2026,
          month: 3,
          day: 2,
          diagram_type: 'dt-franco',
          diagram_name: 'Franco',
          diagram_color: '#ff0000',
        },
      ],
      operationDays: new Set(),
      newNoveltyForDay: novelty('Trabajo', '#00ff00'),
    });

    expect(result).toEqual([
      {
        employee_id: 'e1',
        employee_name: 'Ana Pérez',
        day: 2,
        month: 3,
        year: 2026,
        date_formatted: '2026-03-02',
        current_diagram_type: 'dt-franco',
        current_diagram_name: 'Franco',
        current_diagram_color: '#ff0000',
        new_diagram_name: 'Trabajo',
        new_diagram_color: '#00ff00',
        is_used_in_operations: false,
        can_update: true,
        conflict_type: 'CAN_UPDATE',
      },
    ]);
  });

  it('un día ya cargado Y usado en un parte diario es IN_USE (no se puede actualizar)', () => {
    const result = computeMassiveConflicts({
      employees,
      from,
      to,
      existing: [
        { employee_id: 'e2', year: 2026, month: 3, day: 1, diagram_type: 'dt-x', diagram_name: null, diagram_color: null },
      ],
      operationDays: new Set([operationDayKey('e2', '2026-03-01')]),
      newNoveltyForDay: novelty('Trabajo', '#00ff00'),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      employee_id: 'e2',
      employee_name: 'Luis Gómez',
      date_formatted: '2026-03-01',
      // Defaults iguales a los de la función SQL legacy
      current_diagram_name: 'Sin nombre',
      current_diagram_color: '#6b7280',
      is_used_in_operations: true,
      can_update: false,
      conflict_type: 'IN_USE',
    });
  });

  it('un parte diario en un día SIN novedad cargada no es conflicto', () => {
    const result = computeMassiveConflicts({
      employees,
      from,
      to,
      existing: [],
      operationDays: new Set([operationDayKey('e1', '2026-03-01')]),
      newNoveltyForDay: novelty('Trabajo', '#00ff00'),
    });
    expect(result).toEqual([]);
  });

  it('la novedad nueva depende del índice del día en el ciclo (activo/inactivo)', () => {
    const result = computeMassiveConflicts({
      employees: [employees[0]],
      from,
      to,
      existing: [
        { employee_id: 'e1', year: 2026, month: 3, day: 1, diagram_type: 'a', diagram_name: 'A', diagram_color: '#a' },
        { employee_id: 'e1', year: 2026, month: 3, day: 3, diagram_type: 'b', diagram_name: 'B', diagram_color: '#b' },
      ],
      operationDays: new Set(),
      newNoveltyForDay: (dayIndex) =>
        dayIndex === 0 ? { name: 'Activa', color: '#1' } : { name: 'Inactiva', color: '#2' },
    });

    expect(result.map((c) => [c.date_formatted, c.new_diagram_name])).toEqual([
      ['2026-03-01', 'Activa'],
      ['2026-03-03', 'Inactiva'],
    ]);
  });

  it('ignora registros de empleados que no están en la lista y días fuera del rango', () => {
    const result = computeMassiveConflicts({
      employees: [employees[0]],
      from,
      to,
      existing: [
        { employee_id: 'otro', year: 2026, month: 3, day: 1, diagram_type: 'a', diagram_name: 'A', diagram_color: '#a' },
        { employee_id: 'e1', year: 2026, month: 3, day: 9, diagram_type: 'a', diagram_name: 'A', diagram_color: '#a' },
      ],
      operationDays: new Set(),
      newNoveltyForDay: novelty('Trabajo', '#00ff00'),
    });
    expect(result).toEqual([]);
  });

  it('recorre empleados en el orden recibido y días en orden cronológico', () => {
    const result = computeMassiveConflicts({
      employees,
      from,
      to,
      existing: [
        { employee_id: 'e2', year: 2026, month: 3, day: 1, diagram_type: 'a', diagram_name: 'A', diagram_color: '#a' },
        { employee_id: 'e1', year: 2026, month: 3, day: 3, diagram_type: 'a', diagram_name: 'A', diagram_color: '#a' },
        { employee_id: 'e1', year: 2026, month: 3, day: 1, diagram_type: 'a', diagram_name: 'A', diagram_color: '#a' },
      ],
      operationDays: new Set(),
      newNoveltyForDay: novelty('Trabajo', '#00ff00'),
    });
    expect(result.map((c) => `${c.employee_id}:${c.date_formatted}`)).toEqual([
      'e1:2026-03-01',
      'e1:2026-03-03',
      'e2:2026-03-01',
    ]);
  });
});

describe('normalizeProcessingResult', () => {
  const baseSummary = {
    total_employees: 1,
    processed_employees: 1,
    total_days: 2,
    processed_days: 2,
    created_records: 1,
    updated_records: 1,
    skipped_records: 0,
    errors_count: null,
    processing_time_seconds: 0.01,
    start_time: '2026-03-01T10:00:00',
    end_time: '2026-03-01T10:00:00.01',
  };

  it('acepta el JSON de process_massive_diagram_creation_v2 y convierte los errores (texto) a registros', () => {
    const raw = {
      success: true,
      summary: { ...baseSummary, errors_count: 1 },
      data: {
        created: [
          {
            employee_id: 'e1',
            employee_name: 'Ana Pérez',
            date: '2026-03-01',
            day: 1,
            month: 3,
            year: 2026,
            is_active: true,
            novelty_name: 'Trabajo',
            novelty_color: '#00ff00',
          },
        ],
        updated: [
          {
            employee_id: 'e1',
            employee_name: 'Ana Pérez',
            date: '2026-03-02',
            day: 2,
            month: 3,
            year: 2026,
            is_active: false,
            novelty_name: 'Franco',
            novelty_color: '#ff0000',
            previous_novelty_name: 'Trabajo',
            previous_novelty_color: '#00ff00',
          },
        ],
      },
      details: {
        date_range: { from: '2026-03-01', to: '2026-03-02' },
        work_diagram: { id: 'wd', name: '4x4', active_days: 4, inactive_days: 4, cycle_length: 8 },
        active_novelty: { id: 'a', name: 'Trabajo', color: '#00ff00' },
        inactive_novelty: { id: 'i', name: 'Franco', color: '#ff0000' },
        conflict_resolution: 'update',
        employee_ids: ['e1'],
      },
      errors: ['Empleado con ID e9 no encontrado'],
    };

    const result = normalizeProcessingResult(raw);

    expect(result.success).toBe(true);
    expect(result.summary.created_records).toBe(1);
    expect(result.data.created[0].novelty_name).toBe('Trabajo');
    expect(result.data.updated[0].previous_novelty_name).toBe('Trabajo');
    expect(result.details.work_diagram?.cycle_length).toBe(8);
    expect(result.errors).toEqual([
      {
        employee_id: '',
        employee_name: 'N/A',
        date: null,
        error_type: 'PROCESSING_ERROR',
        error_message: 'Empleado con ID e9 no encontrado',
      },
    ]);
  });

  it('acepta el JSON de process_massive_novelty_creation (mode novelty, sin work_diagram)', () => {
    const result = normalizeProcessingResult({
      success: true,
      summary: baseSummary,
      data: { created: [], updated: [] },
      details: {
        date_range: { from: '2026-03-01', to: '2026-03-02' },
        mode: 'novelty',
        novelty: { id: 'n', name: 'Vacaciones', color: '#0000ff' },
        conflict_resolution: 'update',
        employee_ids: ['e1'],
      },
      errors: null,
    });
    expect(result.details.mode).toBe('novelty');
    expect(result.details.novelty?.name).toBe('Vacaciones');
    expect(result.errors).toEqual([]);
  });

  it('success=false lanza con el mensaje de la función SQL', () => {
    expect(() =>
      normalizeProcessingResult({ success: false, error: 'Diagrama de trabajo no encontrado o inactivo' })
    ).toThrow('Diagrama de trabajo no encontrado o inactivo');
  });

  it('una respuesta con forma desconocida lanza (no se pasa basura a la UI)', () => {
    expect(() => normalizeProcessingResult({ success: true })).toThrow();
    expect(() => normalizeProcessingResult(null)).toThrow();
  });
});
