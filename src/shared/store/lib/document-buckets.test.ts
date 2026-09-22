import moment from 'moment';
import { describe, expect, it } from 'vitest';
import {
  buildDocumentBuckets,
  mapEmployeeDocument,
  type DocumentTypeInfo,
  type EmployeeDocumentInput,
  type EquipmentDocumentInput,
} from './document-buckets';

const type = (over: Partial<DocumentTypeInfo> = {}): DocumentTypeInfo => ({
  id: 't1',
  name: 'Apto',
  multiresource: false,
  mandatory: true,
  is_it_montlhy: false,
  applies: 'Persona',
  private: false,
  down_document: false,
  ...over,
});

const employeeDoc = (over: Partial<EmployeeDocumentInput> = {}): EmployeeDocumentInput => ({
  id: 'd1',
  created_at: new Date(2026, 0, 10, 12),
  validity: '15/10/2026',
  state: 'aprobado',
  period: null,
  document_path: 'a/b.pdf',
  employees: {
    id: 'e1',
    firstname: 'juan',
    lastname: 'perez',
    document_number: '123',
    is_active: true,
    termination_date: null,
    contractor_employee: [{ customers: { name: 'YPF' } }, { customers: null }],
  },
  document_types: type(),
  ...over,
});

const equipmentDoc = (over: Partial<EquipmentDocumentInput> = {}): EquipmentDocumentInput => ({
  id: 'q1',
  created_at: null,
  validity: 'No vence',
  state: 'presentado',
  period: null,
  document_path: 'x.pdf',
  vehicles: {
    id: 'v1',
    domain: 'AB123CD',
    intern_number: '77',
    serie: null,
    is_active: true,
    termination_date: null,
    types_of_vehicles: { name: 'Vehículos' },
  },
  document_types: type({ applies: 'Equipos' }),
  ...over,
});

const now = moment('2026-09-22', 'YYYY-MM-DD');

describe('mapEmployeeDocument', () => {
  it('capitaliza el recurso y arma afectaciones y flags Si/No', () => {
    const mapped = mapEmployeeDocument(employeeDoc());
    expect(mapped.resource).toBe('Perez Juan');
    expect(mapped.allocated_to).toBe('YPF, ');
    expect(mapped.mandatory).toBe('Si');
    expect(mapped.multiresource).toBe('No');
    expect(mapped.date).toBe('10/01/2026');
    expect(mapped.employee_id).toBe('e1');
  });
});

describe('buildDocumentBuckets', () => {
  it('lastMonth incluye vencidos o por vencer dentro del mes y excluye pendientes', () => {
    const docs = [
      employeeDoc({ id: 'vencido', validity: '01/01/2026' }),
      employeeDoc({ id: 'proximo', validity: '10/10/2026' }),
      employeeDoc({ id: 'lejano', validity: '10/12/2026' }),
      employeeDoc({ id: 'pendiente', validity: '01/01/2026', state: 'pendiente' }),
    ];
    const buckets = buildDocumentBuckets(docs, [], { now });
    expect(buckets.lastMonthDocuments.employees.map((d) => d.id)).toEqual(['vencido', 'proximo']);
  });

  it('Alldocuments excluye los presentados y los sin vencimiento; pending sólo presentados', () => {
    const docs = [
      employeeDoc({ id: 'ok' }),
      employeeDoc({ id: 'presentado', state: 'presentado' }),
      employeeDoc({ id: 'novence', validity: 'No vence' }),
      employeeDoc({ id: 'sinvalidez', validity: null }),
    ];
    const buckets = buildDocumentBuckets(docs, [], { now });
    expect(buckets.Alldocuments.employees.map((d) => d.id)).toEqual(['ok']);
    expect(buckets.pendingDocuments.employees.map((d) => d.id)).toEqual(['presentado']);
    expect(buckets.allDocumentsToShow.employees).toHaveLength(4);
  });

  it('documentos de baja sólo aplican a recursos dados de baja, y viceversa', () => {
    const docs = [
      employeeDoc({ id: 'activo-normal' }),
      employeeDoc({ id: 'activo-baja', document_types: type({ down_document: true }) }),
      employeeDoc({
        id: 'baja-normal',
        employees: { ...employeeDoc().employees!, termination_date: new Date('2026-01-01') },
      }),
      employeeDoc({
        id: 'baja-baja',
        document_types: type({ down_document: true }),
        employees: { ...employeeDoc().employees!, termination_date: new Date('2026-01-01') },
      }),
    ];
    const buckets = buildDocumentBuckets(docs, [], { now });
    expect(buckets.allDocumentsToShow.employees.map((d) => d.id)).toEqual(['activo-normal', 'baja-baja']);
  });

  it('el rol Invitado no ve los tipos privados', () => {
    const docs = [employeeDoc({ id: 'pub' }), employeeDoc({ id: 'priv', document_types: type({ private: true }) })];
    expect(buildDocumentBuckets(docs, [], { now, isGuest: true }).allDocumentsToShow.employees.map((d) => d.id)).toEqual(
      ['pub']
    );
    expect(buildDocumentBuckets(docs, [], { now }).allDocumentsToShow.employees).toHaveLength(2);
  });

  it('equipos: "No vence" no entra en lastMonth ni en Alldocuments pero sí en presentados', () => {
    const buckets = buildDocumentBuckets([], [equipmentDoc()], { now });
    expect(buckets.lastMonthDocuments.vehicles).toHaveLength(0);
    expect(buckets.Alldocuments.vehicles).toHaveLength(0);
    expect(buckets.pendingDocuments.vehicles[0]).toMatchObject({
      id: 'q1',
      resource: 'AB123CD',
      intern_number: '77',
      date: 'No vence',
      allocated_to: 'Vehículos',
    });
  });
});
