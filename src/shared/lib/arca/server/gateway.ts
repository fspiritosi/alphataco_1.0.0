import 'server-only';
import { randomInt } from 'node:crypto';
import type { arca_environment } from '@/generated/prisma/enums';
import { prisma } from '@/shared/lib/prisma';
import { argentinaDateOnly, fromArcaDate, toArcaDate } from '../dates';
import { ArcaServiceError, ArcaTransportError } from '../errors';
import {
  consultVoucher,
  feDummy,
  getExchangeRate,
  getLastAuthorized,
  requestCae,
  type CaeRequest,
  type CaeResult,
  type ConsultedVoucher,
  type DummyStatus,
} from '../wsfe';
import { getArcaSession, invalidateArcaToken } from './session';

/**
 * Única puerta de la app hacia ARCA. Dos implementaciones:
 *
 * - **real**: WSAA + WSFEv1 con el certificado de la empresa.
 * - **mock** (`ARCA_MODE=mock`): para demos y desarrollo sin certificado. Simula ARCA contra
 *   nuestra propia base: numera con el último comprobante autorizado del sistema, devuelve un CAE
 *   ficticio y una cotización fija. Los comprobantes que emite quedan con `simulated = true` y
 *   el PDF lo dice. `ARCA_MOCK_SCENARIO=reject|timeout` fuerza un rechazo o un corte de
 *   comunicación para mostrar (y probar) esos estados.
 *
 * La emisión, la reconciliación y la prueba de conexión hablan SOLO con esta interfaz.
 */
export interface ArcaGateway {
  readonly env: arca_environment;
  readonly simulated: boolean;
  /** Vencimiento del ticket de acceso (en mock, un valor simbólico). */
  readonly tokenExpiresAt: Date;
  dummy(): Promise<DummyStatus>;
  lastAuthorized(salesPoint: number, cbteType: number): Promise<number>;
  requestCae(req: CaeRequest): Promise<CaeResult>;
  consult(salesPoint: number, cbteType: number, number: number): Promise<ConsultedVoucher | null>;
  exchangeRate(currencyId: string): Promise<{ rate: string; date: string | undefined }>;
}

export function isArcaMockMode(): boolean {
  return process.env.ARCA_MODE === 'mock';
}

/** Cotizaciones del modo simulado (ARCA real las informa al emitir). */
const MOCK_RATES: Record<string, string> = { DOL: '1450.500000', '060': '1575.250000' };

/** Reintenta una vez si ARCA rechaza el ticket (600/601): descarta el guardado y pide otro. */
async function withTokenRetry<T>(companyId: string, env: arca_environment, run: () => Promise<T>, refresh: () => Promise<void>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof ArcaServiceError) || !error.isInvalidToken) throw error;
    await invalidateArcaToken(companyId, env);
    await refresh();
    return run();
  }
}

async function realGateway(companyId: string, env: arca_environment, invoiceId?: string): Promise<ArcaGateway> {
  let session = await getArcaSession(companyId, env, { invoiceId });
  const refresh = async () => {
    session = await getArcaSession(companyId, env, { invoiceId });
  };
  return {
    env,
    simulated: false,
    get tokenExpiresAt() {
      return session.tokenExpiresAt;
    },
    dummy: () => feDummy(session.ctx),
    lastAuthorized: (salesPoint, cbteType) =>
      withTokenRetry(companyId, env, () => getLastAuthorized(session.ctx, session.auth, salesPoint, cbteType), refresh),
    // La solicitud de CAE no se reintenta acá: el reintento por token lo decide la emisión.
    requestCae: (req) => requestCae(session.ctx, session.auth, req),
    consult: (salesPoint, cbteType, number) =>
      withTokenRetry(companyId, env, () => consultVoucher(session.ctx, session.auth, salesPoint, cbteType, number), refresh),
    exchangeRate: (currencyId) =>
      withTokenRetry(companyId, env, () => getExchangeRate(session.ctx, session.auth, currencyId), refresh),
  };
}

function mockGateway(companyId: string, env: arca_environment): ArcaGateway {
  const scenario = process.env.ARCA_MOCK_SCENARIO;

  const findAuthorized = (salesPoint: number, cbteType: number, number?: number) =>
    prisma.invoices.findFirst({
      where: {
        company_id: companyId,
        environment: env,
        cbte_type: cbteType,
        status: 'autorizada',
        sales_point: { number: salesPoint },
        ...(number !== undefined ? { number } : {}),
      },
      orderBy: { number: 'desc' },
      select: {
        number: true,
        cae: true,
        cae_due_date: true,
        issue_date: true,
        total: true,
        receiver_doc_type: true,
        receiver_doc_number: true,
        arca_currency_id: true,
        exchange_rate: true,
      },
    });

  return {
    env,
    simulated: true,
    tokenExpiresAt: new Date(Date.now() + 12 * 3600 * 1000),
    dummy: async () => ({ appServer: 'OK', dbServer: 'OK', authServer: 'OK' }),
    lastAuthorized: async (salesPoint, cbteType) => (await findAuthorized(salesPoint, cbteType))?.number ?? 0,
    requestCae: async (req) => {
      if (scenario === 'timeout') {
        throw new ArcaTransportError('Simulación: ARCA no respondió (ARCA_MOCK_SCENARIO=timeout)', true);
      }
      if (scenario === 'reject') {
        return {
          result: 'R',
          cae: null,
          caeDueDate: null,
          observations: [],
          errors: [{ code: 10015, message: 'Simulación: el receptor no está inscripto (ARCA_MOCK_SCENARIO=reject)' }],
          events: [],
        };
      }
      const issue = new Date(`${fromArcaDate(req.detail.cbteDate)}T12:00:00Z`);
      const due = new Date(issue.getTime() + 10 * 86_400_000);
      // CAE ficticio de 14 dígitos que empieza en 9: nunca coincide con uno real con el mismo número.
      const cae = `9${String(randomInt(0, 10 ** 6)).padStart(6, '0')}${String(randomInt(0, 10 ** 7)).padStart(7, '0')}`;
      return {
        result: 'A',
        cae,
        caeDueDate: toArcaDate(argentinaDateOnly(due)),
        observations: [],
        errors: [],
        events: [],
      };
    },
    consult: async (salesPoint, cbteType, number) => {
      const found = await findAuthorized(salesPoint, cbteType, number);
      if (!found?.cae || !found.cae_due_date) return null;
      return {
        result: 'A',
        cae: found.cae,
        caeDueDate: toArcaDate(found.cae_due_date.toISOString().slice(0, 10)),
        docType: found.receiver_doc_type,
        docNumber: found.receiver_doc_number.toString(),
        cbteDate: toArcaDate(found.issue_date.toISOString().slice(0, 10)),
        total: found.total.toFixed(2),
        currencyId: found.arca_currency_id,
        exchangeRate: found.exchange_rate.toString(),
        observations: [],
      };
    },
    exchangeRate: async (currencyId) => ({
      rate: MOCK_RATES[currencyId] ?? '1.000000',
      date: toArcaDate(argentinaDateOnly(new Date())),
    }),
  };
}

export async function getArcaGateway(
  companyId: string,
  env: arca_environment,
  opts: { invoiceId?: string } = {}
): Promise<ArcaGateway> {
  return isArcaMockMode() ? mockGateway(companyId, env) : realGateway(companyId, env, opts.invoiceId);
}
