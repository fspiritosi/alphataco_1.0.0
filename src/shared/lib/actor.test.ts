import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({ prisma: {} }));

import { setActor, withActor, type ActorClient, type ActorTx } from './actor';

const UUID = '2f1e0b4c-1d8a-4a2f-9b6f-0f0a1b2c3d4e';

/** Doble de tx: captura el SQL crudo (`strings` + `values`) que recibe `$executeRaw`. */
function fakeTx() {
  const executed: Array<{ text: string; values: unknown[] }> = [];
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      executed.push({ text: strings.join('$'), values });
      return 1;
    }),
  } as unknown as ActorTx;
  return { tx, executed };
}

function fakeClient(tx: ActorTx) {
  const client = {
    $transaction: vi.fn(async (fn: (tx: ActorTx) => Promise<unknown>) => fn(tx)),
  } as unknown as ActorClient;
  return client;
}

describe('setActor', () => {
  it('emite set_config(app.user_id, <uuid>, true) con el uuid bindeado', async () => {
    const { tx, executed } = fakeTx();
    await setActor(tx, UUID);
    expect(executed).toHaveLength(1);
    expect(executed[0].text).toBe("SELECT set_config('app.user_id', $, true)");
    expect(executed[0].values).toEqual([UUID]);
  });

  it('rechaza un uuid inválido sin ejecutar nada', async () => {
    const { tx, executed } = fakeTx();
    await expect(setActor(tx, "abc'; --")).rejects.toThrow('userId debe ser un uuid');
    await expect(setActor(tx, '')).rejects.toThrow('userId debe ser un uuid');
    expect(executed).toHaveLength(0);
  });
});

describe('withActor', () => {
  it('abre una transacción, setea el actor antes de fn y devuelve el resultado de fn', async () => {
    const { tx, executed } = fakeTx();
    const client = fakeClient(tx);
    const order: string[] = [];

    const result = await withActor(
      UUID,
      async (innerTx) => {
        order.push(`fn:${executed.length}`);
        expect(innerTx).toBe(tx);
        return 'ok';
      },
      client
    );

    expect(result).toBe('ok');
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    // El set_config ya estaba ejecutado cuando corrió fn.
    expect(order).toEqual(['fn:1']);
    expect(executed[0].values).toEqual([UUID]);
  });

  it('con uuid inválido lanza ANTES de abrir la transacción', async () => {
    const { tx } = fakeTx();
    const client = fakeClient(tx);
    const fn = vi.fn(async () => 'nunca');

    await expect(withActor('not-a-uuid', fn, client)).rejects.toThrow('userId debe ser un uuid');
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  it('acepta uuids en mayúsculas', async () => {
    const { tx, executed } = fakeTx();
    await setActor(tx, UUID.toUpperCase());
    expect(executed[0].values).toEqual([UUID.toUpperCase()]);
  });
});
