/** Catalogos de mantenimiento de la demo: talleres, sectores, reparaciones y el checklist diario. */

export interface WorkshopDef {
  key: string;
  name: string;
  type: 'interno' | 'externo';
  address: string;
  provider?: { name: string; phone: string; email: string };
  sectors: Array<{ key: string; name: string; capacity: number }>;
}

export const WORKSHOPS: WorkshopDef[] = [
  {
    key: 'base',
    name: 'Taller Base Neuquén',
    type: 'interno',
    address: 'Ruta Provincial 7 Km 5, Neuquén',
    sectors: [
      { key: 'pesada', name: 'Mecánica pesada', capacity: 4 },
      { key: 'liviana', name: 'Mecánica liviana', capacity: 3 },
      { key: 'electricidad', name: 'Electricidad', capacity: 2 },
      { key: 'gomeria', name: 'Gomería', capacity: 2 },
      { key: 'lubricacion', name: 'Lubricación', capacity: 2 },
    ],
  },
  {
    key: 'externo',
    name: 'Neuquén Diesel S.R.L.',
    type: 'externo',
    address: 'Av. Mosconi 3200, Neuquén',
    provider: { name: 'Neuquén Diesel S.R.L.', phone: '2994412233', email: 'turnos@nqndiesel-demo.com.ar' },
    // Un taller externo no tiene sectores: la app le asigna solo el taller (sector null).
    sectors: [],
  },
];

export interface RepairDef {
  key: string;
  name: string;
  description: string;
  kind: 'Preventivo' | 'Correctivo' | 'Otro';
  criticity: 'Alta' | 'Media' | 'Baja';
  /** Sectores del taller interno que la hacen; el primero es al que se asigna. */
  sectors: string[];
  /** Se terceriza en el taller externo (sin sector). */
  external?: boolean;
}

export const REPAIRS: RepairDef[] = [
  { key: 'service_15k', name: 'Service 15.000 km', description: 'Cambio de aceite de motor, filtros de aceite, aire y combustible', kind: 'Preventivo', criticity: 'Media', sectors: ['lubricacion', 'pesada'] },
  { key: 'aceite', name: 'Cambio de aceite y filtros', description: 'Cambio de aceite de motor y filtros', kind: 'Preventivo', criticity: 'Baja', sectors: ['lubricacion'] },
  { key: 'caja', name: 'Service de caja y diferencial', description: 'Cambio de aceite de caja y diferencial', kind: 'Preventivo', criticity: 'Media', sectors: ['lubricacion'] },
  { key: 'engrase', name: 'Engrase general', description: 'Engrase de crucetas, pernos y quinta rueda', kind: 'Preventivo', criticity: 'Baja', sectors: ['lubricacion'] },
  { key: 'frenos_prev', name: 'Revisión de frenos', description: 'Control de cintas, campanas y regulación', kind: 'Preventivo', criticity: 'Media', sectors: ['pesada', 'liviana'] },
  { key: 'frenos', name: 'Reparación de frenos', description: 'Cambio de cintas/pastillas y rectificación', kind: 'Correctivo', criticity: 'Alta', sectors: ['pesada', 'liviana'] },
  { key: 'embrague', name: 'Cambio de embrague', description: 'Reemplazo de kit de embrague', kind: 'Correctivo', criticity: 'Alta', sectors: ['pesada'] },
  { key: 'electrica', name: 'Reparación eléctrica', description: 'Diagnóstico y reparación del sistema eléctrico', kind: 'Correctivo', criticity: 'Media', sectors: ['electricidad'] },
  { key: 'luces', name: 'Reparación de luces', description: 'Cambio de ópticas y lámparas', kind: 'Correctivo', criticity: 'Baja', sectors: ['electricidad'] },
  { key: 'suspension', name: 'Reparación de suspensión', description: 'Cambio de amortiguadores, elásticos y bujes', kind: 'Correctivo', criticity: 'Media', sectors: ['pesada', 'liviana'] },
  { key: 'neumatico', name: 'Cambio de neumático', description: 'Reemplazo o reparación de neumático', kind: 'Correctivo', criticity: 'Media', sectors: ['gomeria'] },
  { key: 'aire', name: 'Reparación de aire acondicionado', description: 'Carga de gas y reparación de compresor', kind: 'Correctivo', criticity: 'Baja', sectors: ['electricidad'] },
  { key: 'perdida', name: 'Reparación de pérdida de aceite', description: 'Cambio de retenes y juntas', kind: 'Correctivo', criticity: 'Media', sectors: ['pesada', 'liviana'] },
  { key: 'diagnostico', name: 'Diagnóstico general', description: 'Revisión integral con scanner', kind: 'Otro', criticity: 'Baja', sectors: ['electricidad', 'pesada'] },
  { key: 'inyeccion', name: 'Reparación de inyección', description: 'Calibración y reparación de inyectores', kind: 'Correctivo', criticity: 'Alta', sectors: [], external: true },
];

