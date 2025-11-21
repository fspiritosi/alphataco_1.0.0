import React from 'react';

/**
 * Definición de una pestaña para el TabsManager.
 */
export interface TabDefinition {
  /** Identificador único de la pestaña en la URL */
  value: string;
  /** Etiqueta a mostrar en la pestaña (Texto o Componente) */
  label: string | React.ReactNode;
  /** Contenido a renderizar cuando la pestaña está activa */
  content: React.ReactNode;
  /** Roles permitidos para ver esta pestaña (Opcional - Futura implementación) */
  roles?: string[];
}

/**
 * Props para el componente de Servidor TabsManagerServer.
 */
export interface TabsManagerServerProps {
  /** Nombre del parámetro en la URL (ej: 'tab', 'view', 'section') */
  paramName: string;
  /** Lista de pestañas a renderizar */
  tabs: TabDefinition[];
  /** Valor de la pestaña por defecto si no hay nada en la URL */
  defaultTab: string;
  /** Parámetros de búsqueda actuales (searchParams de la Page) */
  searchParams: { [key: string]: string | string[] | undefined };
  /**
   * Lista de parámetros que dependen de este tab y deben limpiarse al cambiar.
   * Ej: Si cambias de 'Empresa' a 'Empleados', limpiar 'subtab' para evitar estados inconsistentes.
   */
  dependentParams?: string[];
}

/**
 * Props para el componente Cliente TabsManagerClient.
 */
export interface TabsManagerClientProps {
  /** Nombre del parámetro en la URL */
  paramName: string;
  /** Lista de pestañas (ya filtradas por rol en el servidor) */
  tabs: TabDefinition[];
  /** Pestaña activa inicial */
  defaultTab: string;
  /** Parámetros dependientes a limpiar */
  dependentParams?: string[];
}
