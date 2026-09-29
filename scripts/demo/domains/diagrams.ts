/**
 * Novedades de diagrama (`employees_diagram`): un dia por fila, desde hace un año hasta dentro
 * de un mes. Sale del ciclo del diagrama de cada empleado (14x14, 7x7, 6x1, lunes a viernes)
 * con novedades encima: vacaciones, licencias por enfermedad, ART, ausencias, capacitaciones.
 *
 * Hoy siempre tiene ~8% de ausentes (vacaciones, enfermedad, ART) para que el tablero de RRHH
 * y el ausentismo tengan algo que mostrar.
 *
 * Se inserta sin triggers: `trg_employees_diagram_changes` escribiria una fila de
 * `diagrams_logs` por dia y por empleado (~45 mil) que nadie va a mirar.
 */
import { insertMany, withoutTriggers, type Ctx } from '../lib/ctx.ts';
import { demoId } from '../lib/ids.ts';
import { sample } from '../lib/random.ts';
import { WORK_DIAGRAMS, type DiagramKey } from '../data/catalog.ts';
import type { DemoEmployee } from './employees.ts';

export const DIAGRAM_FROM = -365;
export const DIAGRAM_TO = 30;

/** Diagrama resultante: empleado -> offset -> novedad. */
export type DiagramGrid = Map<string, Map<number, DiagramKey>>;

function baseKey(ctx: Ctx, emp: DemoEmployee, offset: number): DiagramKey {
  const def = WORK_DIAGRAMS.find((w) => w.key === emp.diagram)!;
  if ('weekdays' in def && def.weekdays) {
    const wd = ctx.cal.weekday(offset);
    return wd === 0 || wd === 6 ? 'franco' : 'trabajando';
  }
  const cycle = def.on + def.off;
  const pos = (((offset + emp.cycleOffset) % cycle) + cycle) % cycle;
  return pos < def.on ? 'trabajando' : 'franco';
}

export function buildDiagramGrid(ctx: Ctx, employees: DemoEmployee[]): DiagramGrid {
  const { faker } = ctx;
  const grid: DiagramGrid = new Map();
  const active = employees.filter((e) => e.active);
  // Ausentes de hoy, fijos por semilla: siempre hay novedades en el tablero.
  const absentToday = new Map<string, DiagramKey>(
    sample(faker, active, Math.round(active.length * 0.08)).map((e, i) => [
      e.id,
      (['vacaciones', 'vacaciones', 'enfermedad', 'enfermedad', 'accidente', 'estudio', 'ausente', 'capacitacion', 'vacaciones'] as DiagramKey[])[i % 9],
    ])
  );

  for (const emp of employees) {
    const days = new Map<number, DiagramKey>();
    const from = Math.max(DIAGRAM_FROM, emp.admission);
    // Un empleado dado de baja deja de tener diagrama el dia de su baja.
    const to = emp.terminationOffset ?? DIAGRAM_TO;
    for (let o = from; o <= to; o++) days.set(o, baseKey(ctx, emp, o));

    // Las novedades solo pisan dias del diagrama del empleado (nunca antes del ingreso ni
    // despues de la baja); salvo vacaciones, solo reemplazan dias de trabajo.
    const overlay = (start: number, length: number, key: DiagramKey) => {
      for (let o = start; o < start + length; o++) {
        if (days.has(o) && (days.get(o) === 'trabajando' || key === 'vacaciones')) days.set(o, key);
      }
    };
    // Vacaciones anuales: un bloque de 14 dias.
    if (faker.datatype.boolean({ probability: 0.7 })) overlay(faker.number.int({ min: from, max: Math.max(from, -30) }), 14, 'vacaciones');
    // Enfermedad: 0 a 3 episodios de 1 a 4 dias.
    for (let i = faker.number.int({ min: 0, max: 3 }); i > 0; i--) overlay(faker.number.int({ min: from, max: 0 }), faker.number.int({ min: 1, max: 4 }), 'enfermedad');
    // Ausencias sin aviso y examenes: raros.
    if (faker.datatype.boolean({ probability: 0.25 })) overlay(faker.number.int({ min: from, max: 0 }), 1, 'ausente');
    if (faker.datatype.boolean({ probability: 0.15 })) overlay(faker.number.int({ min: from, max: 0 }), 2, 'estudio');
    // Capacitaciones y guardias.
    for (let i = faker.number.int({ min: 0, max: 2 }); i > 0; i--) overlay(faker.number.int({ min: from, max: DIAGRAM_TO }), 1, 'capacitacion');
    if (faker.datatype.boolean({ probability: 0.2 })) {
      const o = faker.number.int({ min: from, max: 0 });
      if (days.get(o) === 'franco') days.set(o, 'guardia');
    }

    const todayKey = absentToday.get(emp.id);
    if (todayKey) {
      const span = todayKey === 'vacaciones' ? 10 : todayKey === 'accidente' ? 15 : 3;
      const start = -faker.number.int({ min: 0, max: span - 1 });
      for (let o = start; o < start + span; o++) if (days.has(o)) days.set(o, todayKey);
    }
    grid.set(emp.id, days);
  }
  return grid;
}

export function isWorking(grid: DiagramGrid, employeeId: string, offset: number): boolean {
  const key = grid.get(employeeId)?.get(offset);
  return key === 'trabajando' || key === 'guardia';
}

export async function seedDiagrams(ctx: Ctx, grid: DiagramGrid): Promise<void> {
  const { tx, cal } = ctx;
  const rows: Array<{ employee_id: string; diagram_type: string; day: number; month: number; year: number; is_active: boolean; created_at: Date }> = [];
  for (const [employeeId, days] of grid) {
    for (const [offset, key] of days) {
      const [y, m, d] = cal.ymd(offset).split('-').map(Number);
      rows.push({
        employee_id: employeeId,
        diagram_type: demoId('diagram_type', key),
        day: d,
        month: m,
        year: y,
        is_active: true,
        created_at: cal.at(Math.min(offset, 0) - 20, 9),
      });
    }
  }
  await withoutTriggers(tx, () => insertMany(rows, (chunk) => tx.employees_diagram.createMany({ data: chunk }), 5000));
  ctx.log(`${rows.length} novedades de diagrama`);
}

