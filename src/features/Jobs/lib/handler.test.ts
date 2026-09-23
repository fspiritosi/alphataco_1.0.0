import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJobHandler } from './handler';
import type { JobSummary, JobUnitOutcome } from './types';

/**
 * El código de respuesta de `/api/jobs/*` es el ÚNICO mecanismo de alerta del sistema: el
 * `Logger` está silenciado salvo `NEXT_PUBLIC_SHOW_LOGS=true`, y lo que el cron ve es el exit
 * code de `curl`. Si el handler devolviera 200 ante un fallo parcial, un job que falla para
 * una empresa sería invisible — exactamente lo que P5 vino a corregir.
 *
 * Este archivo existe porque esa rama no tenía ninguna prueba: el test que decía cubrirla
 * (en `jobs.integration.test.ts`) nunca construía una `Request` ni miraba un `status`.
 */
const TOKEN = 'token-del-handler';

function unit(overrides: Partial<JobUnitOutcome> = {}): JobUnitOutcome {
  return { companyId: null, companyName: 'Empresa', status: 'ok', ...overrides };
}

function summary(overrides: Partial<JobSummary> = {}): JobSummary {
  return {
    job: 'daily-indicators',
    date: '2026-06-15',
    companies: 1,
    processed: 1,
    skipped: 0,
    failed: 0,
    emailsSent: 0,
    recipients: 0,
    units: [unit()],
    ...overrides,
  };
}

function authorized(): Request {
  return new Request('http://localhost:3000/api/jobs/daily-indicators', {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

const ORIGINAL_TOKEN = process.env.JOBS_TOKEN;

describe('createJobHandler', () => {
  beforeEach(() => {
    process.env.JOBS_TOKEN = TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.JOBS_TOKEN;
    else process.env.JOBS_TOKEN = ORIGINAL_TOKEN;
  });

  describe('código de respuesta', () => {
    it('200 cuando ninguna unidad falló', async () => {
      const handler = createJobHandler('daily-indicators', async () => summary({ failed: 0 }));

      const response = await handler(authorized());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, failed: 0 });
    });

    it('500 cuando UNA empresa falló, aunque las demás hayan salido bien', async () => {
      // El caso que importa: 2 de 3 empresas OK. Con 200 el `curl` del cron sale con 0 y
      // nadie se entera de que a una empresa no le llegó el correo.
      const handler = createJobHandler('documents-expiry', async () =>
        summary({
          job: 'documents-expiry',
          companies: 3,
          processed: 2,
          failed: 1,
          emailsSent: 2,
          units: [
            unit({ companyId: 'a', status: 'ok' }),
            unit({ companyId: 'b', status: 'ok' }),
            unit({ companyId: 'c', status: 'error', error: 'boom' }),
          ],
        })
      );

      const response = await handler(authorized());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.failed).toBe(1);
      // El detalle por empresa viaja en el cuerpo: es lo que el crontab imprime con
      // `--fail-with-body`, y sin eso el log de crond sólo diría `curl: (22)`.
      expect(body.units).toHaveLength(3);
      expect(body.units[2]).toMatchObject({ status: 'error', error: 'boom' });
    });

    it('500 y el mensaje del error cuando el job entero lanza', async () => {
      const handler = createJobHandler('daily-report-deviations', async () => {
        throw new Error('la base no responde');
      });

      const response = await handler(authorized());

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({
        ok: false,
        job: 'daily-report-deviations',
        error: 'la base no responde',
      });
    });

    it('un `skipped` no es un fallo: sigue siendo 200', async () => {
      const handler = createJobHandler('documents-expiry', async () =>
        summary({ processed: 0, skipped: 1, failed: 0, units: [unit({ status: 'skipped' })] })
      );

      expect((await handler(authorized())).status).toBe(200);
    });
  });

  describe('autenticación', () => {
    it('401 sin token, y el job NO se ejecuta', async () => {
      const run = vi.fn(async () => summary());
      const handler = createJobHandler('daily-indicators', run);

      const response = await handler(new Request('http://localhost:3000/api/jobs/daily-indicators'));

      expect(response.status).toBe(401);
      expect(run).not.toHaveBeenCalled();
    });

    it('401 con token incorrecto, y el job NO se ejecuta', async () => {
      const run = vi.fn(async () => summary());
      const handler = createJobHandler('daily-indicators', run);

      const response = await handler(
        new Request('http://localhost:3000/api/jobs/daily-indicators', {
          headers: { authorization: `Bearer ${TOKEN}-mal` },
        })
      );

      expect(response.status).toBe(401);
      expect(run).not.toHaveBeenCalled();
      await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('el cuerpo del 401 no dice nada del sistema', async () => {
      const handler = createJobHandler('daily-indicators', async () => summary());
      const response = await handler(
        new Request('http://localhost:3000/api/jobs/daily-indicators', {
          headers: { authorization: 'Bearer cualquiera' },
        })
      );

      const body = await response.text();
      expect(body).toBe(JSON.stringify({ error: 'Unauthorized' }));
      expect(body).not.toContain(TOKEN);
    });
  });
});
