'use server';

import {
  getDocumentCompanyById,
  getDocumentEmployeesById,
  getDocumentEquipmentById,
} from '@/features/Documentacion/shared/actions/document-actions';
import { DOCUMENT_FILES_BUCKET, storagePublicUrl } from '@/shared/lib/storage';
import { resolveResourceKind } from '../lib/document-detail';

/**
 * Carga del detalle de un documento por id.
 *
 * Perímetro: las tres lecturas de `document-actions` ya acotan el documento a la empresa activa
 * (por `employees.company_id`, `vehicles.company_id` y `documents_company.applies`), así que un id
 * de otra empresa no devuelve nada. Acá sólo se decide en qué tabla buscar y se resuelve la URL
 * del archivo, que NO se expone como acción propia para que nadie pueda pedir la URL de un path
 * arbitrario.
 */

type EmployeeDocument = Awaited<ReturnType<typeof getDocumentEmployeesById>>[number];
type EquipmentDocument = Awaited<ReturnType<typeof getDocumentEquipmentById>>[number];
type CompanyDocument = Awaited<ReturnType<typeof getDocumentCompanyById>>[number];

/** Documento encontrado, discriminado por el recurso al que pertenece. */
export type DocumentDetail =
  | { resource: 'employee'; document: EmployeeDocument }
  | { resource: 'vehicle'; document: EquipmentDocument }
  | { resource: 'company'; document: CompanyDocument };

/** Empresa resuelta del documento (misma forma para la empresa dueña y la que solicita). */
export type DocumentCompanyInfo = CompanyDocument['company'];
/** Empleado al que aplica el documento, con ciudad, provincia, afectaciones y empresa resueltas. */
export type DocumentEmployee = NonNullable<EmployeeDocument['applies']>;
/** Equipo al que aplica el documento, con marca, modelo, tipo y empresa resueltos. */
export type DocumentVehicle = NonNullable<EquipmentDocument['applies']>;
/** Tipo de documento (`document_types`) tal como lo traen las tres lecturas. */
export type DocumentTypeInfo = NonNullable<CompanyDocument['document_types']>;

export type DocumentDetailResult = DocumentDetail & {
  /** URL pública del archivo en el bucket de documentos (cadena vacía si todavía no hay archivo). */
  fileUrl: string;
};

/**
 * Detalle del documento `id`. `resourceParam` es el `?resource=` de la URL; si falta o no se
 * reconoce, se busca en las tres tablas y gana la primera que devuelva una fila (mismo orden que
 * tenía la página: empleado → equipo → empresa).
 */
export async function getDocumentDetail(id: string, resourceParam?: string): Promise<DocumentDetailResult | null> {
  const kind = resolveResourceKind(resourceParam);

  let detail: DocumentDetail | null = null;

  if (kind === 'employee') {
    const [document] = await getDocumentEmployeesById(id);
    detail = document ? { resource: 'employee', document } : null;
  } else if (kind === 'vehicle') {
    const [document] = await getDocumentEquipmentById(id);
    detail = document ? { resource: 'vehicle', document } : null;
  } else if (kind === 'company') {
    const [document] = await getDocumentCompanyById(id);
    detail = document ? { resource: 'company', document } : null;
  } else {
    const [employeeRows, equipmentRows, companyRows] = await Promise.all([
      getDocumentEmployeesById(id),
      getDocumentEquipmentById(id),
      getDocumentCompanyById(id),
    ]);
    if (employeeRows[0]) detail = { resource: 'employee', document: employeeRows[0] };
    else if (equipmentRows[0]) detail = { resource: 'vehicle', document: equipmentRows[0] };
    else if (companyRows[0]) detail = { resource: 'company', document: companyRows[0] };
  }

  if (!detail) return null;

  const documentPath = detail.document.document_path ?? '';
  const fileUrl = documentPath ? await storagePublicUrl(DOCUMENT_FILES_BUCKET, documentPath) : '';
  return { ...detail, fileUrl };
}
