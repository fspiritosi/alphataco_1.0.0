import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Integración real contra el Postgres del compose. Corre sólo con DATABASE_URL definido:
 *   DATABASE_URL=postgresql://alphataco:devpass@127.0.0.1:55432/alphataco npx vitest run src/shared/lib/sql.integration.test.ts
 * El import es dinámico porque `@/shared/lib/prisma` lanza al cargarse sin DATABASE_URL.
 */
describe.skipIf(!process.env.DATABASE_URL)('callFunction (integración)', () => {
  it('select_distinct_values(company, company_name) devuelve filas validadas', async () => {
    const { callFunction } = await import('./sql');
    const rows = await callFunction(
      'select_distinct_values',
      ['company', 'company_name', { json: null }, { json: null }, { json: null }],
      z.array(z.object({ col_value: z.string().nullable(), col_count: z.coerce.number() }))
    );
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(typeof row.col_count).toBe('number');
    }
  });

  it('callScalar devuelve un escalar validado', async () => {
    const { callScalar } = await import('./sql');
    // `app_current_user_id()` devuelve NULL fuera de una transacción con actor.
    const value = await callScalar('app_current_user_id', [], z.string().uuid().nullable());
    expect(value).toBeNull();
  });

  it('rechaza nombres inválidos sin tocar la base', async () => {
    const { callFunction } = await import('./sql');
    await expect(callFunction('company; drop', [], z.array(z.unknown()))).rejects.toThrow(
      'Nombre de función SQL inválido'
    );
  });
});
