/**
 * Configuracion de cache server-side para el modulo de Mantenimiento.
 *
 * TTLs en segundos — ajustar segun la frecuencia de cambios esperada.
 * Tags organizados jerarquicamente con separador `:`.
 *
 * Sistema: Next.js 16 `'use cache'` + `cacheTag` + `cacheLife` + `updateTag`.
 * Coexiste con React Query client-side (no se reemplaza).
 */

export const CACHE_TTL = {
  /** Pipeline counts — cambian con cada mutacion */
  PIPELINE_COUNTS: 60,
  /** Listas paginadas (DataTables) */
  PAGINATED_LIST: 120,
  /** Facets de filtros */
  FACETS: 180,
  /** Datos de exportacion */
  EXPORT: 120,
} as const;

export const CACHE_TAGS = {
  // ── Nivel modulo (emergencia — invalida TODO) ──
  ALL: 'maint',

  // ── Entidades base ──
  MAINTENANCE_REQUESTS: 'maint:requests',
  MAINTENANCE_ORDERS: 'maint:orders',
  WORK_ORDER_REPAIRS: 'maint:wo-repairs',
  VEHICLES: 'maint:vehicles',

  // ── Tabs Pipeline Operaciones ──
  TAB_SOLICITUDES: 'maint:tab:solicitudes',
  TAB_PENDIENTES_EJECUTAR: 'maint:tab:pend-ejecutar',
  TAB_PARA_TALLER: 'maint:tab:para-taller',
  TAB_WORKSHOP_TRACKING: 'maint:tab:ws-tracking',
  TAB_REPAIR_SOLICITUDES: 'maint:tab:repair-solic',

  // ── Tabs Pipeline Taller ──
  TAB_PEDIDOS_PENDIENTES: 'maint:tab:pedidos-pend',
  TAB_CONFIRMADOS: 'maint:tab:confirmados',
  TAB_IN_WORKSHOP: 'maint:tab:in-workshop',
  TAB_APPROVALS: 'maint:tab:approvals',

  // ── Otras ──
  TAB_EQUIPMENTS_DEVIATIONS: 'maint:tab:equip-desvios',

  // ── Pipelines (counts del header) ──
  PIPELINE_OPERACIONES: 'maint:pipe:ops',
  PIPELINE_TALLER: 'maint:pipe:taller',

  // ── Empresa / Usuarios ──
  COMPANY_USERS: 'empresa:users',
} as const;
