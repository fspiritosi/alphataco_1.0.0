import moment from 'moment';

/**
 * Lógica pura (extraída de `documetsFetch` del store `loggedUser`) que clasifica los
 * documentos de empleados y equipos en los buckets que muestra el dashboard:
 * todos, vencidos/por vencer, último mes, presentados (pendientes de aprobar).
 */
export interface StoreDocument {
  date: string;
  allocated_to: string | undefined;
  documentName: string | undefined;
  state: string;
  multiresource: string;
  isItMonthly: boolean;
  validity: string;
  mandatory: string;
  id: string;
  resource: string;
  document_number?: string;
  employee_id?: string;
  vehicle_id?: string;
  resource_id?: string;
  document_url?: string;
  document_path?: string;
  is_active: boolean;
  period: string | null;
  applies: string;
  id_document_types: string;
  intern_number: string | null;
  serie?: string | null;
}

export interface DocumentTypeInfo {
  id: string;
  name: string;
  multiresource: boolean;
  mandatory: boolean;
  is_it_montlhy: boolean | null;
  applies: string;
  private: boolean | null;
  down_document: boolean | null;
}

export interface EmployeeDocumentInput {
  id: string;
  created_at: Date | string | null;
  validity: string | null;
  state: string | null;
  period: string | null;
  document_path: string | null;
  employees: {
    id: string;
    firstname: string;
    lastname: string;
    document_number: string;
    is_active: boolean | null;
    termination_date: Date | string | null;
    contractor_employee: Array<{ customers: { name: string } | null }>;
  } | null;
  document_types: DocumentTypeInfo | null;
}

export interface EquipmentDocumentInput {
  id: string;
  created_at: Date | string | null;
  validity: string | null;
  state: string | null;
  period: string | null;
  document_path: string | null;
  vehicles: {
    id: string;
    domain: string | null;
    intern_number: string | null;
    serie: string | null;
    is_active: boolean | null;
    termination_date: Date | string | null;
    types_of_vehicles: { name: string | null } | null;
  } | null;
  document_types: DocumentTypeInfo | null;
}

export interface DocumentBuckets {
  allDocumentsToShow: { employees: StoreDocument[]; vehicles: StoreDocument[] };
  Alldocuments: { employees: StoreDocument[]; vehicles: StoreDocument[] };
  lastMonthDocuments: { employees: StoreDocument[]; vehicles: StoreDocument[] };
  pendingDocuments: { employees: StoreDocument[]; vehicles: StoreDocument[] };
}

const capitalize = (value: string | undefined) => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '');

export function mapEmployeeDocument(doc: EmployeeDocumentInput): StoreDocument {
  const type = doc.document_types;
  return {
    date: moment(doc.created_at ?? undefined).format('DD/MM/YYYY'),
    allocated_to: doc.employees?.contractor_employee?.map((ce) => ce.customers?.name).join(', '),
    documentName: type?.name,
    state: doc.state ?? '',
    multiresource: type?.multiresource ? 'Si' : 'No',
    isItMonthly: type?.is_it_montlhy ?? false,
    validity: doc.validity ?? '',
    mandatory: type?.mandatory ? 'Si' : 'No',
    id: doc.id,
    resource: `${capitalize(doc.employees?.lastname)} ${capitalize(doc.employees?.firstname)}`,
    document_number: doc.employees?.document_number,
    employee_id: doc.employees?.id,
    document_url: doc.document_path ?? undefined,
    document_path: doc.document_path ?? undefined,
    is_active: doc.employees?.is_active ?? false,
    period: doc.period,
    applies: type?.applies ?? '',
    id_document_types: type?.id ?? '',
    intern_number: null,
  };
}

