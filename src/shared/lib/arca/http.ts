import https from 'node:https';
import { ArcaProtocolError, ArcaTransportError } from './errors.ts';

/**
 * POST SOAP sobre `node:https` (no `fetch`): permite bajar el nivel de seguridad de OpenSSL solo
 * para los hosts de ARCA, cuyos servidores históricamente negocian parámetros DH que OpenSSL 3
 * rechaza con el nivel por defecto (`dh key too small`).
 *
 * Distingue si el pedido llegó a enviarse completo (`sent`): un error ANTES de eso significa que
 * ARCA no lo procesó; uno DESPUÉS deja el resultado desconocido.
 */

export type SoapCallInfo = {
  url: string;
  soapAction: string;
  requestXml: string;
  responseXml: string | null;
  status: number | null;
  durationMs: number;
  error: string | null;
};

export type SoapCallOptions = {
  timeoutMs: number;
  /** Para auditar/loguear la llamada. Recibe el XML tal cual: redactar secretos antes de guardar. */
  onCall?: (info: SoapCallInfo) => void;
};

const ARCA_TLS_CIPHERS = 'DEFAULT@SECLEVEL=1';

export function soapPost(
  url: string,
  soapAction: string,
  requestXml: string,
  { timeoutMs, onCall }: SoapCallOptions
): Promise<{ status: number; body: string }> {
  const startedAt = Date.now();
  const report = (status: number | null, responseXml: string | null, error: string | null) =>
    onCall?.({
      url,
      soapAction,
      requestXml,
      responseXml,
      status,
      durationMs: Date.now() - startedAt,
      error,
    });

  return new Promise((resolve, reject) => {
    let sent = false;
    const payload = Buffer.from(requestXml, 'utf8');

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Content-Length': payload.length,
          SOAPAction: `"${soapAction}"`,
        },
        ciphers: ARCA_TLS_CIPHERS,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('error', (error) => {
          report(res.statusCode ?? null, null, error.message);
          reject(new ArcaTransportError(`Error leyendo la respuesta de ARCA: ${error.message}`, true));
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          const body = Buffer.concat(chunks).toString('utf8');
          // Los Fault SOAP llegan con HTTP 500 y cuerpo XML: los interpreta quien llama.
          const isSoap = body.trimStart().startsWith('<');
          if ((status >= 200 && status < 300) || (status === 500 && isSoap)) {
            report(status, body, null);
            resolve({ status, body });
            return;
          }
          report(status, body, `HTTP ${status}`);
          reject(new ArcaProtocolError(`ARCA respondió HTTP ${status}`, status));
        });
      }
    );

    req.on('finish', () => {
      sent = true;
    });
    req.on('timeout', () => {
      req.destroy(new Error(`timeout de ${timeoutMs} ms`));
    });
    req.on('error', (error) => {
      report(null, null, error.message);
      reject(new ArcaTransportError(`No se pudo comunicar con ARCA: ${error.message}`, sent));
    });

    req.end(payload);
  });
}

/**
 * Reintenta solo operaciones idempotentes (consultas) ante fallas de transporte o protocolo.
 * La solicitud de CAE NUNCA pasa por acá.
 */
export async function withReadRetries<T>(fn: () => Promise<T>, delaysMs: number[] = [500, 1500]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = error instanceof ArcaTransportError || error instanceof ArcaProtocolError;
      if (!retryable || attempt >= delaysMs.length) throw error;
      await new Promise((r) => setTimeout(r, delaysMs[attempt]));
    }
  }
}
