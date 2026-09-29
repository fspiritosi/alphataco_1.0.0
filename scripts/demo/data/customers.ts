/**
 * Clientes de la demo (operadoras y contratistas ficticias de la Cuenca Neuquina) y el
 * cliente interno que `get_kpi_range` tiene fijo por id.
 */
import { KPI_FIXED_IDS, demoId } from '../lib/ids.ts';

export interface ItemDef {
  key: string;
  name: string;
  description: string;
  unit: number;
  /** Precio vigente (ARS, o USD si el contrato es en dolares). */
  price: number;
  needsEquipment?: boolean;
  needsPersonnel?: boolean;
  /** Filas por dia habil que genera en los partes. */
  perDay: number;
}

export interface ContractDef {
  key: string;
  name: string;
  number: string;
  currency: 'ARS' | 'USD';
  startMonthsAgo: number;
  /** Meses de vigencia desde el inicio. */
  months: number;
  items: ItemDef[];
}

export interface CustomerDef {
  key: string;
  id?: string;
  name: string;
  cuit: string;
  email: string;
  phone: string;
  address: string;
  areas: string[];
  sectors: string[];
  rigs: Array<{ name: string; type: 'Perforador' | 'Perforador_Spudder' | 'Work_over' | 'Fractura' | 'Coiled_Tubing' }>;
  contracts: ContractDef[];
  contact: { name: string; role: string };
  /** Cliente inactivo (dado de baja). */
  inactive?: boolean;
}

