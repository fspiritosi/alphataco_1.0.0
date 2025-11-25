/**
 * Mapa de permisos del sistema
 *
 * Este archivo contiene la estructura completa de módulos, tabs y subtabs
 * con tipado fuerte para autocompletado en TypeScript.
 *
 * Basado en: supabase/seeds/seed-modules.sql y seed-tabs-structure.sql
 *
 * @example
 * ```tsx
 * <PermissionGuard
 *   module="empleados"  // ← Autocompleta módulos
 *   tab="documentos-de-empleados"  // ← Autocompleta tabs del módulo
 *   action="view"  // ← Autocompleta acciones
 * >
 *   <Button>Ver Documentos</Button>
 * </PermissionGuard>
 * ```
 */

// ============================================
// ACCIONES DISPONIBLES
// ============================================
export const ACTIONS = {
  view: { slug: 'view', name: 'Ver' },
  create: { slug: 'create', name: 'Crear' },
  update: { slug: 'update', name: 'Editar' },
  delete: { slug: 'delete', name: 'Eliminar' },
} as const;

export type ActionSlug = keyof typeof ACTIONS;

// ============================================
// ESTRUCTURA DE PERMISOS
// ============================================
export const PERMISSIONS = {
  // ============================================
  // 1. DASHBOARD
  // ============================================
  dashboard: {
    slug: 'dashboard',
    name: 'Dashboard',
    moduleId: '91ed9ae4-6713-41ac-a87e-6b156e079948',
    tabs: {
      principal: {
        slug: 'principal',
        name: 'Principal',
        tabId: '90000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {},
      },
      documentacion: {
        slug: 'documentacion',
        name: 'Documentacion',
        tabId: '90000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {
          empleados: {
            slug: 'empleados',
            name: 'Empleados',
            tabId: '90000000-0000-0000-0000-000000000021',
            parent: 'documentacion',
          },
          vehiculos: {
            slug: 'vehiculos',
            name: 'Vehiculos',
            tabId: '90000000-0000-0000-0000-000000000022',
            parent: 'documentacion',
          },
        },
      },
      estadisticas: {
        slug: 'estadisticas',
        name: 'Estadisticas',
        tabId: '90000000-0000-0000-0000-000000000003',
        parent: null,
        subtabs: {
          operaciones: {
            slug: 'operaciones',
            name: 'Operaciones',
            tabId: '90000000-0000-0000-0000-000000000031',
            parent: 'estadisticas',
          },
          rrhh: {
            slug: 'rrhh',
            name: 'RRHH',
            tabId: '90000000-0000-0000-0000-000000000032',
            parent: 'estadisticas',
          },
          mantenimiento: {
            slug: 'mantenimiento',
            name: 'Mantenimiento',
            tabId: '90000000-0000-0000-0000-000000000033',
            parent: 'estadisticas',
          },
        },
      },
    },
  },

  // ============================================
  // 2. EMPRESA
  // ============================================
  empresa: {
    slug: 'empresa',
    name: 'Empresa',
    moduleId: 'e0478383-1287-4b5e-a727-985baf867173',
    tabs: {
      general: {
        slug: 'general',
        name: 'General',
        tabId: '10000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {
          company: {
            slug: 'company',
            name: 'Empresa',
            tabId: '10000000-0000-0000-0000-000000000011',
            parent: 'general',
          },
          'cost-center': {
            slug: 'cost-center',
            name: 'Centro de Costos',
            tabId: '10000000-0000-0000-0000-000000000012',
            parent: 'general',
          },
          organigrama: {
            slug: 'organigrama',
            name: 'Organigrama',
            tabId: '10000000-0000-0000-0000-000000000013',
            parent: 'general',
          },
          users: {
            slug: 'users',
            name: 'Usuarios',
            tabId: '10000000-0000-0000-0000-000000000014',
            parent: 'general',
            subtabs: {
              'usuarios-empleados': {
                slug: 'usuarios-empleados',
                name: 'Usuarios',
                tabId: '10000000-0000-0000-0000-000000000141',
                parent: 'users',
              },
              'gestion-roles': {
                slug: 'gestion-roles',
                name: 'Gestión de Roles',
                tabId: '10000000-0000-0000-0000-000000000142',
                parent: 'users',
              },
            },
          },
          documentacion: {
            slug: 'documentacion',
            name: 'Documentación',
            tabId: '10000000-0000-0000-0000-000000000015',
            parent: 'general',
          },
        },
      },
      rrhh: {
        slug: 'rrhh',
        name: 'RRHH',
        tabId: '10000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {
          listado: {
            slug: 'listado',
            name: 'Listado',
            tabId: '10000000-0000-0000-0000-000000000021',
            parent: 'rrhh',
          },
          diagrams: {
            slug: 'diagrams',
            name: 'Diagramas',
            tabId: '10000000-0000-0000-0000-000000000022',
            parent: 'rrhh',
          },
          convenios: {
            slug: 'convenios',
            name: 'Convenios',
            tabId: '10000000-0000-0000-0000-000000000023',
            parent: 'rrhh',
          },
          'contract-types': {
            slug: 'contract-types',
            name: 'Tipos de Contrato',
            tabId: '10000000-0000-0000-0000-000000000024',
            parent: 'rrhh',
          },
          positions: {
            slug: 'positions',
            name: 'Puestos',
            tabId: '10000000-0000-0000-0000-000000000025',
            parent: 'rrhh',
          },
          aptitudes: {
            slug: 'aptitudes',
            name: 'Aptitudes',
            tabId: '10000000-0000-0000-0000-000000000026',
            parent: 'rrhh',
          },
        },
      },
      vehicles: {
        slug: 'vehicles',
        name: 'Vehículos',
        tabId: '10000000-0000-0000-0000-000000000003',
        parent: null,
        subtabs: {
          tipos: {
            slug: 'tipos',
            name: 'Tipos',
            tabId: '10000000-0000-0000-0000-000000000031',
            parent: 'vehicles',
          },
          marcas: {
            slug: 'marcas',
            name: 'Marcas',
            tabId: '10000000-0000-0000-0000-000000000032',
            parent: 'vehicles',
          },
          modelos: {
            slug: 'modelos',
            name: 'Modelos',
            tabId: '10000000-0000-0000-0000-000000000033',
            parent: 'vehicles',
          },
          subtipos: {
            slug: 'subtipos',
            name: 'Subtipos',
            tabId: '10000000-0000-0000-0000-000000000034',
            parent: 'vehicles',
          },
          titulares: {
            slug: 'titulares',
            name: 'Titulares',
            tabId: '10000000-0000-0000-0000-000000000035',
            parent: 'vehicles',
          },
        },
      },
    },
  },

  // ============================================
  // 3. EMPLEADOS
  // ============================================
  empleados: {
    slug: 'empleados',
    name: 'Empleados',
    moduleId: '3c54a757-162c-4afc-8ea5-dca462f92e0c',
    tabs: {
      employees: {
        slug: 'employees',
        name: 'Empleados',
        tabId: '20000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {
          'empleados-activos': {
            slug: 'empleados-activos',
            name: 'Empleados Activos',
            tabId: '20000000-0000-0000-0000-000000000011',
            parent: 'employees',
          },
          'empleados-inactivos': {
            slug: 'empleados-inactivos',
            name: 'Empleados Inactivos',
            tabId: '20000000-0000-0000-0000-000000000012',
            parent: 'employees',
          },
        },
      },
      'documentos-de-empleados': {
        slug: 'documentos-de-empleados',
        name: 'Documentos de Empleados',
        tabId: '20000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {
          'docs-empleados-permanentes': {
            slug: 'docs-empleados-permanentes',
            name: 'Permanentes',
            tabId: '20000000-0000-0000-0000-000000000021',
            parent: 'documentos-de-empleados',
          },
          'docs-empleados-mensuales': {
            slug: 'docs-empleados-mensuales',
            name: 'Mensuales',
            tabId: '20000000-0000-0000-0000-000000000022',
            parent: 'documentos-de-empleados',
          },
        },
      },
      diagrams: {
        slug: 'diagrams',
        name: 'Diagramas',
        tabId: '20000000-0000-0000-0000-000000000003',
        parent: null,
        subtabs: {
          old: {
            slug: 'old',
            name: 'Diagramas Cargados',
            tabId: '20000000-0000-0000-0000-000000000031',
            parent: 'diagrams',
          },
          new: {
            slug: 'new',
            name: 'Cargar Diagramas',
            tabId: '20000000-0000-0000-0000-000000000032',
            parent: 'diagrams',
          },
          massive_diagram: {
            slug: 'massive_diagram',
            name: 'Carga Masiva',
            tabId: '20000000-0000-0000-0000-000000000033',
            parent: 'diagrams',
          },
          reports: {
            slug: 'reports',
            name: 'Reportes',
            tabId: '20000000-0000-0000-0000-000000000034',
            parent: 'diagrams',
          },
        },
      },
      'tipos-de-documentos': {
        slug: 'tipos-de-documentos',
        name: 'Tipos de Documentos',
        tabId: '20000000-0000-0000-0000-000000000004',
        parent: null,
        subtabs: {},
      },
      covenant: {
        slug: 'covenant',
        name: 'CCT',
        tabId: '20000000-0000-0000-0000-000000000005',
        parent: null,
        subtabs: {},
      },
    },
  },

  // ============================================
  // 4. EQUIPOS
  // ============================================
  equipos: {
    slug: 'equipos',
    name: 'Equipos',
    moduleId: '34d7f9e5-7c01-4def-9446-6b3f52d761a0',
    tabs: {
      equipos: {
        slug: 'equipos',
        name: 'Equipos',
        tabId: '30000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {
          vehicles: {
            slug: 'vehicles',
            name: 'Vehículos',
            tabId: '30000000-0000-0000-0000-000000000011',
            parent: 'equipos',
          },
          others: {
            slug: 'others',
            name: 'Otros',
            tabId: '30000000-0000-0000-0000-000000000012',
            parent: 'equipos',
          },
          inactive: {
            slug: 'inactive',
            name: 'Dados de Baja',
            tabId: '30000000-0000-0000-0000-000000000013',
            parent: 'equipos',
          },
        },
      },
      'documentos-de-equipos': {
        slug: 'documentos-de-equipos',
        name: 'Documentos de Equipos',
        tabId: '30000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {
          'docs-equipos-permanentes': {
            slug: 'docs-equipos-permanentes',
            name: 'Permanentes',
            tabId: '30000000-0000-0000-0000-000000000021',
            parent: 'documentos-de-equipos',
          },
          'docs-equipos-mensuales': {
            slug: 'docs-equipos-mensuales',
            name: 'Mensuales',
            tabId: '30000000-0000-0000-0000-000000000022',
            parent: 'documentos-de-equipos',
          },
        },
      },
      'tipos-de-documentos': {
        slug: 'tipos-de-documentos',
        name: 'Tipos de Documentos',
        tabId: '30000000-0000-0000-0000-000000000003',
        parent: null,
        subtabs: {},
      },
      type_of_repairs: {
        slug: 'type_of_repairs',
        name: 'Mantenimiento',
        tabId: '30000000-0000-0000-0000-000000000004',
        parent: null,
        subtabs: {
          created_solicitudes: {
            slug: 'created_solicitudes',
            name: 'Solicitudes',
            tabId: '30000000-0000-0000-0000-000000000041',
            parent: 'type_of_repairs',
          },
          type_of_repair: {
            slug: 'type_of_repair',
            name: 'Tipos de Reparación',
            tabId: '30000000-0000-0000-0000-000000000042',
            parent: 'type_of_repairs',
          },
          type_of_repair_new_entry: {
            slug: 'type_of_repair_new_entry',
            name: 'Nueva Solicitud',
            tabId: '30000000-0000-0000-0000-000000000043',
            parent: 'type_of_repairs',
            subtabs: {
              'carga-individual': {
                slug: 'carga-individual',
                name: 'Carga Individual',
                tabId: '30000000-0000-0000-0000-000000000431',
                parent: 'type_of_repair_new_entry',
              },
              'carga-multiple': {
                slug: 'carga-multiple',
                name: 'Carga Múltiple',
                tabId: '30000000-0000-0000-0000-000000000432',
                parent: 'type_of_repair_new_entry',
              },
            },
          },
          maintenance_groups: {
            slug: 'maintenance_groups',
            name: 'Grupos',
            tabId: '30000000-0000-0000-0000-000000000044',
            parent: 'type_of_repairs',
          },
        },
      },
    },
  },

  // ============================================
  // 5. COMERCIAL
  // ============================================
  comercial: {
    slug: 'comercial',
    name: 'Comercial',
    moduleId: '92bfac14-dc5b-41be-b366-740bfbeaea13',
    tabs: {
      comerce: {
        slug: 'comerce',
        name: 'Comercial',
        tabId: '40000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {
          customers: {
            slug: 'customers',
            name: 'Clientes',
            tabId: '40000000-0000-0000-0000-000000000011',
            parent: 'comerce',
          },
          areas: {
            slug: 'areas',
            name: 'Áreas',
            tabId: '40000000-0000-0000-0000-000000000012',
            parent: 'comerce',
          },
          equipment: {
            slug: 'equipment',
            name: 'Equipos del Cliente',
            tabId: '40000000-0000-0000-0000-000000000013',
            parent: 'comerce',
          },
          sector: {
            slug: 'sector',
            name: 'Sectores',
            tabId: '40000000-0000-0000-0000-000000000014',
            parent: 'comerce',
          },
          service: {
            slug: 'service',
            name: 'Contratos/Servicios',
            tabId: '40000000-0000-0000-0000-000000000015',
            parent: 'comerce',
          },
          mensure_units: {
            slug: 'mensure_units',
            name: 'Unidades de Medida',
            tabId: '40000000-0000-0000-0000-000000000016',
            parent: 'comerce',
          },
          daily_reports: {
            slug: 'daily_reports',
            name: 'Partes Diarios',
            tabId: '40000000-0000-0000-0000-000000000017',
            parent: 'comerce',
          },
        },
      },
    },
  },

  // ============================================
  // 6. DOCUMENTACIÓN
  // ============================================
  documentacion: {
    slug: 'documentacion',
    name: 'Documentación',
    moduleId: '4783f7df-3580-4f54-bf8f-6ef7f252d038',
    tabs: {
      'documentos-de-empleados': {
        slug: 'documentos-de-empleados',
        name: 'Documentos de Empleados',
        tabId: '50000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {
          'empleados-permanentes': {
            slug: 'empleados-permanentes',
            name: 'Permanentes',
            tabId: '50000000-0000-0000-0000-000000000011',
            parent: 'documentos-de-empleados',
          },
          'empleados-mensuales': {
            slug: 'empleados-mensuales',
            name: 'Mensuales',
            tabId: '50000000-0000-0000-0000-000000000012',
            parent: 'documentos-de-empleados',
          },
        },
      },
      'documentos-de-equipos': {
        slug: 'documentos-de-equipos',
        name: 'Documentos de Equipos',
        tabId: '50000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {
          'equipos-permanentes': {
            slug: 'equipos-permanentes',
            name: 'Permanentes',
            tabId: '50000000-0000-0000-0000-000000000021',
            parent: 'documentos-de-equipos',
          },
          'equipos-mensuales': {
            slug: 'equipos-mensuales',
            name: 'Mensuales',
            tabId: '50000000-0000-0000-0000-000000000022',
            parent: 'documentos-de-equipos',
          },
        },
      },
      'documentos-de-empresa': {
        slug: 'documentos-de-empresa',
        name: 'Documentos de Empresa',
        tabId: '50000000-0000-0000-0000-000000000003',
        parent: null,
        subtabs: {
          'empresa-permanentes': {
            slug: 'empresa-permanentes',
            name: 'Permanentes',
            tabId: '50000000-0000-0000-0000-000000000031',
            parent: 'documentos-de-empresa',
          },
          'empresa-mensuales': {
            slug: 'empresa-mensuales',
            name: 'Mensuales',
            tabId: '50000000-0000-0000-0000-000000000032',
            parent: 'documentos-de-empresa',
          },
        },
      },
      'tipos-de-documentos': {
        slug: 'tipos-de-documentos',
        name: 'Tipos de Documentos',
        tabId: '50000000-0000-0000-0000-000000000004',
        parent: null,
        subtabs: {},
      },
    },
  },

  // ============================================
  // 7. MANTENIMIENTO
  // ============================================
  mantenimiento: {
    slug: 'mantenimiento',
    name: 'Mantenimiento',
    moduleId: '421e96da-5235-4857-bf81-e63336447f13',
    tabs: {
      type_of_repairs: {
        slug: 'type_of_repairs',
        name: 'Mantenimiento',
        tabId: '60000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {
          created_solicitudes: {
            slug: 'created_solicitudes',
            name: 'Solicitudes',
            tabId: '60000000-0000-0000-0000-000000000011',
            parent: 'type_of_repairs',
          },
          type_of_repair: {
            slug: 'type_of_repair',
            name: 'Tipos de Reparación',
            tabId: '60000000-0000-0000-0000-000000000012',
            parent: 'type_of_repairs',
          },
          type_of_repair_new_entry: {
            slug: 'type_of_repair_new_entry',
            name: 'Nueva Solicitud',
            tabId: '60000000-0000-0000-0000-000000000013',
            parent: 'type_of_repairs',
          },
          maintenance_groups: {
            slug: 'maintenance_groups',
            name: 'Grupos',
            tabId: '60000000-0000-0000-0000-000000000014',
            parent: 'type_of_repairs',
          },
        },
      },
    },
  },

  // ============================================
  // 8. OPERACIONES
  // ============================================
  operaciones: {
    slug: 'operaciones',
    name: 'Operaciones',
    moduleId: '5563157e-fc3e-470f-b90b-dadd7cc38417',
    tabs: {
      preparte: {
        slug: 'preparte',
        name: 'Preparte',
        tabId: '70000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {},
      },
      dailyreportstable: {
        slug: 'dailyreportstable',
        name: 'Partes Diarios',
        tabId: '70000000-0000-0000-0000-000000000002',
        parent: null,
        subtabs: {},
      },
    },
  },

  // ============================================
  // 9. FORMULARIOS
  // ============================================
  formularios: {
    slug: 'formularios',
    name: 'Formularios',
    moduleId: '6674268f-0d4f-581f-c91c-ebbe8dd49528',
    tabs: {
      formularios: {
        slug: 'formularios',
        name: 'Formularios',
        tabId: '80000000-0000-0000-0000-000000000001',
        parent: null,
        subtabs: {},
      },
    },
  },

  // ============================================
  // 10. AYUDA
  // ============================================
  ayuda: {
    slug: 'ayuda',
    name: 'Ayuda',
    moduleId: '7785379f-1e5f-692f-da2d-fccf9ee5af39',
    tabs: {},
  },
} as const;