export function mapEquipmentDocument(doc: EquipmentDocumentInput): StoreDocument {
  const type = doc.document_types;
  return {
    date: doc.created_at ? moment(doc.created_at).format('DD/MM/YYYY') : 'No vence',
    allocated_to: doc.vehicles?.types_of_vehicles?.name ?? undefined,
    documentName: type?.name,
    state: doc.state ?? '',
    multiresource: type?.multiresource ? 'Si' : 'No',
    isItMonthly: type?.is_it_montlhy ?? false,
    validity: doc.validity ?? '',
    mandatory: type?.mandatory ? 'Si' : 'No',
    id: doc.id,
    resource: `${doc.vehicles?.domain}`,
    vehicle_id: doc.vehicles?.id,
    resource_id: doc.vehicles?.id,
    is_active: doc.vehicles?.is_active ?? false,
    period: doc.period,
    applies: type?.applies ?? '',
    id_document_types: type?.id ?? '',
    intern_number: `${doc.vehicles?.intern_number}`,
    serie: doc.vehicles?.serie,
    document_url: doc.document_path ?? undefined,
    document_path: doc.document_path ?? undefined,
  };
}

/** Regla legacy: docs de recursos activos salvo los tipos "de baja", que aplican a los dados de baja. */
function appliesToResource(terminationDate: Date | string | null | undefined, downDocument: boolean | null | undefined) {
  return (!terminationDate && !downDocument) || (!!terminationDate && !!downDocument);
}

function isExpiringSoon(validity: string | null, state: string | null, today: moment.Moment, nextMonth: moment.Moment) {
  if (!validity) return false;
  const date = moment(validity, 'DD/MM/YYYY');
  return date.isBefore(today) || date.isBefore(nextMonth) || state === 'Vencido';
}

const hasValidity = (validity: string | null) => !!validity && validity !== 'No vence';

/**
 * Clasifica los documentos. `isGuest` (rol Invitado) excluye los tipos privados.
 * `now` es inyectable para los tests.
 */
export function buildDocumentBuckets(
  employeeDocs: EmployeeDocumentInput[],
  equipmentDocs: EquipmentDocumentInput[],
  { isGuest = false, now = moment() }: { isGuest?: boolean; now?: moment.Moment } = {}
): DocumentBuckets {
  const today = now.clone().startOf('day');
  const nextMonth = now.clone().add(1, 'month').endOf('day');

  const employees = employeeDocs
    .filter((doc) => !isGuest || !doc.document_types?.private)
    .filter((doc) => appliesToResource(doc.employees?.termination_date, doc.document_types?.down_document));
  const vehicles = equipmentDocs
    .filter((doc) => !isGuest || !doc.document_types?.private)
    .filter((doc) => appliesToResource(doc.vehicles?.termination_date, doc.document_types?.down_document));

  return {
    allDocumentsToShow: {
      employees: employees.map(mapEmployeeDocument),
      vehicles: vehicles.map(mapEquipmentDocument),
    },
    Alldocuments: {
      employees: employees
        .filter((doc) => hasValidity(doc.validity) && doc.state !== 'presentado')
        .map(mapEmployeeDocument),
      vehicles: vehicles
        .filter((doc) => hasValidity(doc.validity) && doc.state !== 'presentado')
        .map(mapEquipmentDocument),
    },
    lastMonthDocuments: {
      employees: employees
        .filter((doc) => isExpiringSoon(doc.validity, doc.state, today, nextMonth))
        .filter((doc) => !!doc.validity && doc.state !== 'pendiente')
        .map(mapEmployeeDocument),
      vehicles: vehicles
        .filter((doc) => isExpiringSoon(doc.validity, doc.state, today, nextMonth))
        .filter((doc) => hasValidity(doc.validity) && doc.state !== 'pendiente')
        .map(mapEquipmentDocument),
    },
    pendingDocuments: {
      employees: employees.filter((doc) => doc.state === 'presentado').map(mapEmployeeDocument),
      vehicles: vehicles.filter((doc) => doc.state === 'presentado').map(mapEquipmentDocument),
    },
  };
}