export const REPAIR_GROUPS = [
  { key: 'service_completo', name: 'Service completo', description: 'Service de motor, caja y engrase', repairs: ['service_15k', 'caja', 'engrase'] },
  { key: 'frenos_completo', name: 'Frenos completo', description: 'Revisión y reparación del sistema de frenos', repairs: ['frenos_prev', 'frenos'] },
];

export interface ChecklistItemDef {
  code: string;
  label: string;
  /** Tipo de reparacion que dispara el desvio de este item (null = no va a taller). */
  repair: string | null;
  critical?: boolean;
}

/** Checklist diario de vehiculos: secciones y items con respuesta B (bueno) / M (malo) / N/A. */
export const CHECKLIST_SECTIONS: Array<{ code: string; name: string; items: ChecklistItemDef[] }> = [
  {
    code: 'DOC',
    name: 'Documentación a bordo',
    items: [
      { code: 'CEDULA', label: 'Cédula de identificación', repair: null },
      { code: 'SEGURO', label: 'Comprobante de seguro', repair: null },
      { code: 'LICENCIA', label: 'Licencia del conductor', repair: null },
    ],
  },
  {
    code: 'LUC',
    name: 'Luces',
    items: [
      { code: 'BAJAS', label: 'Luces bajas y altas', repair: 'luces', critical: true },
      { code: 'GIRO', label: 'Luces de giro y balizas', repair: 'luces' },
      { code: 'FRENO', label: 'Luces de freno', repair: 'luces', critical: true },
    ],
  },
  {
    code: 'NEU',
    name: 'Neumáticos',
    items: [
      { code: 'PRESION', label: 'Presión de neumáticos', repair: 'neumatico' },
      { code: 'DESGASTE', label: 'Desgaste de banda de rodamiento', repair: 'neumatico', critical: true },
      { code: 'AUXILIO', label: 'Rueda de auxilio', repair: 'neumatico' },
    ],
  },
  {
    code: 'FLU',
    name: 'Fluidos',
    items: [
      { code: 'ACEITE', label: 'Nivel de aceite de motor', repair: 'perdida' },
      { code: 'REFRIG', label: 'Nivel de refrigerante', repair: 'diagnostico' },
      { code: 'PERDIDAS', label: 'Pérdidas visibles', repair: 'perdida', critical: true },
    ],
  },
  {
    code: 'SEG',
    name: 'Elementos de seguridad',
    items: [
      { code: 'MATAFUEGO', label: 'Matafuego cargado y vigente', repair: null, critical: true },
      { code: 'BOTIQUIN', label: 'Botiquín', repair: null },
      { code: 'FRENOS', label: 'Funcionamiento de frenos', repair: 'frenos', critical: true },
      { code: 'CINTURONES', label: 'Cinturones de seguridad', repair: 'diagnostico' },
    ],
  },
];
