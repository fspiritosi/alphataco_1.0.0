import { TreeNodeData } from '@/features/Empresa/CCT/components/TreeFile';
import type { GuildWithCovenants } from '@/shared/actions/covenant-actions';

export function formatGuildsData(guilds: GuildWithCovenants[] | null): TreeNodeData[] {
  if (!guilds) return [];

  return guilds.map((guild) => ({
    name: guild.name ?? '',
    type: 'sindicato' as const,
    id: guild.id,
    children:
      guild.covenant?.map((covenant) => ({
        name: covenant.name ?? '',
        type: 'convenio' as const,
        id: covenant.id,
        children:
          covenant.category?.map((category) => ({
            name: category.name ?? '',
            type: 'categoria' as const,
            id: category.id,
          })) || [],
      })) || [],
  }));
}
