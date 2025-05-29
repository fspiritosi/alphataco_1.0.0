'use server';

import { TreeNodeData } from '@/app/dashboard/company/actualCompany/covenant/TreeFile';
import { supabaseServer } from '@/lib/supabase/server';
import { Guild } from '@/types/types';

export async function getGuildsWithCovenants() {
  try {
    const supabase = supabaseServer();
    const cookiesStore = await import('next/headers').then((mod) => mod.cookies());
    const company_id = cookiesStore.get('actualComp')?.value;

    if (!company_id) {
      throw new Error('No company ID found in cookies');
    }

    const { data: guilds, error } = await supabase
      .from('guild')
      .select('*,covenant(*,category(*))')
      .eq('company_id', company_id);

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

export async function formatGuildsData(guilds: Guild[] | null): Promise<TreeNodeData[]> {
  if (!guilds) return [];

  return guilds.map((guild) => ({
    name: guild.name,
    type: 'sindicato' as const,
    id: guild.id,
    children:
      guild.covenant?.map((covenant) => ({
        name: covenant.name,
        type: 'convenio' as const,
        id: covenant.id,
        children:
          covenant.category?.map((category) => ({
            name: category.name,
            type: 'categoria' as const,
            id: category.id,
          })) || [],
      })) || [],
  }));
}
