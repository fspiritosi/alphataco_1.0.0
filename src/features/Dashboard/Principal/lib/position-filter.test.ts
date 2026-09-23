import { describe, expect, it } from 'vitest';
import { positionFilter, sanitizePositionIds } from './position-filter';

const VALID = '3c54a757-162c-4afc-8ea5-dca462f92e0c';
const OTHER = 'be4119b0-1111-4222-8333-444444444444';

describe('sanitizePositionIds', () => {
  it('sin filtro devuelve undefined', () => {
    expect(sanitizePositionIds(undefined)).toBeUndefined();
    expect(sanitizePositionIds([])).toBeUndefined();
  });

  it('conserva los uuid válidos', () => {
    expect(sanitizePositionIds([VALID, OTHER])).toEqual([VALID, OTHER]);
  });

  it('descarta lo que no es uuid', () => {
    expect(sanitizePositionIds([VALID, 'basura', "' OR 1=1--"])).toEqual([VALID]);
  });

  it('falla CERRADO: si vinieron ids y ninguno sirve, devuelve [] y no undefined', () => {
    expect(sanitizePositionIds(['basura'])).toEqual([]);
    expect(sanitizePositionIds(['basura'])).not.toBeUndefined();
  });
});

describe('positionFilter', () => {
  it('sin filtro no agrega condición', () => {
    expect(positionFilter(undefined)).toEqual({});
  });

  it('con ids acota por puesto', () => {
    expect(positionFilter([VALID])).toEqual({ company_position: { in: [VALID] } });
  });

  it('con la lista vacía deja una condición que no matchea nada', () => {
    expect(positionFilter([])).toEqual({ company_position: { in: [] } });
  });
});
