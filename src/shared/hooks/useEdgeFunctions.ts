'use client';

import { translateErrorMessage } from '@/lib/errorHandler';

/**
 * Traducción de mensajes de error para los toasts del dashboard legacy.
 *
 * P5: jobs — antes llamaba a la edge function `errors_translate` de Supabase
 * (`supabase.functions.invoke`). Hasta que P5 reemplace las edge functions, se resuelve
 * localmente con el diccionario de `translateErrorMessage`.
 */
export const useEdgeFunctions = () => {
  return {
    errorTranslate: async (errorMessage: string): Promise<string> => {
      return translateErrorMessage(errorMessage);
    },
  };
};
