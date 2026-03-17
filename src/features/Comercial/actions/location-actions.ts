'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';

const logger = new Logger('features/Comercial/location');

export const fetchAllProvinces = async () => {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.from('provinces').select('*');

    if (error) {
      logger.error('Error fetching provinces', { data: { error } });
      return [];
    }
    return data;
  } catch (error) {
    logger.error('Error fetching provinces', { data: { error } });
    return [];
  }
};
