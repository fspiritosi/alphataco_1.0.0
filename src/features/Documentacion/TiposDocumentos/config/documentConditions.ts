import {
  Award,
  Boxes,
  Briefcase,
  Building2,
  Car,
  CreditCard,
  DollarSign,
  FileText,
  GitBranch,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  Layers,
  MapPin,
  Shield,
  Tag,
  Truck,
  UserCheck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

export interface ConditionFieldConfig {
  /** ID interno para el estado del form (ej: 'hierarchicalPosition') */
  key: string;
  /** property_key en el JSON de conditions (ej: 'hierarchical_position') */
  propertyKey: string;
  /** Label para UI */
  label: string;
  /** Icono para UI */
  icon: LucideIcon;
  /** Tipo de campo */
  type: 'relation' | 'enum' | 'many_to_many';

  // --- Metadatos para JSON de triggers SQL ---

  /** Columna FK en la tabla principal (employees/vehicles) */
  filterColumn: string;
  /** Tipo de relación para el JSON */
  relationType: 'direct' | 'one_to_many' | 'many_to_many';
  /** Tabla pivot (solo M:M) */
  relationTable: string | null;
  /** Columna en la entidad principal (solo M:M, ej: 'id') */
  columnOnEntity: string | null;
  /** Columna en la pivot (solo M:M, ej: 'employee_id') */
  columnOnRelation: string | null;

  // --- Para búsqueda de catálogos (relaciones FK y M:M) ---

  /** Key del CATALOG_MAP en actions.server.ts */
  catalogTable?: string;

  // --- Para enums ---

  /** Opciones disponibles (solo type='enum') */
  enumOptions?: { value: string; label: string }[];

  // --- Para catálogos dependientes (filtrado en cascada) ---

  /**
   * Key de otra condición de la que depende este catálogo. Si está presente,
   * el catálogo se filtra por los IDs seleccionados en esa condición padre
   * (ej: 'vehicleSubType' depende de 'vehicleType' para mostrar solo los
   * subtipos del/los tipo(s) elegido(s)).
   */
  dependsOnKey?: string;
}

/** Estado de condiciones del formulario: key → array de IDs/valores seleccionados */
export type ConditionsState = Record<string, string[]>;

// ============================================
// OPCIONES DE ENUMS
// ============================================

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Femenino', label: 'Femenino' },
  { value: 'No Declarado', label: 'No Declarado' },
];

export const MARITAL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Casado', label: 'Casado' },
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Divorciado', label: 'Divorciado' },
  { value: 'Viudo', label: 'Viudo' },
  { value: 'Separado', label: 'Separado' },
  { value: 'Union de hecho', label: 'Unión de hecho' },
];

export const NATIONALITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Extranjero', label: 'Extranjero' },
];

export const DOCUMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'LE', label: 'LE' },
  { value: 'LC', label: 'LC' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export const LEVEL_OF_EDUCATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'Primario', label: 'Primario' },
  { value: 'Secundario', label: 'Secundario' },
  { value: 'Terciario', label: 'Terciario' },
  { value: 'Universitario', label: 'Universitario' },
  { value: 'PosGrado', label: 'Posgrado' },
];

export const COST_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Directo', label: 'Directo' },
  { value: 'Indirecto', label: 'Indirecto' },
];

export const AFFILIATE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Dentro de convenio', label: 'Dentro de convenio' },
  { value: 'Fuera de convenio', label: 'Fuera de convenio' },
];

export const VEHICLE_CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'operativo', label: 'Operativo' },
  { value: 'no operativo', label: 'No operativo' },
  { value: 'en reparacion', label: 'En reparación' },
  { value: 'operativo condicionado', label: 'Operativo condicionado' },
  { value: 'en preparacion', label: 'En preparación' },
];

export const VEHICLE_CONTRACT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Leasing', label: 'Leasing' },
  { value: 'Alquiler', label: 'Alquiler' },
  { value: 'Propio', label: 'Propio' },
  { value: 'Prendado', label: 'Prendado' },
];

// ============================================
// CONDICIONES DE EMPLEADO (19)
// ============================================

