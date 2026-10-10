import { describe, expect, it } from 'vitest';
import { computeWithholding, type WithholdingInput, type WithholdingRegime } from './withholdings';

const regime = (over: Partial<WithholdingRegime> = {}): WithholdingRegime => ({
  id: 'r1',
  code: '078',
  description: 'Enajenación de bienes muebles',
  rateRegistered: '2',
  rateUnregistered: '10',
  monthlyExemptAmount: '224000',
  minimumWithholding: '240',
  scale: null,
  vatPercentage: null,
  isActive: true,
  ...over,
});

const input = (over: Partial<WithholdingInput> = {}): WithholdingInput => ({
  tax: 'GANANCIAS',
  date: '2026-10-15',
  regime: regime(),
  profile: { status: 'SUBJECT', rate: null, exclusion: null },
  netBase: '500000.00',
  vatBase: '105000.00',
  supplierIsRegistered: true,
  month: { previousBase: '0.00', previousWithheld: '0.00' },
  ...over,
});

describe('Ganancias', () => {
  it('inscripto: (acumulado − minimo no sujeto) × alicuota', () => {
    const result = computeWithholding(input());
    // (500000 − 224000) × 2 % = 5520
    expect(result).toMatchObject({ amount: '5520.00', base: '500000.00', rate: '2', regimeId: 'r1' });
    expect(result?.detail).toContain('mínimo no sujeto');
  });

  it('segundo pago del mes: suma el acumulado y descuenta lo retenido', () => {
    const result = computeWithholding(input({ netBase: '100000.00', month: { previousBase: '500000.00', previousWithheld: '5520.00' } }));
    // (600000 − 224000) × 2 % − 5520 = 2000
    expect(result?.amount).toBe('2000.00');
  });

  it('por debajo del minimo no sujeto: no retiene', () => {
    expect(computeWithholding(input({ netBase: '200000.00' }))).toBeNull();
  });

  it('por debajo del minimo de retencion: no retiene', () => {
    // (234000 − 224000) × 2 % = 200 < 240
    expect(computeWithholding(input({ netBase: '234000.00' }))).toBeNull();
  });

  it('no inscripto: alicuota de no inscripto, sin minimo', () => {
    expect(computeWithholding(input({ netBase: '50000.00', profile: { status: 'NOT_REGISTERED', rate: null, exclusion: null } }))?.amount).toBe(
      '5000.00'
    );
  });

  it('escala de honorarios', () => {
    const scale = [
      { from: '0', to: '8000', fixed: '0', rate: '5' },
      { from: '8000', to: '16000', fixed: '400', rate: '9' },
      { from: '16000', to: null, fixed: '1120', rate: '12' },
    ];
    const result = computeWithholding(
      input({ regime: regime({ code: '116', monthlyExemptAmount: '10000', minimumWithholding: '0', scale }), netBase: '30000.00' })
    );
    // gravado 20000: 1120 + (20000 − 16000) × 12 % = 1600
    expect(result?.amount).toBe('1600.00');
  });

  it('exento o sin perfil: no retiene', () => {
    expect(computeWithholding(input({ profile: { status: 'EXEMPT', rate: null, exclusion: null } }))).toBeNull();
    expect(computeWithholding(input({ profile: null }))).toBeNull();
    expect(computeWithholding(input({ regime: regime({ isActive: false }) }))).toBeNull();
  });

  it('exclusion parcial vigente reduce; total no retiene; vencida no cuenta', () => {
    const exclusion = (percentage: string, to: string) => ({ percentage, from: '2026-01-01', to });
    expect(computeWithholding(input({ profile: { status: 'SUBJECT', rate: null, exclusion: exclusion('50', '2026-12-31') } }))?.amount).toBe(
      '2760.00'
    );
    expect(computeWithholding(input({ profile: { status: 'SUBJECT', rate: null, exclusion: exclusion('100', '2026-12-31') } }))).toBeNull();
    expect(computeWithholding(input({ profile: { status: 'SUBJECT', rate: null, exclusion: exclusion('100', '2026-09-30') } }))?.amount).toBe(
      '5520.00'
    );
  });

  it('exclusion parcial con un pago previo en el mes: excluye el impuesto del acumulado antes de restar lo retenido', () => {
    const exclusion = { percentage: '50', from: '2026-01-01', to: '2026-12-31' };
    // 1er pago: (500000 − 224000) × 2 % = 5520 × 50 % = 2760. 2do: (1000000 − 224000) × 2 % = 15520 × 50 % = 7760 − 2760 = 5000.
    const second = computeWithholding(
      input({ profile: { status: 'SUBJECT', rate: null, exclusion }, month: { previousBase: '500000.00', previousWithheld: '2760.00' } })
    );
    expect(second?.amount).toBe('5000.00');
    expect(second?.exclusionPercentage).toBe('50');
  });

  it('informa la exclusion aplicada solo si estaba vigente', () => {
    const vigente = computeWithholding(input({ profile: { status: 'SUBJECT', rate: null, exclusion: { percentage: '50', from: '2026-01-01', to: '2026-12-31' } } }));
    const vencida = computeWithholding(input({ profile: { status: 'SUBJECT', rate: null, exclusion: { percentage: '50', from: '2026-01-01', to: '2026-09-30' } } }));
    expect(vigente?.exclusionPercentage).toBe('50');
    expect(vencida?.exclusionPercentage).toBeNull();
  });
});

describe('IVA', () => {
  const iva = (over: Partial<WithholdingInput> = {}) =>
    input({ tax: 'IVA', regime: regime({ code: '499', vatPercentage: '50', monthlyExemptAmount: '0', minimumWithholding: '0' }), ...over });

  it('porcentaje del IVA de lo pagado', () => {
    expect(computeWithholding(iva())).toMatchObject({ amount: '52500.00', base: '105000.00', rate: '50' });
  });

  it('solo a responsables inscriptos', () => {
    expect(computeWithholding(iva({ supplierIsRegistered: false }))).toBeNull();
  });
});

describe('IIBB y SUSS', () => {
  it('IIBB: alicuota del padron del proveedor, o la del regimen', () => {
    const iibb = (rate: string | null) =>
      input({
        tax: 'IIBB',
        regime: regime({ code: '001', rateRegistered: '2.5', monthlyExemptAmount: '0', minimumWithholding: '0' }),
        profile: { status: 'SUBJECT', rate, exclusion: null },
        netBase: '100000.00',
      });
    expect(computeWithholding(iibb('1.75'))?.amount).toBe('1750.00');
    expect(computeWithholding(iibb(null))?.amount).toBe('2500.00');
  });

  it('SUSS: alicuota del regimen', () => {
    expect(
      computeWithholding(
        input({ tax: 'SUSS', regime: regime({ code: '755', rateRegistered: '6', monthlyExemptAmount: '0', minimumWithholding: '0' }), netBase: '10000.00' })
      )?.amount
    ).toBe('600.00');
  });
});
