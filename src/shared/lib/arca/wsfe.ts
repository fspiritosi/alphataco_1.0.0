import { arcaEndpoints, WSFE_NAMESPACE, type ArcaEnvironment } from './endpoints.ts';
import { ArcaProtocolError, ArcaServiceError, type ArcaMessage } from './errors.ts';
import { soapPost, withReadRetries, type SoapCallInfo } from './http.ts';
import { el, list, messages, pick, soapBody, soapFault, text, type XmlNode } from './xml.ts';

/**
 * WSFEv1 (factura electrónica). El XML se arma a mano en el orden EXACTO del WSDL (verificado
 * contra `wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL`): ARCA rechaza elementos fuera de orden.
 *
 * Los importes viajan como strings con 2 decimales (y la cotización con hasta 6) calculados con
 * Decimal por quien llama: este módulo no hace aritmética.
 */

export type WsfeContext = {
  env: ArcaEnvironment;
  onCall?: (info: SoapCallInfo) => void;
};

export type WsfeAuth = { token: string; sign: string; cuit: string };

const READ_TIMEOUT_MS = 15_000;
const CAE_TIMEOUT_MS = 45_000;

function authXml(auth: WsfeAuth): string {
  return `<ar:Auth>${el('ar:Token', auth.token)}${el('ar:Sign', auth.sign)}${el('ar:Cuit', auth.cuit)}</ar:Auth>`;
}

function envelope(operation: string, inner: string): string {
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${WSFE_NAMESPACE}">` +
    `<soapenv:Header/><soapenv:Body><ar:${operation}>${inner}</ar:${operation}></soapenv:Body></soapenv:Envelope>`
  );
}

/** Ejecuta una operación y devuelve el nodo `<Operation>Result`. */
async function call(ctx: WsfeContext, operation: string, inner: string, timeoutMs: number): Promise<XmlNode> {
  const { body } = await soapPost(arcaEndpoints(ctx.env).wsfe, `${WSFE_NAMESPACE}${operation}`, envelope(operation, inner), {
    timeoutMs,
    onCall: ctx.onCall,
  });
  const soap = soapBody(body);
  const fault = soapFault(soap);
  if (fault) throw new ArcaProtocolError(`WSFE ${operation}: ${fault.code} ${fault.message}`, 500);
  const result = pick(soap, `${operation}Response`, `${operation}Result`);
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ArcaProtocolError(`WSFE ${operation} respondió sin resultado`, null);
  }
  return result;
}

/** Operación de consulta: reintenta ante fallas de red y lanza si ARCA devuelve `Errors`. */
async function query(ctx: WsfeContext, operation: string, inner: string): Promise<XmlNode> {
  const result = await withReadRetries(() => call(ctx, operation, inner, READ_TIMEOUT_MS));
  const errors = messages(result, 'Errors', 'Err');
  if (errors.length > 0) throw new ArcaServiceError(errors);
  return result;
}

// ─── Consultas ────────────────────────────────────────────────────────────────

export type DummyStatus = { appServer: string; dbServer: string; authServer: string };

export async function feDummy(ctx: WsfeContext): Promise<DummyStatus> {
  const result = await withReadRetries(() => call(ctx, 'FEDummy', '', READ_TIMEOUT_MS));
  return {
    appServer: text(result, 'AppServer') ?? '?',
    dbServer: text(result, 'DbServer') ?? '?',
    authServer: text(result, 'AuthServer') ?? '?',
  };
}

export function isDummyOk(status: DummyStatus): boolean {
  return status.appServer === 'OK' && status.dbServer === 'OK' && status.authServer === 'OK';
}

export async function getLastAuthorized(
  ctx: WsfeContext,
  auth: WsfeAuth,
  salesPoint: number,
  cbteType: number
): Promise<number> {
  const result = await query(
    ctx,
    'FECompUltimoAutorizado',
    authXml(auth) + el('ar:PtoVta', salesPoint) + el('ar:CbteTipo', cbteType)
  );
  const number = Number(text(result, 'CbteNro'));
  if (!Number.isInteger(number)) throw new ArcaProtocolError('FECompUltimoAutorizado sin CbteNro', null);
  return number;
}

export type ConsultedVoucher = {
  result: string | undefined;
  cae: string | undefined;
  caeDueDate: string | undefined;
  docType: number;
  docNumber: string | undefined;
  cbteDate: string | undefined;
  total: string | undefined;
  currencyId: string | undefined;
  exchangeRate: string | undefined;
  observations: ArcaMessage[];
};

