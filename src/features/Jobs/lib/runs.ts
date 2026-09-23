import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { JobName } from './types';

/**
 * Bitácora y candado de idempotencia de los jobs, sobre `jobs_runs`.
 *
 * **El problema.** El cron puede reintentar, el contenedor puede reiniciarse y cualquiera con
 * el token puede llamar el endpoint a mano. Correr un job dos veces el mismo día no puede
 * mandar el correo dos veces.
 *
 * **La solución.** Antes de trabajar, el job "reclama" la corrida con un
 * `INSERT ... ON CONFLICT (job, run_key) DO UPDATE ... WHERE <la anterior falló o quedó
 * colgada> RETURNING id`. La unique de la base hace de candado: si el `RETURNING` no devuelve
 * fila, otra corrida ya hizo ese trabajo y este job la saltea. Es atómico —una sola sentencia,
 * sin lectura previa— así que dos corridas simultáneas no pueden reclamar la misma clave.
 *
 * **El grano es la empresa**, no la corrida: `run_key` es `<company_id>:<fecha AR>`. Si la
 * empresa A se envió bien y la B falló, el reintento sólo vuelve a procesar B. Con una clave
 * por corrida, el reintento habría reenviado el correo de A.
 *
 * **Reintentos.** Una fila en `error` se puede volver a reclamar (el `DO UPDATE` la pisa). Una
 * en `running` también, pero sólo pasada una hora: sin eso, un proceso que muere a mitad de
 * camino dejaría la clave trabada para siempre.
 *
 * Nota: `jobs_runs` NO es un registro de correos enviados (`sent_emails`), que el usuario
 * decidió no reponer. Es la bitácora del job; guarda cuántos destinatarios y si hubo envío,
 * no el contenido ni las direcciones.
 */
const STALE_RUN_MINUTES = 60;

export interface ClaimedRun {
  id: string;
  /** Intento número N para esa clave. 1 = primera vez. */
  attempts: number;
}

/**
 * Intenta tomar la corrida `(job, runKey)`. Devuelve `null` si ya la hizo (o la está
 * haciendo) otra corrida.
 */
export async function claimRun(params: {
  job: JobName;
  runKey: string;
  companyId?: string | null;
  client?: Pick<Prisma.TransactionClient, '$queryRaw'>;
}): Promise<ClaimedRun | null> {
  const client = params.client ?? prisma;
  const companyId = params.companyId ?? null;

  const rows = await client.$queryRaw<Array<{ id: string; attempts: number }>>(Prisma.sql`
    INSERT INTO public.jobs_runs (job, run_key, company_id, status, started_at, attempts)
    VALUES (${params.job}, ${params.runKey}, ${companyId}::uuid, 'running', NOW(), 1)
    ON CONFLICT (job, run_key) DO UPDATE
      SET status = 'running',
          started_at = NOW(),
          finished_at = NULL,
          error = NULL,
          attempts = public.jobs_runs.attempts + 1
      WHERE public.jobs_runs.status = 'error'
         OR (public.jobs_runs.status = 'running'
             AND public.jobs_runs.started_at < NOW() - ${`${STALE_RUN_MINUTES} minutes`}::interval)
    RETURNING id, attempts
  `);

  const row = rows[0];
  return row ? { id: row.id, attempts: Number(row.attempts) } : null;
}

/** Cierra una corrida reclamada. `error` deja la clave libre para el próximo intento. */
export async function finishRun(params: {
  id: string;
  status: 'ok' | 'error';
  metadata?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  await prisma.jobs_runs.update({
    where: { id: params.id },
    data: {
      status: params.status,
      finished_at: new Date(),
      // El mensaje puede traer un stack entero; se recorta para no inflar la tabla.
      error: params.error ? params.error.slice(0, 2000) : null,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

/** Última corrida registrada de un job. Para diagnóstico y para los tests. */
export async function lastRun(job: JobName, runKey: string) {
  return prisma.jobs_runs.findUnique({ where: { job_run_key: { job, run_key: runKey } } });
}
