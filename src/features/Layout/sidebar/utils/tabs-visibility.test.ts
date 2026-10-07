import { describe, expect, it } from 'vitest';
import { resolveVisibleTabs } from './tabs-visibility';

/**
 * El sidebar no puede ofrecer una tab que la página no va a montar: `TabsManagerServer`
 * decide con `view` explícito o visibilidad inferida, y acá se replica esa regla.
 */
describe('resolveVisibleTabs', () => {
  it('sin permisos no deja ninguna tab visible', () => {
    const visible = resolveVisibleTabs({});

    expect(visible.documentacion).toEqual([]);
    expect(visible.mantenimiento).toEqual([]);
  });

  it('muestra la tab con view explícito', () => {
    const visible = resolveVisibleTabs({ 'documentacion:documentos-de-equipos:view': true });

    expect(visible.documentacion).toEqual(['documentos-de-equipos']);
  });

  it('ubica en Configuración las secciones que se mudaron de otros módulos', () => {
    const visible = resolveVisibleTabs({
      'configuracion:mantenimiento:view': true,
      'configuracion:documentos:view': true,
    });

    expect(visible.configuracion).toEqual(['mantenimiento', 'documentos']);
    expect(visible.mantenimiento).not.toContain('maint_configuracion');
    expect(visible.documentacion).not.toContain('tipos-de-documentos');
  });

  it('Mantenimiento se ve aunque el permiso esté sólo en una de sus cuatro pantallas', () => {
    // Las 4 (talleres, sectores, tipos de reparación, grupos) son subtabs de una sola sección:
    // alcanza con tener `view` en cualquiera para que la sección aparezca (visibilidad inferida).
    const visible = resolveVisibleTabs({ 'configuracion:type_of_repair:view': true });

    expect(visible.configuracion).toContain('mantenimiento');
  });

  it('ignora el permiso en false', () => {
    const visible = resolveVisibleTabs({ 'documentacion:documentos-de-equipos:view': false });

    expect(visible.documentacion).toEqual([]);
  });

  it('ignora acciones que no son view', () => {
    const visible = resolveVisibleTabs({ 'documentacion:documentos-de-equipos:create': true });

    expect(visible.documentacion).toEqual([]);
  });

  it('infiere la tab padre cuando el permiso está en una subtab', () => {
    // `dashboard:documentacion` no tiene view propio, pero sí su subtab `empleados`.
    const visible = resolveVisibleTabs({ 'dashboard:empleados:view': true });

    expect(visible.dashboard).toEqual(['documentacion']);
  });

  it('no mezcla módulos que comparten el slug de tab', () => {
    // `documentos-de-equipos` existe como tab propia en equipos y en documentacion.
    const visible = resolveVisibleTabs({ 'equipos:documentos-de-equipos:view': true });

    expect(visible.equipos).toContain('documentos-de-equipos');
    expect(visible.documentacion).not.toContain('documentos-de-equipos');
  });

  it('conserva el orden declarado en navigationLinks, no el de los permisos', () => {
    const visible = resolveVisibleTabs({
      'documentacion:documentos-de-empresa:view': true,
      'documentacion:documentos-de-empleados:view': true,
    });

    expect(visible.documentacion).toEqual(['documentos-de-empleados', 'documentos-de-empresa']);
  });

  it('no declara entradas para los módulos sin sub-items', () => {
    const visible = resolveVisibleTabs({ 'comercial:comerce:view': true, 'formularios:formularios:view': true });

    expect(visible.comercial).toBeUndefined();
    expect(visible.formularios).toBeUndefined();
  });
});

describe('resolveVisibleTabs con permiso heredado', () => {
  it('muestra la tab que el módulo monta pero no posee, leyendo el permiso del dueño', () => {
    // Equipos monta "Tipos de Documentos", cuya tab vive en Configuración.
    const visible = resolveVisibleTabs({ 'configuracion:documentos:view': true });

    expect(visible.equipos).toContain('tipos-de-documentos');
  });

  it('la oculta si el permiso del módulo dueño no está concedido', () => {
    const visible = resolveVisibleTabs({ 'equipos:equipos:view': true });

    expect(visible.equipos).not.toContain('tipos-de-documentos');
  });
});