export const CUSTOMERS: CustomerDef[] = [
  {
    key: 'andes',
    name: 'Andes Energía Upstream S.A.',
    cuit: '30709876541',
    email: 'compras@andes-upstream-demo.com.ar',
    phone: '2994421100',
    address: 'Av. Argentina 1450, Neuquén',
    areas: ['Loma Campana Norte', 'Bajada del Palo'],
    sectors: ['Perforación', 'Completación', 'Producción'],
    rigs: [
      { name: 'Equipo AE-101', type: 'Perforador' },
      { name: 'Equipo AE-205', type: 'Work_over' },
    ],
    contact: { name: 'Martina Quiroga', role: 'Jefa de compras' },
    contracts: [
      {
        key: 'andes_transporte',
        name: 'Transporte de cargas y materiales',
        number: 'AE-2025-0412',
        currency: 'ARS',
        startMonthsAgo: 14,
        months: 24,
        items: [
          { key: 'tractor_hora', name: 'Tractor con semirremolque', description: 'Servicio de tractor con semirremolque batea, por hora', unit: 1, price: 68500, perDay: 3 },
          { key: 'hidrogrua_dia', name: 'Camión hidrogrúa 20 t', description: 'Hidrogrúa con operador, jornada de 12 horas', unit: 2, price: 1120000, perDay: 2 },
          { key: 'camioneta_mes', name: 'Camioneta 4x4 con chofer', description: 'Camioneta 4x4 doble cabina con chofer, abono mensual', unit: 3, price: 5850000, perDay: 1 },
        ],
      },
      {
        key: 'andes_personal',
        name: 'Transporte de personal',
        number: 'AE-2025-0418',
        currency: 'ARS',
        startMonthsAgo: 10,
        months: 24,
        items: [
          { key: 'minibus_viaje', name: 'Minibús 19 asientos', description: 'Traslado de personal base-locación, por viaje', unit: 4, price: 285000, perDay: 2, needsEquipment: true },
        ],
      },
    ],
  },
  {
    key: 'vaca_muerta',
    name: 'Vaca Muerta Operaciones S.R.L.',
    cuit: '30712223334',
    email: 'proveedores@vmo-demo.com.ar',
    phone: '2994487722',
    address: 'Ruta 7 Km 104, Añelo',
    areas: ['Aguada Pichana', 'La Amarga Chica'],
    sectors: ['Fractura', 'Logística', 'Mantenimiento de pozos'],
    rigs: [
      { name: 'Set de fractura VMO-F1', type: 'Fractura' },
      { name: 'Coiled Tubing VMO-CT3', type: 'Coiled_Tubing' },
    ],
    contact: { name: 'Julián Ferreyra', role: 'Supervisor de logística' },
    contracts: [
      {
        key: 'vmo_fractura',
        name: 'Soporte logístico a sets de fractura',
        number: 'VMO-CT-2025-077',
        currency: 'USD',
        startMonthsAgo: 13,
        months: 18,
        items: [
          { key: 'cisterna_viaje', name: 'Camión cisterna de agua', description: 'Transporte de agua de fractura, por viaje de 30 m3', unit: 4, price: 420, perDay: 3 },
          { key: 'tractor_arena', name: 'Tractor para arena', description: 'Transporte de arena de fractura, por tonelada', unit: 8, price: 38, perDay: 3 },
          { key: 'torre_dia', name: 'Torre de iluminación', description: 'Torre de iluminación en locación, por día', unit: 2, price: 95, perDay: 1, needsPersonnel: false },
        ],
      },
    ],
  },
  {
    key: 'petro_comahue',
    name: 'Petro Comahue S.A.',
    cuit: '30714445556',
    email: 'contratos@petrocomahue-demo.com.ar',
    phone: '2994433310',
    address: 'Calle Brown 322, Cutral Có',
    areas: ['El Trapial', 'Puesto Hernández'],
    sectors: ['Producción', 'Recuperación secundaria'],
    rigs: [{ name: 'Pulling PC-12', type: 'Work_over' }],
    contact: { name: 'Carolina Benítez', role: 'Coordinadora de contratos' },
    contracts: [
      {
        key: 'pc_produccion',
        name: 'Servicios de apoyo a producción',
        number: 'PC-2025-133',
        currency: 'ARS',
        startMonthsAgo: 12,
        months: 12,
        items: [
          { key: 'camioneta_dia', name: 'Camioneta de recorredor', description: 'Camioneta 4x4 para recorrida de pozos, por día', unit: 2, price: 185000, perDay: 2 },
          { key: 'chasis_hora', name: 'Camión chasis con caja', description: 'Movimiento de materiales en yacimiento, por hora', unit: 1, price: 52000, perDay: 2 },
        ],
      },
    ],
  },
  {
    key: 'neuquen_og',
    name: 'Neuquén Oil & Gas S.A.',
    cuit: '30716667778',
    email: 'administracion@nqn-og-demo.com.ar',
    phone: '2994470055',
    address: 'Av. Olascoaga 890, Neuquén',
    areas: ['Rincón de los Sauces', 'Chihuido de la Sierra Negra'],
    sectors: ['Perforación', 'Instalaciones de superficie'],
    rigs: [{ name: 'Spudder NOG-3', type: 'Perforador_Spudder' }],
    contact: { name: 'Esteban Paredes', role: 'Gerente de operaciones' },
    contracts: [
      {
        key: 'nog_equipos',
        name: 'Alquiler de equipos pesados',
        number: 'NOG-2026-004',
        currency: 'ARS',
        startMonthsAgo: 8,
        months: 18,
        items: [
          { key: 'carreton_viaje', name: 'Tractor con carretón', description: 'Traslado de equipos pesados con carretón, por viaje', unit: 4, price: 1650000, perDay: 1 },
          { key: 'volcador_hora', name: 'Chasis con volcador', description: 'Movimiento de áridos, por hora', unit: 1, price: 58000, perDay: 2 },
          { key: 'generador_dia', name: 'Grupo electrógeno 60 kVA', description: 'Grupo electrógeno en locación, por día', unit: 2, price: 145000, perDay: 1, needsPersonnel: false },
        ],
      },
    ],
  },
  {
    key: 'anelo_servicios',
    name: 'Servicios Añelo S.A.',
    cuit: '30718889990',
    email: 'compras@servicios-anelo-demo.com.ar',
    phone: '2994490221',
    address: 'Parque Industrial Añelo, Lote 14',
    areas: ['Base Añelo'],
    sectors: ['Logística', 'Almacenes'],
    rigs: [],
    contact: { name: 'Rocío Sandoval', role: 'Responsable de almacenes' },
    contracts: [
      {
        key: 'sa_logistica',
        name: 'Distribución de materiales',
        number: 'SA-2025-051',
        currency: 'ARS',
        startMonthsAgo: 11,
        months: 12,
        items: [
          { key: 'chasis_km', name: 'Camión chasis', description: 'Distribución de materiales, por kilómetro recorrido', unit: 5, price: 2350, perDay: 2 },
        ],
      },
    ],
  },
  {
    key: 'cuenca_ep',
    name: 'Cuenca Neuquina E&P S.A.',
    cuit: '30719990001',
    email: 'contratos@cuenca-ep-demo.com.ar',
    phone: '2994455009',
    address: 'Leloir 1100, Neuquén',
    areas: ['Centenario'],
    sectors: ['Producción'],
    rigs: [],
    contact: { name: 'Gustavo Aranda', role: 'Jefe de yacimiento' },
    inactive: true,
    contracts: [
      {
        key: 'cep_2024',
        name: 'Transporte de personal (finalizado)',
        number: 'CEP-2024-210',
        currency: 'ARS',
        startMonthsAgo: 20,
        months: 12,
        items: [{ key: 'minibus_mes', name: 'Minibús abono mensual', description: 'Traslado de personal, abono mensual', unit: 3, price: 4200000, perDay: 0 }],
      },
    ],
  },
  {
    key: 'interno',
    id: KPI_FIXED_IDS.customerInternal,
    name: 'Movimientos Internos',
    cuit: '30716543210',
    email: 'operaciones@patagonia-demo.com.ar',
    phone: '2994480001',
    address: 'Ruta Provincial 7 Km 5, Neuquén',
    areas: ['Base Neuquén'],
    sectors: ['Taller', 'Base operativa'],
    rigs: [],
    contact: { name: 'Base operativa', role: 'Interno' },
    contracts: [
      {
        key: 'interno_movimientos',
        name: 'Movimientos internos de flota',
        number: 'INT-0001',
        currency: 'ARS',
        startMonthsAgo: 24,
        months: 60,
        items: [{ key: 'movimiento', name: 'Traslado interno', description: 'Movimiento de unidades entre base y taller', unit: 4, price: 0, perDay: 1 }],
      },
    ],
  },
];

