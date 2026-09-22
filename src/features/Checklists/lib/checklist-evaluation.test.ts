import { describe, expect, it } from 'vitest';
import {
  buildAnswersBySection,
  collectItemObservations,
  computeDeviations,
  getSectionCode,
  isSideValidationItem,
  type ChecklistEvaluationSection,
} from './checklist-evaluation';

const section = (
  code: string,
  items: Array<Partial<ChecklistEvaluationSection['checklist_template_items'][number]>>
): ChecklistEvaluationSection => ({
  id: `sec-${code}`,
  code,
  section: null,
  checklist_template_items: items.map((item, index) => ({
    id: `item-${code}-${index}`,
    code: item.code ?? `i${index}`,
    label: item.label ?? `Item ${index}`,
    is_critical: item.is_critical ?? false,
    input_type: item.input_type ?? 'radio',
    requires_side_validation: item.requires_side_validation ?? false,
  })),
});

describe('getSectionCode', () => {
  it('usa el code propio, después el de la sección reusable y por último el id', () => {
    expect(getSectionCode({ id: 'a', code: 'LUCES', section: { code: 'GEN' }, checklist_template_items: [] })).toBe(
      'LUCES'
    );
    expect(getSectionCode({ id: 'a', code: null, section: { code: 'GEN' }, checklist_template_items: [] })).toBe('GEN');
    expect(getSectionCode({ id: 'a', code: null, section: null, checklist_template_items: [] })).toBe('section_a');
  });
});

describe('isSideValidationItem', () => {
  it('trata como doble lado los items double_side o con requires_side_validation', () => {
    expect(isSideValidationItem({ id: '1', code: 'c', label: 'l', input_type: 'double_side' })).toBe(true);
    expect(isSideValidationItem({ id: '1', code: 'c', label: 'l', requires_side_validation: true })).toBe(true);
    expect(isSideValidationItem({ id: '1', code: 'c', label: 'l', input_type: 'radio' })).toBe(false);
  });

  it('nunca trata una fecha como doble lado, aunque la plantilla lo pida', () => {
    expect(isSideValidationItem({ id: '1', code: 'c', label: 'l', input_type: 'date', requires_side_validation: true }))
      .toBe(false);
  });
});

describe('computeDeviations', () => {
  const sections = [
    section('LUCES', [
      { code: 'baja', label: 'Luz baja', is_critical: true },
      { code: 'alta', label: 'Luz alta' },
    ]),
  ];

  it('marca desvío en los items con "M" y respeta la criticidad de la plantilla', () => {
    const deviations = computeDeviations({ LUCES__baja: 'M', LUCES__alta: 'B' }, { sections });

    expect(deviations).toEqual([
      {
        item_code: 'baja',
        item_label: 'Luz baja',
        section_code: 'LUCES',
        is_critical: true,
        is_hitch: false,
      },
    ]);
  });

  it('no genera desvío con "B" ni con "NA"', () => {
    expect(computeDeviations({ LUCES__baja: 'NA', LUCES__alta: 'B' }, { sections })).toEqual([]);
  });

  it('acepta el formato booleano legacy (false y "false" son falla)', () => {
    const deviations = computeDeviations({ LUCES__baja: false, LUCES__alta: 'false' }, { sections });
    expect(deviations.map((d) => d.item_code)).toEqual(['baja', 'alta']);
  });

  it('marca desvío si falla cualquiera de los dos lados de un item de doble lado', () => {
    const sideSections = [section('NEUM', [{ code: 'del', label: 'Neumáticos', input_type: 'double_side' }])];

    expect(computeDeviations({ NEUM__del_left: 'M', NEUM__del_right: 'B' }, { sections: sideSections })).toHaveLength(1);
    expect(computeDeviations({ NEUM__del_left: 'B', NEUM__del_right: 'M' }, { sections: sideSections })).toHaveLength(1);
    expect(computeDeviations({ NEUM__del_left: 'B', NEUM__del_right: 'B' }, { sections: sideSections })).toHaveLength(0);
  });

  it('copia la observación del operario como driver_comment del desvío', () => {
    const deviations = computeDeviations({ LUCES__baja: 'M', LUCES__baja__obs: '  se quemó  ' }, { sections });
    expect(deviations[0].driver_comment).toBe('se quemó');
  });

  it('ignora una observación en blanco', () => {
    const deviations = computeDeviations({ LUCES__baja: 'M', LUCES__baja__obs: '   ' }, { sections });
    expect(deviations[0]).not.toHaveProperty('driver_comment');
  });

  it('una observación que dice "M" no genera desvío por sí sola', () => {
    expect(computeDeviations({ LUCES__baja: 'B', LUCES__baja__obs: 'M' }, { sections })).toEqual([]);
  });

  it('imputa al enganche los desvíos de las secciones del acoplado', () => {
    const mixed = [
      section('LUCES', [{ code: 'baja', label: 'Luz baja' }]),
      section('ENGANCHE', [{ code: 'perno', label: 'Perno' }]),
    ];

    const deviations = computeDeviations(
      { LUCES__baja: 'M', ENGANCHE__perno: 'M' },
      { sections: mixed, hitchSectionCodes: new Set(['ENGANCHE']) }
    );

    expect(deviations.map((d) => [d.item_code, d.is_hitch])).toEqual([
      ['baja', false],
      ['perno', true],
    ]);
  });

  it('usa el id del item como código cuando la plantilla no lo define', () => {
    const noCode: ChecklistEvaluationSection = {
      id: 'sec',
      code: 'S',
      section: null,
      checklist_template_items: [{ id: 'abc', code: null, label: 'Sin código' }],
    };
    const deviations = computeDeviations({ S__item_abc: 'M' }, { sections: [noCode] });
    expect(deviations[0].item_code).toBe('item_abc');
  });
});

describe('buildAnswersBySection', () => {
  it('agrupa las respuestas por sección y anida los lados de los items de doble lado', () => {
    const sections = [
      section('LUCES', [{ code: 'baja', label: 'Luz baja' }]),
      section('NEUM', [{ code: 'del', label: 'Neumáticos', input_type: 'double_side' }]),
    ];

    expect(
      buildAnswersBySection({ LUCES__baja: 'B', NEUM__del_left: 'M', NEUM__del_right: 'B' }, sections)
    ).toEqual({
      LUCES: { baja: 'B' },
      NEUM: { del: { left: 'M', right: 'B' } },
    });
  });
});

describe('collectItemObservations', () => {
  it('devuelve las observaciones no vacías indexadas por seccion__item', () => {
    const sections = [
      section('LUCES', [
        { code: 'baja', label: 'Luz baja' },
        { code: 'alta', label: 'Luz alta' },
      ]),
    ];

    expect(
      collectItemObservations({ LUCES__baja__obs: '  rota ', LUCES__alta__obs: '  ' }, sections)
    ).toEqual({ LUCES__baja: 'rota' });
  });
});
