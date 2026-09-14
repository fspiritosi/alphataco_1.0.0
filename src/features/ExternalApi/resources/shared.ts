import moment from 'moment';

/**
 * Formas comunes del JSON publico de la API externa.
 *
 * Toda relacion se expone como `{ id, name }` en vez de un id suelto: el
 * sistema externo no tiene forma de resolver un UUID contra nuestras tablas.
 */

export type PublicReference = {
  id: string;
  name: string | null;
};

/** Normaliza una relacion de Prisma a `{ id, name }`, o `null` si no hay dato */
export function toPublicReference(
  relation: { id: string | number | bigint; name: string | null } | null | undefined
): PublicReference | null {
  if (!relation) return null;
  return { id: String(relation.id), name: relation.name };
}

/** Fecha sin hora, en formato ISO (YYYY-MM-DD), que es lo que espera un consumidor externo */
export function toPublicDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return moment(value).format('YYYY-MM-DD');
}
