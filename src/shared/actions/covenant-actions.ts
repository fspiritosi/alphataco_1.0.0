'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { Guild } from '@/shared/types/legacy';

export async function getGuildsWithCovenants() {
  try {
    const supabase = await supabaseServer();
    const { data: guilds, error } = await supabase.from('guild').select('*,covenant(*,category(*))');

    if (error) {
      console.error('Error fetching guilds with covenants:', error);
      throw error;
    }

    return guilds as Guild[] | null;
  } catch (error) {
    console.error('Error in getGuildsWithCovenants:', error);
    throw error;
  }
}
