import { describe, expect, it } from 'vitest';
import { covenantScope, guildReadScope, guildWriteScope } from './cct-scope';

const COMPANY = '11111111-1111-1111-1111-111111111111';

describe('guildReadScope / guildWriteScope', () => {
  it('la lectura de sindicatos incluye los globales', () => {
    expect(guildReadScope(COMPANY)).toEqual({ OR: [{ company_id: null }, { company_id: COMPANY }] });
  });

  it('la escritura de sindicatos nunca alcanza a los globales', () => {
    expect(guildWriteScope(COMPANY)).toEqual({ company_id: COMPANY });
    expect(guildWriteScope(COMPANY)).not.toHaveProperty('OR');
  });
});

describe('covenantScope', () => {
  it('los convenios siempre son de una empresa (company_id NOT NULL)', () => {
    expect(covenantScope(COMPANY)).toEqual({ company_id: COMPANY });
  });
});
