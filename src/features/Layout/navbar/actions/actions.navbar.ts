'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { getCachedSession } from '@/shared/lib/session';

const logger = new Logger('features/Layout/navbar');

export async function updateProfileAvatar(userId: string, imageUrl: string) {
  const supabase = await supabaseServer();

  try {
    const { error } = await supabase.from('profile').update({ avatar: imageUrl }).eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    logger.error('Error al actualizar avatar', { data: { error } });
    return { success: false, error };
  }
}

export async function getCurrentUserProfile() {
  const supabase = await supabaseServer();
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const { data, error } = await supabase.from('profile').select('*').eq('id', session.user.id).single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error al obtener perfil', { data: { error } });
    return null;
  }
}