export const EMPLOYEE_CONDITIONS: ConditionFieldConfig[] = [
  // --- Enums (7) ---
  {
    key: 'gender',
    propertyKey: 'gender',
    label: 'Sexo',
    icon: Users,
    type: 'enum',
    filterColumn: 'gender',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: GENDER_OPTIONS,
  },
  {
    key: 'maritalStatus',
    propertyKey: 'marital_status',
    label: 'Estado Civil',
    icon: Heart,
    type: 'enum',
    filterColumn: 'marital_status',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: MARITAL_STATUS_OPTIONS,
  },
  {
    key: 'nationality',
    propertyKey: 'nationality',
    label: 'Nacionalidad',
    icon: Globe,
    type: 'enum',
    filterColumn: 'nationality',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: NATIONALITY_OPTIONS,
  },
  {
    key: 'documentType',
    propertyKey: 'document_type',
    label: 'Tipo de DNI',
    icon: CreditCard,
    type: 'enum',
    filterColumn: 'document_type',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: DOCUMENT_TYPE_OPTIONS,
  },
  {
    key: 'levelOfEducation',
    propertyKey: 'level_of_education',
    label: 'Nivel de Educación',
    icon: GraduationCap,
    type: 'enum',
    filterColumn: 'level_of_education',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: LEVEL_OF_EDUCATION_OPTIONS,
  },
  {
    key: 'costType',
    propertyKey: 'cost_type',
    label: 'Tipo de Costo',
    icon: DollarSign,
    type: 'enum',
    filterColumn: 'cost_type',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: COST_TYPE_OPTIONS,
  },
  {
    key: 'affiliateStatus',
    propertyKey: 'affiliate_status',
    label: 'Estado de Convenio',
    icon: Shield,
    type: 'enum',
    filterColumn: 'affiliate_status',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: AFFILIATE_STATUS_OPTIONS,
  },

  // --- Relaciones FK (10) ---
  {
    key: 'typeOfContract',
    propertyKey: 'type_of_contract',
    label: 'Tipo de Contrato',
    icon: FileText,
    type: 'relation',
    filterColumn: 'type_of_contract',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'types_of_contract',
  },
  {
    key: 'province',
    propertyKey: 'province',
    label: 'Provincia',
    icon: MapPin,
    type: 'relation',
    filterColumn: 'province',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'provinces',
  },
  {
    key: 'hierarchicalPosition',
    propertyKey: 'hierarchical_position',
    label: 'Posición Jerárquica',
    icon: Briefcase,
    type: 'relation',
    filterColumn: 'hierarchical_position',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'hierarchy',
  },
  {
    key: 'workflowDiagram',
    propertyKey: 'workflow_diagram',
    label: 'Diagrama de Flujo',
    icon: GitBranch,
    type: 'relation',
    filterColumn: 'workflow_diagram',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'work_diagram',
  },
  {
    key: 'companyPosition',
    propertyKey: 'company_position',
    label: 'Posición en Empresa',
    icon: Building2,
    type: 'relation',
    filterColumn: 'company_position',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'company_positions',
  },
  {
    key: 'category',
    propertyKey: 'category',
    label: 'Categoría',
    icon: Tag,
    type: 'relation',
    filterColumn: 'category_id',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'category',
  },
  {
    key: 'guild',
    propertyKey: 'guild',
    label: 'Gremio/Sindicato',
    icon: Users,
    type: 'relation',
    filterColumn: 'guild_id',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'guild',
  },
  {
    key: 'covenant',
    propertyKey: 'covenant',
    label: 'Convenio',
    icon: Handshake,
    type: 'relation',
    filterColumn: 'covenants_id',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'covenant',
  },
  {
    key: 'costCenter',
    propertyKey: 'cost_center',
    label: 'Centro de Costo',
    icon: DollarSign,
    type: 'relation',
    filterColumn: 'cost_center_id',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'cost_center',
  },
  {
    key: 'workshopSector',
    propertyKey: 'workshop_sector',
    label: 'Sectores de Taller',
    icon: Wrench,
    type: 'many_to_many',
    filterColumn: 'workshop_sector_id',
    relationType: 'many_to_many',
    relationTable: 'employee_workshop_sectors',
    columnOnEntity: 'id',
    columnOnRelation: 'employee_id',
    catalogTable: 'workshop_sectors',
  },

  // --- Many-to-Many (2) ---
  {
    key: 'contractorEmployee',
    propertyKey: 'contractor_employee',
    label: 'Clientes',
    icon: UserCheck,
    type: 'many_to_many',
    filterColumn: 'contractor_id',
    relationType: 'many_to_many',
    relationTable: 'contractor_employee',
    columnOnEntity: 'id',
    columnOnRelation: 'employee_id',
    catalogTable: 'customers',
  },
  {
    key: 'aptitudes',
    propertyKey: 'empleado_aptitudes',
    label: 'Aptitudes Técnicas',
    icon: Award,
    type: 'many_to_many',
    filterColumn: 'aptitud_id',
    relationType: 'many_to_many',
    relationTable: 'empleado_aptitudes',
    columnOnEntity: 'id',
    columnOnRelation: 'empleado_id',
    catalogTable: 'aptitudes_tecnicas',
  },
];

// ============================================
// CONDICIONES DE EQUIPO (8)
// ============================================

