import 'server-only';

import { Logger } from '@/lib/logger';
import { claimRun, finishRun } from './runs';
import type { JobName, JobUnitOutcome } from './types';

const logger = new Logger('features/Jobs/per-company');

/** Lo que devuelve el trabajo de una empresa. Se guarda en `jobs_runs.metadata`. */
export interface CompanyWorkResult {
  /** Qué se hizo (o por qué no se hizo nada). Texto corto, va a la respuesta del endpoint. */
  reason?: string;
  recipients?: number;
  emailSent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompanyRef {
  id: string;
  company_name: string;
}

/**
 * Recorre las empresas aplicando el mismo trabajo a cada una, con el ciclo completo de
 * reclamo → trabajo → cierre sobre `jobs_runs`.
 *
 * Es el corazón de las dos garantías que pide P5:
 *
 * - **Idempotencia**: la clave `<companyId>:<fecha>` se reclama antes de trabajar. Si ya se
 *   reclamó hoy y terminó bien, `claimRun` devuelve `null` y la empresa se saltea sin mandar
 *   nada. Correr el endpoint dos veces el mismo día no duplica correos.
 * - **Aislamiento entre empresas**: cada iteración es independiente y tiene su propia fila.
 *   Un error en una empresa no corta el bucle ni contamina a las demás, y sólo esa empresa
 *   queda reintentable. El `work` recibe UNA empresa: no hay ningún punto donde se acumulen
 *   datos de varias.
 *
 * El error se persiste en `jobs_runs` y se propaga al resumen para que el endpoint devuelva
 * 500 — el `Logger` está silenciado salvo `NEXT_PUBLIC_SHOW_LOGS=true`, así que loguear no
 * alcanza como rastro.
 */
export async function runForEachCompany(params: {
  job: JobName;
  date: string;
  companies: readonly CompanyRef[];
  work: (company: CompanyRef) => Promise<CompanyWorkResult>;
}): Promise<JobUnitOutcome[]> {
  const outcomes: JobUnitOutcome[] = [];

  for (const company of params.companies) {
    const runKey = `${company.id}:${params.date}`;
    const claim = await claimRun({ job: params.job, runKey, companyId: company.id });

    if (!claim) {
      outcomes.push({
        companyId: company.id,
        companyName: company.company_name,
        status: 'skipped',
        reason: 'ya procesada hoy',
      });
      continue;
    }

    try {
      const result = await params.work(company);
      const metadata = {
        ...(result.metadata ?? {}),
        reason: result.reason,
        recipients: result.recipients ?? 0,
        emailSent: result.emailSent ?? false,
        attempt: claim.attempts,
      };

      await finishRun({ id: claim.id, status: 'ok', metadata });

      outcomes.push({
        companyId: company.id,
        companyName: company.company_name,
        status: 'ok',
        reason: result.reason,
        recipients: result.recipients ?? 0,
        emailSent: result.emailSent ?? false,
        metadata: result.metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Falló el job para una empresa', {
        data: { job: params.job, companyId: company.id, error },
      });

      await finishRun({ id: claim.id, status: 'error', error: message, metadata: { attempt: claim.attempts } });

      outcomes.push({
        companyId: company.id,
        companyName: company.company_name,
        status: 'error',
        error: message,
      });
    }
  }

  return outcomes;
}

/**
 * Igual que `runForEachCompany` pero para un paso global (sin empresa), como el mantenimiento
 * de estados del job diario.
 */
export async function runGlobalStep(params: {
  job: JobName;
  runKey: string;
  label: string;
  work: () => Promise<CompanyWorkResult>;
}): Promise<JobUnitOutcome> {
  const claim = await claimRun({ job: params.job, runKey: params.runKey, companyId: null });

  if (!claim) {
    return { companyId: null, companyName: params.label, status: 'skipped', reason: 'ya procesado hoy' };
  }

  try {
    const result = await params.work();
    await finishRun({ id: claim.id, status: 'ok', metadata: { ...(result.metadata ?? {}), attempt: claim.attempts } });
    return {
      companyId: null,
      companyName: params.label,
      status: 'ok',
      reason: result.reason,
      metadata: result.metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Falló un paso global del job', { data: { job: params.job, runKey: params.runKey, error } });
    await finishRun({ id: claim.id, status: 'error', error: message, metadata: { attempt: claim.attempts } });
    return { companyId: null, companyName: params.label, status: 'error', error: message };
  }
}
