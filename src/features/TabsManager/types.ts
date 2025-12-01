import type { AllTabSlugs, ModuleSlug } from '@/features/Permissions/permissions-map';
import React from 'react';

/**
 * Definición de una pestaña para el TabsManager con tipado fuerte.
 *
 * El tipado genérico permite autocompletado inteligente:
 * - moduleSlug: Autocompleta todos los módulos disponibles
 * - tabSlug: Autocompleta tabs y subtabs del módulo seleccionado
 *
 * @example
 * ```tsx
 * const tab: TabDefinition<'dashboard'> = {
 *   value: 'principal',
 *   label: 'Principal',
 *   moduleSlug: 'dashboard',  // ← Tipado fuerte
 *   tabSlug: 'principal',      // ← Autocompleta: 'principal', 'documentacion', 'estadisticas', 'empleados', 'vehiculos', etc.
 *   content: <Content />,
 * };
 * ```
 */
export interface TabDefinition<M extends ModuleSlug = ModuleSlug> {
  /** Identificador único de la pestaña en la URL */
  value: string;
  /** Etiqueta a mostrar en la pestaña (Texto o Componente) */
  label: string | React.ReactNode;
  /** Contenido a renderizar cuando la pestaña está activa */
  content: React.ReactNode;
  /**
   * Slug del módulo para verificación de permisos.
   * Obtener de: src/features/Permissions/permissions-map.ts
   * Ejemplo: 'dashboard', 'empleados', 'equipos'
   */
  moduleSlug?: M;
  /**
   * Slug del tab/subtab para verificación de permisos.
   * Obtener de: src/features/Permissions/permissions-map.ts
   * Autocompleta tabs y subtabs del módulo seleccionado
   */
  tabSlug?: AllTabSlugs<M>;
  /** Deshabilita la pestaña */
  disabled?: boolean;
}

/**
 * Props para el componente de Servidor TabsManagerServer con tipado inferido.
 *
 * El tipo de `defaultTab` se infiere automáticamente desde los valores de `tabs`.
 *
 * Para habilitar el autocompletado de `defaultTab`, usa `as const` en el array de tabs:
 *
 * @example
 * ```tsx
 * const tabs = [
 *   { value: 'principal', ... },
 *   { value: 'documentacion', ... },
 * ] as const;
 *
 * <TabsManagerServer
 *   paramName="tab"
 *   searchParams={searchParams}
 *   tabs={tabs}
 *   defaultTab="principal"  // ← Solo acepta: 'principal' | 'documentacion'
 *   dependentParams={['subtab']}
 * />
 * ```
 */
export interface TabsManagerServerProps<M extends ModuleSlug = ModuleSlug> {
  /** Nombre del parámetro en la URL (ej: 'tab', 'view', 'section') */
  paramName: string;
  /** Lista de pestañas a renderizar */
  tabs: readonly TabDefinition<M>[] | TabDefinition<M>[];
  /**
   * Valor de la pestaña por defecto si no hay nada en la URL.
   * Para tipado fuerte, usa `as const` en el array de tabs.
   */
  defaultTab: string;
  /** Parámetros de búsqueda actuales (searchParams de la Page) */
  searchParams: { [key: string]: string | string[] | undefined };
  /**
   * Lista de parámetros de URL que dependen de este tab y deben limpiarse al cambiar.
   *
   * Ejemplo: Si tienes tabs anidadas con paramName="subtab", al cambiar la tab principal
   * debes limpiar 'subtab' para evitar estados inconsistentes.
   *
   * @example
   * ```tsx
   * // URL: /dashboard?tab=documentacion&subtab=empleados
   * // Usuario cambia a tab="estadisticas"
   * // Con dependentParams={['subtab']}: /dashboard?tab=estadisticas ✅
   * // Sin dependentParams: /dashboard?tab=estadisticas&subtab=empleados ❌
   * ```
   */
  dependentParams?: string[];
}

/**
 * Props para el componente Cliente TabsManagerClient con tipado inferido.
 */
export interface TabsManagerClientProps<M extends ModuleSlug = ModuleSlug> {
  /** Nombre del parámetro en la URL */
  paramName: string;
  /** Lista de pestañas (ya filtradas por permisos en el servidor) */
  tabs: readonly TabDefinition<M>[] | TabDefinition<M>[];
  /**
   * Pestaña activa inicial.
   * Para tipado fuerte, usa `as const` en el array de tabs.
   */
  defaultTab: string;
  /** Parámetros dependientes a limpiar al cambiar de tab */
  dependentParams?: string[];
  /** Clases CSS para la lista de tabs */
  listClassName?: string;
  /** Clases CSS para los triggers de tabs */
  triggerClassName?: string;
  /** Clases CSS para el contenido de tabs */
  contentClassName?: string;
}