// ============================================
// TIPOS INFERIDOS
// ============================================

export type ModuleSlug = keyof typeof PERMISSIONS;

export type TabSlug<M extends ModuleSlug> = keyof (typeof PERMISSIONS)[M]['tabs'];

// Tipo para subtabs con autocompletado real
export type SubtabSlug<M extends ModuleSlug, T extends TabSlug<M>> = (typeof PERMISSIONS)[M]['tabs'][T] extends {
  subtabs: infer S;
}
  ? keyof S
  : never;

// Tipo helper para obtener subtabs de nivel 3 (subtabs de subtabs)
type SubSubtabSlug<M extends ModuleSlug, T extends TabSlug<M>> = {
  [ST in SubtabSlug<M, T>]: (typeof PERMISSIONS)[M]['tabs'][T] extends { subtabs: infer S }
    ? S extends Record<string, any>
      ? ST extends keyof S
        ? S[ST] extends { subtabs: infer SS }
          ? keyof SS
          : never
        : never
      : never
    : never;
}[SubtabSlug<M, T>];

// Tipo para obtener todos los slugs de tabs, subtabs y sub-subtabs de un módulo (hasta 3 niveles)
export type AllTabSlugs<M extends ModuleSlug> =
  | TabSlug<M> // Nivel 1: tabs principales
  | {
      [T in TabSlug<M>]: SubtabSlug<M, T>;
    }[TabSlug<M>] // Nivel 2: subtabs
  | {
      [T in TabSlug<M>]: SubSubtabSlug<M, T>;
    }[TabSlug<M>]; // Nivel 3: sub-subtabs

// Helper para obtener el tabId correcto
export function getTabId(module: ModuleSlug, tab: string): string {
  const moduleData = PERMISSIONS[module];
  if (!moduleData || !moduleData.tabs) return '';
  const tabData = (moduleData.tabs as any)[tab];
  return tabData?.tabId || '';
}

// Helper para obtener el subtabId correcto
export function getSubtabId(module: ModuleSlug, tab: string, subtab: string): string {
  const moduleData = PERMISSIONS[module];
  if (!moduleData || !moduleData.tabs) return '';
  const tabData = (moduleData.tabs as any)[tab];
  if (!tabData || !tabData.subtabs) return '';
  const subtabData = tabData.subtabs[subtab];
  return subtabData?.tabId || '';
}
