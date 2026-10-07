import forge from 'node-forge';
import { toArgentinaIsoDateTime } from './dates.ts';
import { arcaEndpoints, WSAA_NAMESPACE, type ArcaEnvironment } from './endpoints.ts';
import { ArcaAuthError, ArcaProtocolError, ArcaTokenUnavailableError } from './errors.ts';
import { soapPost, type SoapCallInfo } from './http.ts';
import { el, parseXml, soapBody, soapFault, text } from './xml.ts';

/**
 * WSAA (autenticación): se firma un Ticket de Requerimiento de Acceso (TRA) con el certificado y
 * la clave del emisor (CMS/PKCS#7 SignedData) y ARCA devuelve un ticket (token + sign) válido por
 * ~12 h para un servicio (`wsfe`).
 *
 * WSAA NO entrega un ticket nuevo mientras haya otro vigente para el mismo certificado y servicio
 * (`coe.alreadyAuthenticated`): quien llame a `requestAccessTicket` debe persistir el resultado
 * antes de usarlo y reutilizarlo hasta que venza.
 */

export type AccessTicket = {
  token: string;
  sign: string;
  generatedAt: Date;
  expiresAt: Date;
};

/** Tolerancia de reloj: ARCA rechaza un TRA con `generationTime` en el futuro. */
const CLOCK_SKEW_MS = 10 * 60 * 1000;

export function buildTra(service: string, now: Date): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<loginTicketRequest version="1.0"><header>' +
    el('uniqueId', Math.floor(now.getTime() / 1000)) +
    el('generationTime', toArgentinaIsoDateTime(new Date(now.getTime() - CLOCK_SKEW_MS))) +
    el('expirationTime', toArgentinaIsoDateTime(new Date(now.getTime() + CLOCK_SKEW_MS))) +
    '</header>' +
    el('service', service) +
    '</loginTicketRequest>'
  );
}

/** CMS SignedData (contenido incluido) en base64 DER, que es lo que espera `loginCms`. */
export function signTra(tra: string, certificatePem: string, privateKeyPem: string): string {
  const certificate = forge.pki.certificateFromPem(certificatePem);
  const signed = forge.pkcs7.createSignedData();
  signed.content = forge.util.createBuffer(tra, 'utf8');
  signed.addCertificate(certificate);
  signed.addSigner({
    key: forge.pki.privateKeyFromPem(privateKeyPem),
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime },
    ],
  });
  signed.sign();
  return forge.util.encode64(forge.asn1.toDer(signed.toAsn1()).getBytes());
}

export async function requestAccessTicket(input: {
  env: ArcaEnvironment;
  service: string;
  certificatePem: string;
  privateKeyPem: string;
  now: Date;
  timeoutMs?: number;
  onCall?: (info: SoapCallInfo) => void;
}): Promise<AccessTicket> {
  const cms = signTra(buildTra(input.service, input.now), input.certificatePem, input.privateKeyPem);
  const envelope =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="${WSAA_NAMESPACE}">` +
    '<soapenv:Header/><soapenv:Body><wsaa:loginCms>' +
    el('wsaa:in0', cms) +
    '</wsaa:loginCms></soapenv:Body></soapenv:Envelope>';

  const { body } = await soapPost(arcaEndpoints(input.env).wsaa, '', envelope, {
    timeoutMs: input.timeoutMs ?? 20_000,
    onCall: input.onCall,
  });

  const soap = soapBody(body);
  const fault = soapFault(soap);
  if (fault) {
    if (fault.code.includes('alreadyAuthenticated')) {
      throw new ArcaTokenUnavailableError(
        'ARCA ya entregó un ticket de acceso vigente para este certificado y no está guardado. ' +
          'Hay que esperar a que venza (hasta 12 horas) para pedir uno nuevo.'
      );
    }
    throw new ArcaAuthError(fault.code, fault.message);
  }

  const loginReturn = text(soap, 'loginCmsResponse', 'loginCmsReturn');
  if (!loginReturn) throw new ArcaProtocolError('WSAA respondió sin loginCmsReturn', null);

  const ticket = parseXml(loginReturn);
  const token = text(ticket, 'loginTicketResponse', 'credentials', 'token');
  const sign = text(ticket, 'loginTicketResponse', 'credentials', 'sign');
  const generation = text(ticket, 'loginTicketResponse', 'header', 'generationTime');
  const expiration = text(ticket, 'loginTicketResponse', 'header', 'expirationTime');
  if (!token || !sign || !expiration) {
    throw new ArcaProtocolError('WSAA respondió un ticket incompleto', null);
  }

  return {
    token,
    sign,
    generatedAt: generation ? new Date(generation) : input.now,
    expiresAt: new Date(expiration),
  };
}
