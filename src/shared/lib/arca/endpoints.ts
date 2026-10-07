/**
 * URLs de los web services de ARCA por ambiente. Homologación y producción son mundos separados:
 * certificados, puntos de venta y numeración no se comparten.
 */

export type ArcaEnvironment = 'homologacion' | 'produccion';

const ENDPOINTS: Record<ArcaEnvironment, { wsaa: string; wsfe: string }> = {
  homologacion: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  },
  produccion: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  },
};

export function arcaEndpoints(env: ArcaEnvironment): { wsaa: string; wsfe: string } {
  return ENDPOINTS[env];
}

/**
 * Producción solo se habilita en el despliegue real (`ARCA_ALLOW_PRODUCTION=true`). Sin la
 * variable, ni dev ni la demo pueden emitir comprobantes con validez fiscal aunque la base diga
 * `produccion`.
 */
export function isProductionAllowed(): boolean {
  return process.env.ARCA_ALLOW_PRODUCTION === 'true';
}

export const WSFE_NAMESPACE = 'http://ar.gov.afip.dif.FEV1/';
export const WSAA_NAMESPACE = 'http://wsaa.view.sua.dvadac.desein.afip.gov';
