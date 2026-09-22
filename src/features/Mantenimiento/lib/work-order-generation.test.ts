import { describe, expect, it } from 'vitest';
import {
  buildWorkOrderNumber,
  countItemRepairs,
  groupItemsBySector,
  isEligibleForWorkOrder,
  type GroupableOrderItem,
} from './work-order-generation';

function item(overrides: Partial<GroupableOrderItem> = {}): GroupableOrderItem {
  return {
    id: 'item-1',
    assigned_sector_id: 'sector-a',
    assigned_workshop_id: null,
    is_diagnostico: false,
    is_rejected: false,
    work_order_id: null,
    workshop_sectors: { id: 'sector-a', name: 'Mecánica' },
    workshops: null,
    maintenance_order_item_repair_types: [],
    types_of_repairs: null,
    ...overrides,
  };
}

describe('isEligibleForWorkOrder', () => {
  it('acepta un item con sector asignado, sin OT y no rechazado', () => {
    expect(isEligibleForWorkOrder(item())).toBe(true);
  });

  it('acepta un item externo (sólo taller asignado)', () => {
    expect(
      isEligibleForWorkOrder(item({ assigned_sector_id: null, assigned_workshop_id: 'ws-1' }))
    ).toBe(true);
  });

  it('descarta los items de diagnóstico', () => {
    expect(isEligibleForWorkOrder(item({ is_diagnostico: true }))).toBe(false);
  });

  it('descarta los items rechazados', () => {
    expect(isEligibleForWorkOrder(item({ is_rejected: true }))).toBe(false);
  });

  it('descarta los items sin sector ni taller', () => {
    expect(isEligibleForWorkOrder(item({ assigned_sector_id: null, assigned_workshop_id: null }))).toBe(false);
  });

  it('descarta los items que ya tienen OT generada', () => {
    expect(isEligibleForWorkOrder(item({ work_order_id: 'wo-1' }))).toBe(false);
  });
});

describe('countItemRepairs', () => {
  it('cuenta los tipos de la pivote cuando hay', () => {
    expect(
      countItemRepairs(
        item({
          maintenance_order_item_repair_types: [
            { repair_type_id: 'r1', types_of_repairs: { id: 'r1', name: 'A', autorizable: true } },
            { repair_type_id: 'r2', types_of_repairs: { id: 'r2', name: 'B', autorizable: false } },
          ],
          types_of_repairs: { id: 'legacy', name: 'Legacy', autorizable: true },
        })
      )
    ).toBe(2);
  });

  it('cae al tipo legacy cuando la pivote está vacía', () => {
    expect(countItemRepairs(item({ types_of_repairs: { id: 'legacy', name: 'L', autorizable: true } }))).toBe(1);
  });

  it('devuelve 0 cuando no hay ningún tipo', () => {
    expect(countItemRepairs(item())).toBe(0);
  });
});