export function customerId(def: Pick<CustomerDef, 'key' | 'id'>): string {
  return def.id ?? demoId('customer', def.key);
}

export const ACTIVE_CUSTOMERS = CUSTOMERS.filter((c) => !c.inactive);

/** Clientes externos activos (sin el interno): a los que se asignan empleados y equipos. */
export const EXTERNAL_CUSTOMERS = ACTIVE_CUSTOMERS.filter((c) => c.key !== 'interno');

/** Que equipo pide cada item. `other:` = equipo vario. */
export const ITEM_EQUIPMENT: Record<string, string> = {
  tractor_hora: 'tractor',
  hidrogrua_dia: 'hidrogrua',
  camioneta_mes: 'camioneta',
  minibus_viaje: 'minibus',
  cisterna_viaje: 'cisterna',
  tractor_arena: 'tractor',
  torre_dia: 'other:torre',
  camioneta_dia: 'camioneta',
  chasis_hora: 'chasis',
  carreton_viaje: 'tractor',
  volcador_hora: 'chasis',
  generador_dia: 'other:generador',
  chasis_km: 'chasis',
  minibus_mes: 'minibus',
  movimiento: 'tractor',
};

/** Lineas por dia que pide cada cliente de un tipo de equipo (o de personal, con `type` null). */
export function demandOf(customer: CustomerDef, type: string | null): number {
  return customer.contracts
    .flatMap((c) => c.items)
    .filter((i) => (type === null ? i.needsPersonnel ?? true : ITEM_EQUIPMENT[i.key] === type))
    .reduce((acc, i) => acc + Math.max(i.perDay, 1), 0);
}