export const EQUIPMENT_CONDITIONS: ConditionFieldConfig[] = [
  // --- Relaciones FK (4) ---
  {
    key: 'brand',
    propertyKey: 'brand',
    label: 'Marca',
    icon: Car,
    type: 'relation',
    filterColumn: 'brand',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'brand_vehicles',
  },
  {
    key: 'model',
    propertyKey: 'model',
    label: 'Modelo',
    icon: Car,
    type: 'relation',
    filterColumn: 'model',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'model_vehicles',
  },
  {
    key: 'vehicleType',
    propertyKey: 'type',
    label: 'Tipo',
    icon: Truck,
    type: 'relation',
    filterColumn: 'type',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'type',
  },
  {
    key: 'vehicleSubType',
    propertyKey: 'subType',
    label: 'Subtipo',
    icon: Boxes,
    type: 'relation',
    filterColumn: 'subType',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'sub_type',
    // El catálogo de subtipos se filtra por el/los tipo(s) elegido(s)
    dependsOnKey: 'vehicleType',
  },
  {
    key: 'typeOfVehicle',
    propertyKey: 'types_of_vehicles',
    label: 'Categoría Vehículo',
    icon: Layers,
    type: 'relation',
    filterColumn: 'type_of_vehicle',
    relationType: 'one_to_many',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    catalogTable: 'types_of_vehicles',
  },

  // --- Enums (3) ---
  {
    key: 'condition',
    propertyKey: 'condition',
    label: 'Condición',
    icon: Shield,
    type: 'enum',
    filterColumn: 'condition',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: VEHICLE_CONDITION_OPTIONS,
  },
  {
    key: 'equipmentCostType',
    propertyKey: 'cost_type',
    label: 'Tipo de Costo',
    icon: DollarSign,
    type: 'enum',
    filterColumn: 'cost_type',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: COST_TYPE_OPTIONS,
  },
  {
    key: 'equipmentContractType',
    propertyKey: 'type_of_contract',
    label: 'Tipo de Contrato',
    icon: FileText,
    type: 'enum',
    filterColumn: 'type_of_contract',
    relationType: 'direct',
    relationTable: null,
    columnOnEntity: null,
    columnOnRelation: null,
    enumOptions: VEHICLE_CONTRACT_TYPE_OPTIONS,
  },

  // --- Many-to-Many (1) ---
  {
    key: 'contractorEquipment',
    propertyKey: 'contractor_equipment',
    label: 'Clientes',
    icon: UserCheck,
    type: 'many_to_many',
    filterColumn: 'contractor_id',
    relationType: 'many_to_many',
    relationTable: 'contractor_equipment',
    columnOnEntity: 'id',
    columnOnRelation: 'equipment_id',
    catalogTable: 'customers',
  },
];

// ============================================
// EMPRESA — No soporta condiciones
// ============================================

export const COMPANY_CONDITIONS: ConditionFieldConfig[] = [];

// ============================================
// HELPERS
// ============================================

const ALL_CONDITIONS = [...EMPLOYEE_CONDITIONS, ...EQUIPMENT_CONDITIONS];

/**
 * Obtiene la configuración de condiciones según el tipo de documento
 */
export function getConditionsForAppliesTo(applies: string): ConditionFieldConfig[] {
  switch (applies) {
    case 'Persona':
      return EMPLOYEE_CONDITIONS;
    case 'Equipos':
      return EQUIPMENT_CONDITIONS;
    case 'Empresa':
      return COMPANY_CONDITIONS;
    default:
      return [];
  }
}

/**
 * Verifica si un tipo de documento soporta condiciones
 */
export function supportsConditions(applies: string): boolean {
  return applies !== 'Empresa';
}

/**
 * Obtiene las condiciones de tipo relación (FK y M:M)
 */
export function getRelationConditions(configs: ConditionFieldConfig[]): ConditionFieldConfig[] {
  return configs.filter((c) => c.type === 'relation' || c.type === 'many_to_many');
}

/**
 * Obtiene las condiciones de tipo enum
 */
export function getEnumConditions(configs: ConditionFieldConfig[]): ConditionFieldConfig[] {
  return configs.filter((c) => c.type === 'enum');
}

/**
 * Crea un estado inicial vacío para las condiciones de un tipo dado
 */
export function createEmptyConditionsState(applies: string): ConditionsState {
  const configs = getConditionsForAppliesTo(applies);
  const state: ConditionsState = {};
  for (const config of configs) {
    state[config.key] = [];
  }
  return state;
}

/**
 * Busca un ConditionFieldConfig por su propertyKey (para el mapper JSON → selections)
 */
export function findConfigByPropertyKey(propertyKey: string): ConditionFieldConfig | undefined {
  return ALL_CONDITIONS.find((c) => c.propertyKey === propertyKey);
}
