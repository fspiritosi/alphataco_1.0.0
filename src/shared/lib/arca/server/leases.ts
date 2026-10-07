import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/shared/lib/prisma';
import { ArcaBusyError } from '../errors';

/**
 * Exclusión mutua entre procesos con vencimiento (tabla `arca_locks`). Se usa para lo que abarca
 * llamadas a ARCA, que nunca van dentro de una transacción: pedir el ticket de WSAA y numerar
 * comprobantes. Si el proceso muere con el lease tomado, vence solo.
 */

/** Toma el lease si está libre o vencido. Devuelve el `owner` para liberarlo, o `null`. */
export async function acquireLease(key: string, ttlMs: number): Promise<string | null> {
  const owner = randomUUID();
  const seconds = ttlMs / 1000;
  const rows = await prisma.$queryRaw<{ key: string }[]>`
    INSERT INTO arca_locks (key, owner, locked_until)
    VALUES (${key}, ${owner}, NOW() + make_interval(secs => ${seconds}::double precision))
    ON CONFLICT (key) DO UPDATE
      SET owner = EXCLUDED.owner, locked_until = EXCLUDED.locked_until
      WHERE arca_locks.locked_until < NOW()
    RETURNING key`;
  return rows.length > 0 ? owner : null;
}

export async function releaseLease(key: string, owner: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM arca_locks WHERE key = ${key} AND owner = ${owner}`;
}

/**
 * Ejecuta `fn` con el lease tomado. Si está ocupado, reintenta cada `pollMs` hasta `waitMs`;
 * después lanza `ArcaBusyError` con `busyMessage`.
 */
export async function withLease<T>(
  key: string,
  opts: { ttlMs: number; waitMs: number; pollMs?: number; busyMessage: string },
  fn: () => Promise<T>
): Promise<T> {
  const deadline = Date.now() + opts.waitMs;
  let owner = await acquireLease(key, opts.ttlMs);
  while (!owner) {
    if (Date.now() >= deadline) throw new ArcaBusyError(opts.busyMessage);
    await new Promise((r) => setTimeout(r, opts.pollMs ?? 300));
    owner = await acquireLease(key, opts.ttlMs);
  }
  try {
    return await fn();
  } finally {
    await releaseLease(key, owner);
  }
}
