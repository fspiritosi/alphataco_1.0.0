import 'server-only';

import { Logger } from '@/lib/logger';
import { authorizeJobRequest } from './auth';
import type { JobName, JobSummary } from './types';

const logger = new Logger('features/Jobs/handler');

/**
 * Cáscara de los tres endpoints `/api/jobs/*`: autenticar, correr, responder.
 *
 * La lógica vive en `../jobs/<job>.ts` como una función pura con dependencias inyectadas
 * (`runXJob(deps)`), justamente para poder probarla sin HTTP. Acá no hay reglas de negocio.
 *
 * **Códigos de respuesta.** El crontab usa `curl -fsS`, que falla con HTTP >= 400 y deja el
 * error en el log de `crond`. Es el único aviso automático que existe, así que:
 * - 401 si el token falta o no coincide (cuerpo sin detalle).
 * - 500 si el job lanzó, **o si alguna empresa falló**. Un job que procesó 4 de 5 empresas no
 *   es un éxito: devolver 200 lo volvería invisible hasta que alguien note que no llegó un
 *   correo.
 * - 200 sólo si todas las unidades terminaron en `ok` o `skipped`.
 *
 * **No declarar `export const dynamic`**: con `cacheComponents` activado los route handlers ya
 * son dinámicos y declararlo es error de compilación (ver
 * `src/app/api/external/v1/employees/route.ts`).
 */
export function createJobHandler(job: JobName, run: () => Promise<JobSummary>) {
  return async function handleJobRequest(request: Request): Promise<Response> {
    const auth = authorizeJobRequest(request);

    if (auth !== 'ok') {
      // El motivo se loguea, no se responde: quien prueba un token no tiene por qué saber si
      // el servidor tiene alguno configurado.
      logger.warn('Request a un job rechazado', { data: { job, reason: auth } });
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startedAt = Date.now();

    try {
      const summary = await run();
      const durationMs = Date.now() - startedAt;
      const ok = summary.failed === 0;

      logger.info('Job terminado', { data: { job, ok, durationMs, summary } });

      return Response.json({ ok, durationMs, ...summary }, { status: ok ? 200 : 500 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Job abortado', { data: { job, error } });

      // Al cron se le devuelve el mensaje: es un canal interno y sin él el log de `crond`
      // sólo diría "curl: (22) The requested URL returned error: 500".
      return Response.json(
        { ok: false, job, error: message, durationMs: Date.now() - startedAt },
        { status: 500 }
      );
    }
  };
}