describe('groupItemsBySector', () => {
  it('agrupa los items por sector interno', () => {
    const groups = groupItemsBySector([
      item({ id: 'a', assigned_sector_id: 's1', workshop_sectors: { id: 's1', name: 'Mecánica' } }),
      item({ id: 'b', assigned_sector_id: 's1', workshop_sectors: { id: 's1', name: 'Mecánica' } }),
      item({ id: 'c', assigned_sector_id: 's2', workshop_sectors: { id: 's2', name: 'Chapa' } }),
    ]);

    expect([...groups.keys()]).toEqual(['s1', 's2']);
    expect(groups.get('s1')?.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(groups.get('s2')?.sectorName).toBe('Chapa');
    expect(groups.get('s1')?.isExternal).toBe(false);
  });

  it('agrupa los externos por taller, con clave propia', () => {
    const groups = groupItemsBySector([
      item({
        id: 'x',
        assigned_sector_id: null,
        assigned_workshop_id: 'w1',
        workshop_sectors: null,
        workshops: { id: 'w1', name: 'Gomería SRL', type: 'externo' },
      }),
      item({
        id: 'y',
        assigned_sector_id: null,
        assigned_workshop_id: 'w1',
        workshop_sectors: null,
        workshops: { id: 'w1', name: 'Gomería SRL', type: 'externo' },
      }),
    ]);

    expect([...groups.keys()]).toEqual(['ext-w1']);
    const group = groups.get('ext-w1');
    expect(group?.isExternal).toBe(true);
    expect(group?.sectorId).toBe('');
    expect(group?.workshopId).toBe('w1');
    expect(group?.sectorName).toBe('Gomería SRL');
    expect(group?.items).toHaveLength(2);
  });

  it('no mezcla un sector interno con un taller externo que comparten id', () => {
    const groups = groupItemsBySector([
      item({ id: 'a', assigned_sector_id: 'w1', workshop_sectors: { id: 'w1', name: 'Mecánica' } }),
      item({
        id: 'b',
        assigned_sector_id: null,
        assigned_workshop_id: 'w1',
        workshop_sectors: null,
        workshops: { id: 'w1', name: 'Externo', type: 'externo' },
      }),
    ]);

    expect([...groups.keys()].sort()).toEqual(['ext-w1', 'w1']);
  });

  it('filtra los items no elegibles antes de agrupar', () => {
    const groups = groupItemsBySector([
      item({ id: 'ok' }),
      item({ id: 'diag', is_diagnostico: true }),
      item({ id: 'rej', is_rejected: true }),
      item({ id: 'con-ot', work_order_id: 'wo-9' }),
    ]);

    expect(groups.size).toBe(1);
    expect(groups.get('sector-a')?.items.map((i) => i.id)).toEqual(['ok']);
  });

  it('acumula totalRepairs por grupo', () => {
    const groups = groupItemsBySector([
      item({
        id: 'a',
        maintenance_order_item_repair_types: [
          { repair_type_id: 'r1', types_of_repairs: { id: 'r1', name: 'A', autorizable: true } },
        ],
      }),
      item({ id: 'b', types_of_repairs: { id: 'legacy', name: 'L', autorizable: true } }),
    ]);

    expect(groups.get('sector-a')?.totalRepairs).toBe(2);
  });

  it('usa nombres por defecto cuando falta el nombre del sector o del taller', () => {
    const groups = groupItemsBySector([
      item({ id: 'a', workshop_sectors: null }),
      item({ id: 'b', assigned_sector_id: null, assigned_workshop_id: 'w9', workshop_sectors: null, workshops: null }),
    ]);

    expect(groups.get('sector-a')?.sectorName).toBe('Sin nombre');
    expect(groups.get('ext-w9')?.sectorName).toBe('Taller Externo');
  });

  it('devuelve un Map vacío sin items', () => {
    expect(groupItemsBySector([]).size).toBe(0);
  });
});

describe('buildWorkOrderNumber', () => {
  it('arma OT-{EQUIPO}-{SECTOR}-{SECUENCIA} normalizando y paddeando', () => {
    expect(buildWorkOrderNumber({ resourceLabel: 'AB 123 CD', sectorName: 'Mecánica Pesada', sequenceNumber: 42 })).toBe(
      'OT-AB123CD-MECNICAPESAD-000042'
    );
  });

  it('cae a EQUIPO cuando el identificador queda vacío', () => {
    expect(buildWorkOrderNumber({ resourceLabel: '---', sectorName: 'Chapa', sequenceNumber: 1 })).toBe(
      'OT-EQUIPO-CHAPA-000001'
    );
  });

  it('no trunca la secuencia cuando supera los 6 dígitos', () => {
    expect(buildWorkOrderNumber({ resourceLabel: 'X1', sectorName: 'S', sequenceNumber: 1234567 })).toBe(
      'OT-X1-S-1234567'
    );
  });
});
