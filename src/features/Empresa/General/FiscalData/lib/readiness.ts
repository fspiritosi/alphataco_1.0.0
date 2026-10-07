/**
 * "¿Se puede facturar?" — lógica pura, compartida por Datos fiscales (el resumen de arriba) y
 * Facturación (el aviso y la validación antes de emitir). Recibe fechas como ISO string para
 * poder usarse con los datos ya serializados.
 */

export type CertificateState = 'missing' | 'pending' | 'active' | 'expiring' | 'expired';

/** Desde cuántos días antes del vencimiento se avisa. */
export const CERTIFICATE_EXPIRING_DAYS = 30;

/** Vigencia de una prueba de conexión para habilitar el pase a producción. */
export const PRODUCTION_TEST_MAX_AGE_HOURS = 24;

export type CredentialSnapshot = {
  hasPending: boolean;
  active: { notAfter: string; lastTestAt: string | null; lastTestOk: boolean | null } | null;
};

export function certificateState(credential: CredentialSnapshot, now: Date): CertificateState {
  if (credential.active) {
    const notAfter = new Date(credential.active.notAfter).getTime();
    if (notAfter <= now.getTime()) return 'expired';
    if (notAfter - now.getTime() <= CERTIFICATE_EXPIRING_DAYS * 86_400_000) return 'expiring';
    return 'active';
  }
  return credential.hasPending ? 'pending' : 'missing';
}

export function daysUntil(iso: string, now: Date): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

export type Readiness = {
  profileComplete: boolean;
  activeSalesPoints: number;
  certificate: CertificateState;
  /** Puede emitir en el ambiente activo. */
  canIssue: boolean;
  /** Qué falta, en el orden en que conviene resolverlo. */
  blockers: string[];
};

export function computeReadiness(input: {
  environmentLabel: string;
  profileComplete: boolean;
  activeSalesPoints: number;
  credential: CredentialSnapshot;
  /** Con ARCA simulado (modo demo) no hace falta certificado. */
  simulated: boolean;
  now: Date;
}): Readiness {
  const certificate = certificateState(input.credential, input.now);
  const blockers: string[] = [];
  if (!input.profileComplete) blockers.push('completar los datos fiscales');
  if (input.activeSalesPoints === 0) blockers.push('cargar al menos un punto de venta');
  if (!input.simulated && (certificate === 'missing' || certificate === 'pending')) {
    blockers.push(`cargar el certificado de ${input.environmentLabel.toLowerCase()}`);
  }
  if (!input.simulated && certificate === 'expired') {
    blockers.push(`renovar el certificado de ${input.environmentLabel.toLowerCase()}`);
  }

  return {
    profileComplete: input.profileComplete,
    activeSalesPoints: input.activeSalesPoints,
    certificate,
    canIssue: blockers.length === 0,
    blockers,
  };
}

/** Lo que falta para habilitar "Pasar a producción" (vacío = habilitado). */
export function productionBlockers(input: {
  profileComplete: boolean;
  activeSalesPoints: number;
  production: CredentialSnapshot;
  productionAllowedByServer: boolean;
  now: Date;
}): string[] {
  const blockers: string[] = [];
  if (!input.productionAllowedByServer) blockers.push('Este servidor no está habilitado para emitir en producción.');
  if (!input.profileComplete) blockers.push('Completá los datos fiscales.');
  if (input.activeSalesPoints === 0) blockers.push('Cargá al menos un punto de venta activo.');
  const state = certificateState(input.production, input.now);
  if (state === 'missing' || state === 'pending') blockers.push('Cargá el certificado de producción.');
  if (state === 'expired') blockers.push('El certificado de producción está vencido.');
  const active = input.production.active;
  const testedRecently =
    active?.lastTestOk === true &&
    active.lastTestAt !== null &&
    input.now.getTime() - new Date(active.lastTestAt).getTime() <= PRODUCTION_TEST_MAX_AGE_HOURS * 3_600_000;
  if (active && state !== 'expired' && !testedRecently) {
    blockers.push('Probá la conexión en producción (tiene que haber salido bien en las últimas 24 horas).');
  }
  return blockers;
}
