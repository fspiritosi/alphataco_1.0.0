/**
 * Errores de la integración con ARCA. La orquestación decide qué hacer por `outcomeKnown`
 * (¿sabemos si ARCA procesó el pedido?), nunca por el texto del mensaje:
 *
 * - `outcomeKnown = true`: ARCA respondió (o el pedido no llegó a salir). Se puede volver a
 *   borrador o reintentar sin riesgo de duplicar.
 * - `outcomeKnown = false`: el pedido salió y no hay respuesta interpretable. Puede haberse
 *   autorizado: hay que reconciliar con `FECompConsultar` antes de cualquier otra cosa.
 */

export type ArcaMessage = { code: number; message: string };

export class ArcaError extends Error {
  readonly outcomeKnown: boolean;
  readonly retryable: boolean;

  constructor(message: string, opts: { outcomeKnown: boolean; retryable: boolean }) {
    super(message);
    this.name = new.target.name;
    this.outcomeKnown = opts.outcomeKnown;
    this.retryable = opts.retryable;
  }
}

/** Timeout o error de red. Si el pedido no terminó de enviarse, el resultado se conoce. */
export class ArcaTransportError extends ArcaError {
  readonly sent: boolean;

  constructor(message: string, sent: boolean) {
    super(message, { outcomeKnown: !sent, retryable: true });
    this.sent = sent;
  }
}

/** ARCA respondió algo que no se pudo interpretar (HTTP inesperado, XML inválido). */
export class ArcaProtocolError extends ArcaError {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message, { outcomeKnown: false, retryable: true });
    this.status = status;
  }
}

/** Fault de WSAA: certificado vencido, no confiable, firma inválida, CUIT sin el servicio, etc. */
export class ArcaAuthError extends ArcaError {
  readonly faultCode: string;

  constructor(faultCode: string, message: string) {
    super(message, { outcomeKnown: true, retryable: false });
    this.faultCode = faultCode;
  }
}

/**
 * WSAA ya entregó un ticket vigente para ese certificado y servicio, y lo perdimos. No hay forma
 * de recuperarlo: hay que esperar a que venza (hasta 12 h). Por eso el ticket se persiste ANTES
 * de usarlo.
 */
export class ArcaTokenUnavailableError extends ArcaError {
  constructor(message: string) {
    super(message, { outcomeKnown: true, retryable: false });
  }
}

/** WSFE devolvió `Errors` en una operación que no es la solicitud de CAE. */
export class ArcaServiceError extends ArcaError {
  readonly errors: ArcaMessage[];

  constructor(errors: ArcaMessage[]) {
    super(errors.map((e) => `${e.code}: ${e.message}`).join(' | ') || 'Error de ARCA', {
      outcomeKnown: true,
      retryable: false,
    });
    this.errors = errors;
  }

  /** 600/601: el token o la firma no son válidos (vencidos o de otro CUIT). El 602 es "sin datos". */
  get isInvalidToken(): boolean {
    return this.errors.some((e) => e.code === 600 || e.code === 601);
  }
}

/** Otro proceso tiene tomada la operación (pedido de ticket o numeración). Reintentar en un rato. */
export class ArcaBusyError extends ArcaError {
  constructor(message: string) {
    super(message, { outcomeKnown: true, retryable: true });
  }
}

/** Falta configuración local (certificado, punto de venta, ambiente no habilitado). */
export class ArcaConfigError extends ArcaError {
  constructor(message: string) {
    super(message, { outcomeKnown: true, retryable: false });
  }
}