/** `null` si ARCA no tiene ese comprobante (error 602 "no existen datos"). */
export async function consultVoucher(
  ctx: WsfeContext,
  auth: WsfeAuth,
  salesPoint: number,
  cbteType: number,
  number: number
): Promise<ConsultedVoucher | null> {
  let result: XmlNode;
  try {
    result = await query(
      ctx,
      'FECompConsultar',
      authXml(auth) +
        '<ar:FeCompConsReq>' +
        el('ar:CbteTipo', cbteType) +
        el('ar:CbteNro', number) +
        el('ar:PtoVta', salesPoint) +
        '</ar:FeCompConsReq>'
    );
  } catch (error) {
    if (error instanceof ArcaServiceError && error.errors.some((e) => e.code === 602)) return null;
    throw error;
  }
  const get = pick(result, 'ResultGet');
  return {
    result: text(get, 'Resultado'),
    cae: text(get, 'CodAutorizacion'),
    caeDueDate: text(get, 'FchVto'),
    docType: Number(text(get, 'DocTipo') ?? '0'),
    docNumber: text(get, 'DocNro'),
    cbteDate: text(get, 'CbteFch'),
    total: text(get, 'ImpTotal'),
    currencyId: text(get, 'MonId'),
    exchangeRate: text(get, 'MonCotiz'),
    observations: messages(get, 'Observaciones', 'Obs'),
  };
}

/** Cotización oficial de ARCA para una moneda (`DOL`, `060`…), opcionalmente a una fecha `YYYYMMDD`. */
export async function getExchangeRate(
  ctx: WsfeContext,
  auth: WsfeAuth,
  currencyId: string,
  arcaDate?: string
): Promise<{ rate: string; date: string | undefined }> {
  const result = await query(
    ctx,
    'FEParamGetCotizacion',
    authXml(auth) + el('ar:MonId', currencyId) + el('ar:FchCotiz', arcaDate)
  );
  const rate = text(result, 'ResultGet', 'MonCotiz');
  if (!rate) throw new ArcaProtocolError('FEParamGetCotizacion sin MonCotiz', null);
  return { rate, date: text(result, 'ResultGet', 'FchCotiz') };
}

export type SalesPointInfo = { number: number; emissionType: string; blocked: boolean; deregisteredAt: string | null };

export async function getSalesPoints(ctx: WsfeContext, auth: WsfeAuth): Promise<SalesPointInfo[]> {
  try {
    const result = await query(ctx, 'FEParamGetPtosVenta', authXml(auth));
    return list(result, 'ResultGet', 'PtoVenta').map((p) => ({
      number: Number(text(p, 'Nro')),
      emissionType: text(p, 'EmisionTipo') ?? '',
      blocked: text(p, 'Bloqueado') === 'S',
      deregisteredAt: (text(p, 'FchBaja') ?? 'NULL') === 'NULL' ? null : (text(p, 'FchBaja') ?? null),
    }));
  } catch (error) {
    // 602: el CUIT no tiene puntos de venta habilitados para web services.
    if (error instanceof ArcaServiceError && error.errors.some((e) => e.code === 602)) return [];
    throw error;
  }
}

export type ParamItem = { id: string; description: string; extra?: string };

/** Catálogos de parámetros para diagnóstico (`FEParamGetTiposCbte`, `...TiposIva`, `...TiposMonedas`). */
export async function getParamList(
  ctx: WsfeContext,
  auth: WsfeAuth,
  operation: 'FEParamGetTiposCbte' | 'FEParamGetTiposIva' | 'FEParamGetTiposMonedas',
  itemTag: 'CbteTipo' | 'IvaTipo' | 'Moneda'
): Promise<ParamItem[]> {
  const result = await query(ctx, operation, authXml(auth));
  return list(result, 'ResultGet', itemTag).map((item) => ({
    id: text(item, 'Id') ?? '',
    description: text(item, 'Desc') ?? '',
  }));
}

export async function getReceiverVatConditions(
  ctx: WsfeContext,
  auth: WsfeAuth,
  letter: 'A' | 'B' | 'C'
): Promise<ParamItem[]> {
  const result = await query(ctx, 'FEParamGetCondicionIvaReceptor', authXml(auth) + el('ar:ClaseCmp', letter));
  return list(result, 'ResultGet', 'CondicionIvaReceptor').map((item) => ({
    id: text(item, 'Id') ?? '',
    description: text(item, 'Desc') ?? '',
    extra: text(item, 'Cmp_Clase'),
  }));
}

// ─── Solicitud de CAE ─────────────────────────────────────────────────────────

export type CaeRequestDetail = {
  concept: number;
  docType: number;
  docNumber: string;
  number: number;
  /** `YYYYMMDD` */
  cbteDate: string;
  total: string;
  untaxed: string;
  net: string;
  exempt: string;
  otherTaxes: string;
  vat: string;
  /** `YYYYMMDD`, obligatorias si el concepto incluye servicios (2 o 3). */
  serviceFrom?: string;
  serviceTo?: string;
  paymentDue?: string;
  currencyId: string;
  exchangeRate: string;
  receiverVatConditionId: number;
  associated?: { type: number; salesPoint: number; number: number; cuit: string; cbteDate: string }[];
  /** Una fila por alícuota (vacío en comprobantes C). */
  vatBreakdown: { id: number; base: string; amount: string }[];
};

