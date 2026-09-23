import { describe, expect, it } from 'vitest';
import type { NavigationLink } from '../constants/navigation';
import { createLinkRegex, findBestMatch } from './sidebar.utils';

/**
 * El sidebar marca como activo el link MÁS específico que matchea el pathname.
 * La regla vive acá (antes estaba duplicada dentro de `useActiveLink`, con `any`).
 */
function link(name: string, href: string): NavigationLink & { regex: RegExp } {
  return {
    name,
    moduleSlug: name.toLowerCase(),
    href,
    icon: null as unknown as NavigationLink['icon'],
    position: 0,
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
    link('Dashboard', '/dashboard'),
    link('Equipos', '/dashboard/equipment'),
    link('Mantenimiento', '/dashboard/maintenance'),
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
