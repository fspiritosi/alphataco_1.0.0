import { describe, expect, it } from 'vitest';
import { ArcaServiceError } from './errors.ts';
import { buildConstatarXml, parseConstatarResponse, type VoucherCheckRequest } from './wscdc.ts';

const auth = { token: 'TOKEN', sign: 'SIGN', cuit: '30999999950' };

const req: VoucherCheckRequest = {
  issuerCuit: '30712345678',
  salesPoint: 3,
  cbteType: 1,
  number: 12345,
  issueDate: '2026-10-03',
  total: '14820.00',
  cae: '76543210987654',
  receiverCuit: '30999999950',
};

const response = (inner: string) =>
  '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
  `<ComprobanteConstatarResponse xmlns="http://servicios1.afip.gob.ar/wscdc/"><ComprobanteConstatarResult>${inner}</ComprobanteConstatarResult></ComprobanteConstatarResponse>` +
  '</soap:Body></soap:Envelope>';

describe('WSCDC: constatacion de comprobantes', () => {
  it('arma el pedido en el orden del WSDL', () => {
    const xml = buildConstatarXml(auth, req);
    expect(xml).toContain('<ar:ComprobanteConstatar>');
    expect(xml).toContain('<ar:Auth><ar:Token>TOKEN</ar:Token><ar:Sign>SIGN</ar:Sign><ar:Cuit>30999999950</ar:Cuit></ar:Auth>');
    expect(xml).toContain(
      '<ar:CmpReq>' +
        '<ar:CbteModo>CAE</ar:CbteModo>' +
        '<ar:CuitEmisor>30712345678</ar:CuitEmisor>' +
        '<ar:PtoVta>3</ar:PtoVta>' +
        '<ar:CbteTipo>1</ar:CbteTipo>' +
        '<ar:CbteNro>12345</ar:CbteNro>' +
        '<ar:CbteFch>20261003</ar:CbteFch>' +
        '<ar:ImpTotal>14820.00</ar:ImpTotal>' +
        '<ar:CodAutorizacion>76543210987654</ar:CodAutorizacion>' +
        '<ar:DocTipoReceptor>80</ar:DocTipoReceptor>' +
        '<ar:DocNroReceptor>30999999950</ar:DocNroReceptor>' +
        '</ar:CmpReq>'
    );
  });

  it('respuesta aprobada', () => {
    expect(parseConstatarResponse(response('<Resultado>A</Resultado><FchProceso>20261009</FchProceso>'))).toEqual({
      result: 'A',
      observations: [],
    });
  });

  it('respuesta rechazada con observaciones', () => {
    const parsed = parseConstatarResponse(
      response(
        '<Resultado>R</Resultado><Observaciones><Obs><Code>21</Code><Msg>El CAE no corresponde al comprobante</Msg></Obs>' +
          '<Obs><Code>24</Code><Msg>Importe distinto</Msg></Obs></Observaciones>'
      )
    );
    expect(parsed).toEqual({
      result: 'R',
      observations: [
        { code: 21, message: 'El CAE no corresponde al comprobante' },
        { code: 24, message: 'Importe distinto' },
      ],
    });
  });

  it('error de ticket (600) → ArcaServiceError con isInvalidToken', () => {
    try {
      parseConstatarResponse(response('<Errors><Err><Code>600</Code><Msg>ValidacionDeToken: No validaron las fechas del token</Msg></Err></Errors>'));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ArcaServiceError);
      expect((error as ArcaServiceError).isInvalidToken).toBe(true);
    }
  });
});
