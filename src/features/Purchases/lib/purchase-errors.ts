/**
 * Error de negocio de Compras: el mensaje es para el usuario y la action lo devuelve tal cual en
 * el `ActionResult`. Modulo sin directiva (lo importan libs y actions).
 */
export class PurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseError';
  }
}
