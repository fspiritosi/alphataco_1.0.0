'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';

// import { supabase } from '../../supabase/supabase';

export const useEdgeFunctions = () => {
  const supabase = supabaseBrowser();
  return {
    errorTranslate: async (errorMessage: string) => {
      const { data, error } = await supabase.functions.invoke('errors_translate', {
        body: { errorMessage },
      });

      return data;
    },
  };
};
