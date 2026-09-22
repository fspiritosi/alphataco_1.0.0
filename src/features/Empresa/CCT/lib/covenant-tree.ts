/**
 * Armado del árbol CCT sindicato → convenio → categoría (módulo puro, testeado).
 *
 * La jerarquía es fija y cada nivel se identifica por su `type`, que es lo que `TreeFile`
 * usa para decidir qué botón de alta ofrece en cada nodo. El nodo raíz ("Sindicatos") es
 * sintético: no existe en la base, sólo cuelga de él el primer nivel.
 */
export type CovenantTreeNodeType = 'sindicatoPadre' | 'sindicato' | 'convenio' | 'categoria';

export interface TreeNodeData {
  name: string;
  id: string;
  children?: TreeNodeData[];
  type: CovenantTreeNodeType;
}

/** Id del nodo raíz sintético; no corresponde a ninguna fila de `guild`. */
export const COVENANT_TREE_ROOT_ID = '0';
export const COVENANT_TREE_ROOT_NAME = 'Sindicatos';

/** Forma mínima de la fila de `guild` con sus convenios y categorías que consume el árbol. */
export interface GuildTreeSource {
  id: string;
  name: string | null;
  covenant?: {
    id: string;
    name: string | null;
    category?: { id: string; name: string | null }[] | null;
  }[] | null;
}

/** `guild[] → TreeNodeData[]` (un nodo por sindicato, con sus convenios y categorías). */
export function formatGuildsData(guilds: GuildTreeSource[] | null | undefined): TreeNodeData[] {
  if (!guilds) return [];

  return guilds.map((guild) => ({
    name: guild.name ?? '',
    type: 'sindicato' as const,
    id: guild.id,
    children: (guild.covenant ?? []).map((covenant) => ({
      name: covenant.name ?? '',
      type: 'convenio' as const,
      id: covenant.id,
      children: (covenant.category ?? []).map((category) => ({
        name: category.name ?? '',
        type: 'categoria' as const,
        id: category.id,
      })),
    })),
  }));
}

/** Cuelga los sindicatos del nodo raíz sintético que renderiza `CovenantTreeFile`. */
export function buildCovenantTree(guilds: GuildTreeSource[] | null | undefined): TreeNodeData {
  return {
    name: COVENANT_TREE_ROOT_NAME,
    type: 'sindicatoPadre',
    id: COVENANT_TREE_ROOT_ID,
    children: formatGuildsData(guilds),
  };
}
