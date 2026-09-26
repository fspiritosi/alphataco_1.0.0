import { describe, expect, it } from 'vitest';
import type { NavigationLink } from '../constants/navigation';
import { buildSidebarItems, createLinkRegex, findBestMatch, resolveActiveTab } from './sidebar.utils';

/**
 * El sidebar marca como activo el link MÁS específico que matchea el pathname.
 * La regla vive acá (antes estaba duplicada dentro de `useActiveLink`, con `any`).
 */
function link(
  name: string,
  href: string,
  moduleSlug: NavigationLink['moduleSlug'],
  extra: Partial<NavigationLink> = {}
): NavigationLink & { regex: RegExp } {
  return {
    name,
    moduleSlug,
    href,
    icon: null as unknown as NavigationLink['icon'],
    position: 0,
    ...extra,
    regex: createLinkRegex(href),
  };
}

describe('createLinkRegex', () => {
  it('matchea la ruta exacta y sus hijas', () => {
    const regex = createLinkRegex('/dashboard/equipment');

    expect(regex.test('/dashboard/equipment')).toBe(true);
    expect(regex.test('/dashboard/equipment/123')).toBe(true);
  });

  it('no matchea una ruta hermana con el mismo prefijo de texto', () => {
    const regex = createLinkRegex('/dashboard/equipment');

    expect(regex.test('/dashboard/equipments')).toBe(false);
    expect(regex.test('/dashboard')).toBe(false);
  });
});

describe('findBestMatch', () => {
  const links = [
    link('Dashboard', '/dashboard', 'dashboard'),
    link('Equipos', '/dashboard/equipment', 'equipos'),
    link('Mantenimiento', '/dashboard/maintenance', 'mantenimiento'),
  ];

  it('elige el link más específico cuando varios matchean', () => {
    expect(findBestMatch(links, '/dashboard/equipment/123')).toBe('Equipos');
  });

  it('cae al link general si ninguno más específico matchea', () => {
    expect(findBestMatch(links, '/dashboard')).toBe('Dashboard');
  });

  it('devuelve cadena vacía si ningún link matchea', () => {
    expect(findBestMatch(links, '/login')).toBe('');
  });

  it('devuelve cadena vacía con una lista vacía de links', () => {
    expect(findBestMatch([], '/dashboard')).toBe('');
  });
});

describe('buildSidebarItems', () => {
  const links: NavigationLink[] = [
    link('Mantenimiento', '/dashboard/maintenance', 'mantenimiento', {
      position: 8,
      items: [
        { name: 'Operaciones', tabSlug: 'maint_operaciones' },
        { name: 'Taller', tabSlug: 'maint_taller' },
        { name: 'Gomería', tabSlug: 'gomeria' },
      ],
    }),
    link('Dashboard', '/dashboard', 'dashboard', { position: 1 }),
  ];

  it('deja sólo los módulos accesibles y los ordena por position', () => {
    const result = buildSidebarItems(links, ['dashboard', 'mantenimiento'], {});

    expect(result.map((item) => item.name)).toEqual(['Dashboard', 'Mantenimiento']);
  });

  it('descarta el módulo al que el usuario no tiene acceso', () => {
    const result = buildSidebarItems(links, ['dashboard'], {});

    expect(result.map((item) => item.name)).toEqual(['Dashboard']);
  });

  it('recorta los sub-items a las tabs visibles, conservando el orden declarado', () => {
    const result = buildSidebarItems(links, ['mantenimiento'], {
      mantenimiento: ['gomeria', 'maint_operaciones'],
    });

    expect(result[0].items?.map((item) => item.tabSlug)).toEqual(['maint_operaciones', 'gomeria']);
  });

  it('deja el módulo sin sub-items si no hay ninguna tab visible', () => {
    const result = buildSidebarItems(links, ['mantenimiento'], { mantenimiento: [] });

    expect(result[0].items).toEqual([]);
  });

  it('no inventa sub-items en un módulo que no los declara', () => {
    const result = buildSidebarItems(links, ['dashboard'], { dashboard: ['principal'] });

    expect(result[0].items).toBeUndefined();
  });
});

describe('resolveActiveTab', () => {
  const item = link('Mantenimiento', '/dashboard/maintenance', 'mantenimiento', {
    items: [
      { name: 'Operaciones', tabSlug: 'maint_operaciones' },
      { name: 'Taller', tabSlug: 'maint_taller' },
    ],
  });

  it('usa el ?tab de la URL cuando apunta a una tab visible', () => {
    expect(resolveActiveTab(item, 'maint_taller')).toBe('maint_taller');
  });

  it('cae a la primera tab cuando no hay ?tab (es la que abre el módulo por defecto)', () => {
    expect(resolveActiveTab(item, null)).toBe('maint_operaciones');
  });

  it('cae a la primera tab cuando el ?tab no existe o el usuario no la ve', () => {
    expect(resolveActiveTab(item, 'gomeria')).toBe('maint_operaciones');
  });

  it('devuelve null en un módulo sin sub-items', () => {
    expect(resolveActiveTab(link('Ayuda', '/dashboard/help', 'ayuda'), 'lo-que-sea')).toBeNull();
  });

  it('devuelve null cuando el módulo se quedó sin tabs visibles', () => {
    expect(resolveActiveTab({ ...item, items: [] }, 'maint_taller')).toBeNull();
  });
});
