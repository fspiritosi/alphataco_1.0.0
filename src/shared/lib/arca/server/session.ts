import 'server-only';
import type { arca_environment } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { isProductionAllowed } from '../endpoints';
import { ArcaConfigError } from '../errors';
import type { SoapCallInfo } from '../http';
import { redactArcaXml } from '../redact';
import { decryptSecret, encryptSecret } from '../secrets';
import { requestAccessTicket } from '../wsaa';
import type { WsfeAuth, WsfeContext } from '../wsfe';
import { withLease } from './leases';

const logger = new Logger('shared/lib/arca/session');

/** Margen para no usar un ticket que vence a mitad de una operación. */
const TOKEN_SAFETY_MS = 10 * 60 * 1000;

/** Servicios de ARCA con ticket propio de WSAA: facturacion (wsfe) y constatacion (wscdc). */
export type ArcaService = 'wsfe' | 'wscdc';

export type ArcaSession = {
  env: arca_environment;
  credentialId: string;
  ctx: WsfeContext;
  auth: WsfeAuth;
  tokenExpiresAt: Date;
};

/** AAD del cifrado: ata cada secreto a su empresa, ambiente y propósito. */
export function secretAad(companyId: string, env: arca_environment, purpose: 'private_key' | 'token' | 'sign'): string {
  return `arca:${companyId}:${env}:${purpose}`;
}

export function normalizeCompanyCuit(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Registra cada llamada en `arca_call_logs` con los secretos tachados (sin bloquear la operación). */
export function arcaCallRecorder(companyId: string, env: arca_environment, invoiceId?: string) {
  return (info: SoapCallInfo) => {
    const operation = info.soapAction ? (info.soapAction.split('/').pop() ?? info.soapAction) : 'loginCms';
    prisma.arca_call_logs
      .create({
        data: {
          company_id: companyId,
          environment: env,
          operation,
          invoice_id: invoiceId ?? null,
          http_status: info.status,
          duration_ms: info.durationMs,
          error: info.error,
          request_xml: redactArcaXml(info.requestXml),
          response_xml: info.responseXml ? redactArcaXml(info.responseXml) : null,
        },
      })
      .catch((error: unknown) => logger.error('No se pudo registrar la llamada a ARCA', { data: { error, operation } }));
  };
}

/** Certificado activo del ambiente, con la clave privada descifrada (solo en memoria). */
async function loadActiveCredential(companyId: string, env: arca_environment) {
  const credential = await prisma.arca_credentials.findFirst({
    where: { company_id: companyId, environment: env, status: 'activo' },
    select: { id: true, certificate_pem: true, private_key_enc: true, cert_not_after: true },
  });
  const label = env === 'produccion' ? 'producción' : 'homologación';
  if (!credential?.certificate_pem) {
    throw new ArcaConfigError(`No hay un certificado de ${label} cargado. Configuralo en Configuración → Datos fiscales.`);
  }
  if (credential.cert_not_after && credential.cert_not_after <= new Date()) {
    throw new ArcaConfigError(`El certificado de ${label} está vencido. Renovalo en Configuración → Datos fiscales.`);
  }
  return {
    id: credential.id,
    certificatePem: credential.certificate_pem,
    privateKeyPem: decryptSecret(credential.private_key_enc, secretAad(companyId, env, 'private_key')),
  };
}

/**
 * Contexto y credenciales de un servicio de ARCA (WSFE por defecto, o WSCDC) para una empresa y ambiente. Reutiliza el ticket de WSAA
 * guardado; si no hay uno vigente, pide otro con un lease para que dos procesos no lo pidan a la
 * vez (ARCA rechaza el segundo) y lo guarda cifrado ANTES de usarlo.
 */
export async function getArcaSession(
  companyId: string,
  env: arca_environment,
  opts: { invoiceId?: string; service?: ArcaService } = {}
): Promise<ArcaSession> {
  const service = opts.service ?? 'wsfe';
  if (env === 'produccion' && !isProductionAllowed()) {
    throw new ArcaConfigError('Este servidor no está habilitado para emitir en producción (ARCA_ALLOW_PRODUCTION).');
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { company_cuit: true } });
  if (!company) throw new ArcaConfigError('Empresa no encontrada');
  const cuit = normalizeCompanyCuit(company.company_cuit);

  const ctx: WsfeContext = { env, onCall: arcaCallRecorder(companyId, env, opts.invoiceId) };
  const credential = await loadActiveCredential(companyId, env);

  const readCachedToken = async () => {
    const row = await prisma.arca_tokens.findUnique({
      where: { company_id_environment_service: { company_id: companyId, environment: env, service } },
      select: { credential_id: true, token_enc: true, sign_enc: true, expires_at: true },
    });
    if (!row || row.credential_id !== credential.id) return null;
    if (row.expires_at.getTime() - Date.now() <= TOKEN_SAFETY_MS) return null;
    return {
      token: decryptSecret(row.token_enc, secretAad(companyId, env, 'token')),
      sign: decryptSecret(row.sign_enc, secretAad(companyId, env, 'sign')),
      expiresAt: row.expires_at,
    };
  };

  const ticket =
    (await readCachedToken()) ??
    (await withLease(
      `wsaa:${companyId}:${env}:${service}`,
      { ttlMs: 60_000, waitMs: 25_000, busyMessage: 'Otro proceso está autenticando con ARCA. Probá de nuevo en unos segundos.' },
      async () => {
        // Puede haberlo renovado otro proceso mientras esperábamos el lease.
        const cached = await readCachedToken();
        if (cached) return cached;

        const fresh = await requestAccessTicket({
          env,
          service,
          certificatePem: credential.certificatePem,
          privateKeyPem: credential.privateKeyPem,
          now: new Date(),
          onCall: ctx.onCall,
        });
        const data = {
          credential_id: credential.id,
          token_enc: encryptSecret(fresh.token, secretAad(companyId, env, 'token')),
          sign_enc: encryptSecret(fresh.sign, secretAad(companyId, env, 'sign')),
          expires_at: fresh.expiresAt,
        };
        await prisma.arca_tokens.upsert({
          where: { company_id_environment_service: { company_id: companyId, environment: env, service } },
          create: { company_id: companyId, environment: env, service, ...data },
          update: data,
        });
        logger.info('Ticket de WSAA renovado', { data: { companyId, env, service, expiresAt: fresh.expiresAt } });
        return { token: fresh.token, sign: fresh.sign, expiresAt: fresh.expiresAt };
      }
    ));

  return {
    env,
    credentialId: credential.id,
    ctx,
    auth: { token: ticket.token, sign: ticket.sign, cuit },
    tokenExpiresAt: ticket.expiresAt,
  };
}

/** Descarta el ticket guardado (ARCA lo rechazó con 600/601): el próximo uso pide uno nuevo. */
export async function invalidateArcaToken(companyId: string, env: arca_environment, service: ArcaService = 'wsfe'): Promise<void> {
  await prisma.arca_tokens.deleteMany({ where: { company_id: companyId, environment: env, service } });
}