export type CaeRequest = { salesPoint: number; cbteType: number; detail: CaeRequestDetail };

/** XML del `FeCAEReq` (puro): se guarda como intención antes de enviarlo. */
export function buildCaeRequestXml(req: CaeRequest): string {
  const d = req.detail;
  const associated =
    d.associated && d.associated.length > 0
      ? '<ar:CbtesAsoc>' +
        d.associated
          .map(
            (a) =>
              '<ar:CbteAsoc>' +
              el('ar:Tipo', a.type) +
              el('ar:PtoVta', a.salesPoint) +
              el('ar:Nro', a.number) +
              el('ar:Cuit', a.cuit) +
              el('ar:CbteFch', a.cbteDate) +
              '</ar:CbteAsoc>'
          )
          .join('') +
        '</ar:CbtesAsoc>'
      : '';
  const vat =
    d.vatBreakdown.length > 0
      ? '<ar:Iva>' +
        d.vatBreakdown
          .map((v) => '<ar:AlicIva>' + el('ar:Id', v.id) + el('ar:BaseImp', v.base) + el('ar:Importe', v.amount) + '</ar:AlicIva>')
          .join('') +
        '</ar:Iva>'
      : '';

  return (
    '<ar:FeCAEReq><ar:FeCabReq>' +
    el('ar:CantReg', 1) +
    el('ar:PtoVta', req.salesPoint) +
    el('ar:CbteTipo', req.cbteType) +
    '</ar:FeCabReq><ar:FeDetReq><ar:FECAEDetRequest>' +
    el('ar:Concepto', d.concept) +
    el('ar:DocTipo', d.docType) +
    el('ar:DocNro', d.docNumber) +
    el('ar:CbteDesde', d.number) +
    el('ar:CbteHasta', d.number) +
    el('ar:CbteFch', d.cbteDate) +
    el('ar:ImpTotal', d.total) +
    el('ar:ImpTotConc', d.untaxed) +
    el('ar:ImpNeto', d.net) +
    el('ar:ImpOpEx', d.exempt) +
    el('ar:ImpTrib', d.otherTaxes) +
    el('ar:ImpIVA', d.vat) +
    el('ar:FchServDesde', d.serviceFrom) +
    el('ar:FchServHasta', d.serviceTo) +
    el('ar:FchVtoPago', d.paymentDue) +
    el('ar:MonId', d.currencyId) +
    el('ar:MonCotiz', d.exchangeRate) +
    el('ar:CondicionIVAReceptorId', d.receiverVatConditionId) +
    associated +
    vat +
    '</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>'
  );
}

export type CaeResult = {
  /** A = aprobado, R = rechazado, P = parcial (no aplica: se envía de a uno). */
  result: 'A' | 'R' | 'P';
  cae: string | null;
  /** `YYYYMMDD` */
  caeDueDate: string | null;
  observations: ArcaMessage[];
  errors: ArcaMessage[];
  events: ArcaMessage[];
};

/**
 * `FECAESolicitar`. SIN reintentos: no es idempotente. Si lanza un `ArcaError` con
 * `outcomeKnown = false`, el comprobante puede haberse autorizado: reconciliar con
 * `consultVoucher` antes de cualquier otra acción.
 */
export async function requestCae(ctx: WsfeContext, auth: WsfeAuth, req: CaeRequest): Promise<CaeResult> {
  const result = await call(ctx, 'FECAESolicitar', authXml(auth) + buildCaeRequestXml(req), CAE_TIMEOUT_MS);
  const errors = messages(result, 'Errors', 'Err');
  const events = messages(result, 'Events', 'Evt');
  const detail = list(result, 'FeDetResp', 'FECAEDetResponse')[0];
  const resultCode = text(detail, 'Resultado') ?? text(result, 'FeCabResp', 'Resultado') ?? (errors.length ? 'R' : undefined);

  if (resultCode !== 'A' && resultCode !== 'R' && resultCode !== 'P') {
    throw new ArcaProtocolError('FECAESolicitar respondió sin Resultado', null);
  }
  const cae = text(detail, 'CAE');
  const caeDueDate = text(detail, 'CAEFchVto');
  if (resultCode === 'A' && (!cae || !caeDueDate)) {
    throw new ArcaProtocolError('FECAESolicitar aprobó sin CAE', null);
  }

  return {
    result: resultCode,
    cae: cae || null,
    caeDueDate: caeDueDate || null,
    observations: messages(detail, 'Observaciones', 'Obs'),
    errors,
    events,
  };
}
