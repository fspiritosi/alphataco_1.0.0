import { logHandledError } from '@/shared/actions/errors.server';

/**
 * Traduce al castellano los mensajes de error conocidos (códigos SQLSTATE de Postgres y unos
 * pocos mensajes de Auth). Se llamaba `handleSupabaseError` cuando el diccionario venía de los
 * errores de PostgREST/GoTrue; ya no queda nada de Supabase, sólo el diccionario.
 */
export function translateErrorMessage(error: string): string {
  const errorMessages: { [code: string]: string } = {
    '22001': 'El valor ingresado está fuera del rango permitido',
    '23502': 'Por favor, completa todos los campos obligatorios',
    '23505': 'El valor ingresado ya existe, por favor ingresa uno diferente',
    '42501': 'No tienes permisos para realizar esta operación',
    'Invalid login credentials': 'Correo o contraseña inválidos',
    'User already registered': 'El usuario ya se encuentra registrado',
    'duplicate key value violates unique constraint "unique_contractor_employee"': 'Afectacion duplicada',
    'The resource already exists': 'El recurso ya existe',
    'El recurso ya existe': 'El recurso ya existe',
  };

  if (!errorMessages[error]) {
    // Se guarda en `handle_errors` para revisar los mensajes sin traducción (fire-and-forget).
    void logHandledError(error, typeof window !== 'undefined' ? window.location.pathname : '');
  }

  const errorMessage = errorMessages[error] || 'Ha ocurrido un error al procesar la solicitud';
  return errorMessage;
}
