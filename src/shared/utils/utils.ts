import { TreeNodeData } from '@/app/dashboard/company/actualCompany/covenant/TreeFile';
import { Guild } from '@/types/types';

export function formatGuildsData(guilds: Guild[] | null): TreeNodeData[] {
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
