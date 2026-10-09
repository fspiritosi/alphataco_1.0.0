import { toArcaDate } from './dates.ts';
import { arcaEndpoints, WSCDC_NAMESPACE } from './endpoints.ts';
import { ArcaProtocolError, ArcaServiceError, type ArcaMessage } from './errors.ts';
import { soapPost, withReadRetries } from './http.ts';
import { el, messages, pick, soapBody, soapFault, text, type XmlNode } from './xml.ts';
import type { WsfeAuth, WsfeContext } from './wsfe.ts';

/**
 * WSCDC (constatacion de comprobantes): verifica ante ARCA que un comprobante recibido de un
 * proveedor exista con ese CAE, fecha, importe y receptor. El XML va en el orden del WSDL
 * (`ComprobanteConstatar` → `CmpReq`). Requiere un ticket de WSAA del servicio `wscdc`.
 */

export type VoucherCheckRequest = {
  /** CUIT del emisor (el proveedor), solo digitos. */
  issuerCuit: string;
  salesPoint: number;
  cbteType: number;
  number: number;
  /** YYYY-MM-DD */
  issueDate: string;
  /** Total con 2 decimales y punto. */
  total: string;
  cae: string;
  /** CUIT del receptor (la empresa), solo digitos. */
  receiverCuit: string;
};

export type VoucherCheckResult = { result: 'A' | 'R'; observations: ArcaMessage[] };

const CHECK_TIMEOUT_MS = 20_000;
const CUIT_DOC_TYPE = 80;

export function buildConstatarXml(auth: WsfeAuth, req: VoucherCheckRequest): string {
  const inner =
    `<ar:Auth>${el('ar:Token', auth.token)}${el('ar:Sign', auth.sign)}${el('ar:Cuit', auth.cuit)}</ar:Auth>` +
    '<ar:CmpReq>' +
    el('ar:CbteModo', 'CAE') +
    el('ar:CuitEmisor', req.issuerCuit) +
    el('ar:PtoVta', req.salesPoint) +
    el('ar:CbteTipo', req.cbteType) +
    el('ar:CbteNro', req.number) +
    el('ar:CbteFch', toArcaDate(req.issueDate)) +
    el('ar:ImpTotal', req.total) +
    el('ar:CodAutorizacion', req.cae) +
    el('ar:DocTipoReceptor', CUIT_DOC_TYPE) +
    el('ar:DocNroReceptor', req.receiverCuit) +
    '</ar:CmpReq>';
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${WSCDC_NAMESPACE}">` +
    `<soapenv:Header/><soapenv:Body><ar:ComprobanteConstatar>${inner}</ar:ComprobanteConstatar></soapenv:Body></soapenv:Envelope>`
  );
}

/** Interpreta la respuesta. Lanza `ArcaServiceError` si ARCA devolvio `Errors` (p. ej. 600 de ticket). */
export function parseConstatarResponse(body: string): VoucherCheckResult {
  const soap = soapBody(body);
  const fault = soapFault(soap);
  if (fault) throw new ArcaProtocolError(`WSCDC ComprobanteConstatar: ${fault.code} ${fault.message}`, 500);
  const result = pick(soap, 'ComprobanteConstatarResponse', 'ComprobanteConstatarResult');
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ArcaProtocolError('WSCDC ComprobanteConstatar respondió sin resultado', null);
  }
  const node = result as XmlNode;
  const errors = messages(node, 'Errors', 'Err');
  if (errors.length > 0) throw new ArcaServiceError(errors);
  const verdict = text(node, 'Resultado');
  if (verdict !== 'A' && verdict !== 'R') throw new ArcaProtocolError(`WSCDC respondió un resultado desconocido: ${verdict ?? '(vacío)'}`, null);
  return { result: verdict, observations: messages(node, 'Observaciones', 'Obs') };
}

export async function checkVoucher(ctx: WsfeContext, auth: WsfeAuth, req: VoucherCheckRequest): Promise<VoucherCheckResult> {
  const operation = 'ComprobanteConstatar';
  return withReadRetries(async () => {
    const { body } = await soapPost(arcaEndpoints(ctx.env).wscdc, `${WSCDC_NAMESPACE}${operation}`, buildConstatarXml(auth, req), {
      timeoutMs: CHECK_TIMEOUT_MS,
      onCall: ctx.onCall,
    });
    return parseConstatarResponse(body);
  });
}
