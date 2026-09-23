'use client';

import { translateErrorMessage } from '@/lib/errorHandler';

/**
 * Traducción de mensajes de error para los toasts del dashboard legacy.
 *
 * Antes llamaba a la edge function `errors_translate` de Supabase
 * (`supabase.functions.invoke`); hoy se resuelve localmente con el diccionario de
 * `translateErrorMessage`.
 *
 * P5 revisó esta nota al cerrar la salida de Supabase: no quedaba nada que portar —
 * `errors_translate` no era un job, y el reemplazo local ya estaba hecho. Las dos edge
 * functions que sí eran jobs (`send-deviations-email` y `send-documents-expiry-email`) hoy
 * son `/api/jobs/daily-report-deviations` y `/api/jobs/documents-expiry`.
 *
 * Lo que queda es la indirección: el hook sólo envuelve `translateErrorMessage` para su único
 * consumidor (`useUploadImage`). Candidato a eliminar en la limpieza de P6.
 */
export const useEdgeFunctions = () => {
  return {
    errorTranslate: async (errorMessage: string): Promise<string> => {
      return translateErrorMessage(errorMessage);
    },
  };
};
