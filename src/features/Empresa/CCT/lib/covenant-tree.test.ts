import { describe, expect, it } from 'vitest';
import {
  COVENANT_TREE_ROOT_ID,
  buildCovenantTree,
  formatGuildsData,
  type GuildTreeSource,
} from './covenant-tree';

const guilds: GuildTreeSource[] = [
  {
    id: 'g1',
    name: 'UOCRA',
    covenant: [
      { id: 'c1', name: '76/75', category: [{ id: 'cat1', name: 'Oficial' }, { id: 'cat2', name: 'Ayudante' }] },
      { id: 'c2', name: '577/10', category: [] },
    ],
  },
  { id: 'g2', name: 'Camioneros', covenant: [] },
];

describe('formatGuildsData', () => {
  it('arma los tres niveles con el type que corresponde a cada uno', () => {
    const tree = formatGuildsData(guilds);
    expect(tree.map((n) => [n.id, n.type])).toEqual([
      ['g1', 'sindicato'],
      ['g2', 'sindicato'],
    ]);
    expect(tree[0].children?.map((n) => [n.id, n.type])).toEqual([
      ['c1', 'convenio'],
      ['c2', 'convenio'],
    ]);
    expect(tree[0].children?.[0].children?.map((n) => [n.id, n.type])).toEqual([
      ['cat1', 'categoria'],
      ['cat2', 'categoria'],
    ]);
  });

  it('un nombre nulo se muestra vacío, no como "null"', () => {
    expect(formatGuildsData([{ id: 'g1', name: null, covenant: [{ id: 'c1', name: null, category: null }] }])).toEqual([
      { id: 'g1', name: '', type: 'sindicato', children: [{ id: 'c1', name: '', type: 'convenio', children: [] }] },
    ]);
  });

  it('un sindicato sin convenios queda con children vacío (sigue siendo carpeta)', () => {
    const tree = formatGuildsData(guilds);
    expect(tree[1].children).toEqual([]);
  });

  it('sin datos devuelve una lista vacía', () => {
    expect(formatGuildsData(null)).toEqual([]);
    expect(formatGuildsData(undefined)).toEqual([]);
    expect(formatGuildsData([])).toEqual([]);
  });
});

describe('buildCovenantTree', () => {
  it('cuelga los sindicatos del nodo raíz sintético', () => {
    const root = buildCovenantTree(guilds);
    expect(root.id).toBe(COVENANT_TREE_ROOT_ID);
    expect(root.type).toBe('sindicatoPadre');
    expect(root.children).toEqual(formatGuildsData(guilds));
  });

  it('sin sindicatos, la raíz existe igual y queda vacía', () => {
    expect(buildCovenantTree(null).children).toEqual([]);
  });
});
