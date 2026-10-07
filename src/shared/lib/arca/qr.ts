/**
 * QR de los comprobantes electrónicos (RG 4892): URL de ARCA con un JSON en base64. Escaneado,
 * lleva a la constatación del comprobante. Módulo puro.
 */

export type ArcaQrData = {
  /** `YYYY-MM-DD` */
  issueDate: string;
  issuerCuit: string;
  salesPoint: number;
  cbteType: number;
  number: number;
  /** Total con 2 decimales, en la moneda del comprobante. */
  total: string;
  /** Código de moneda de ARCA (`PES`, `DOL`). */
  currencyId: string;
  exchangeRate: string;
  receiverDocType: number;
  receiverDocNumber: string;
  cae: string;
};

export function buildArcaQrUrl(data: ArcaQrData): string {
  const payload = {
    ver: 1,
    fecha: data.issueDate,
    cuit: Number(data.issuerCuit),
    ptoVta: data.salesPoint,
    tipoCmp: data.cbteType,
    nroCmp: data.number,
    importe: Number(data.total),
    moneda: data.currencyId,
    ctz: Number(data.exchangeRate),
    tipoDocRec: data.receiverDocType,
    nroDocRec: Number(data.receiverDocNumber),
    tipoCodAut: 'E',
    codAut: Number(data.cae),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}`;
}
