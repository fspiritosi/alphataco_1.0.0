/**
 * Resultado de las mutaciones de CCT.
 *
 * El error se devuelve como dato en vez de lanzarlo: Next reemplaza el mensaje de un `Error`
 * lanzado dentro de una Server Action por un texto genérico en producción, y estos mensajes
 * ("Ya existe el convenio X en este sindicato") son justamente lo que el usuario necesita leer.
 */
export type CctMutationResult = { ok: true; id: string } | { ok: false; error: string };
