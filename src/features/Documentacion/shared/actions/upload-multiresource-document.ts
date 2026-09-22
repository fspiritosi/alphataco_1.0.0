'use server';

import { Logger } from '@/lib/logger';
import { calculateNameOFDocument } from '@/lib/utils';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { DOCUMENT_FILES_BUCKET, storageRemove, storageUpload } from '@/shared/lib/storage';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { formatDocumentTypeName, formatPathSegment } from '@/shared/utils/legacy-mappers';
import moment from 'moment';
import { documentTypeCompanyScope } from '@/features/Documentacion/TiposDocumentos/lib/document-type-scope';
import { isPathWithinCompanyFolder } from '../lib/document-file-names';
import { normalizePeriod, planDocumentWrites, type ExistingDocumentRow } from '../lib/plan-writes';

const logger = new Logger('Documentacion/uploadMultiResourceDocument');

type Result = { ok: true; updated: number; created: number } | { ok: false; error: string };

type ResourceKind = 'empleado' | 'equipo';

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === 'string' && value ? value : undefined;
}

/**
 * Única vía de subida de documentos de empleados/equipos (`SimpleDocument` con N=1 y los
 * formularios multirecurso con N recursos). Sube el archivo al storage (P3: storage) y persiste
 * las filas en una transacción con actor por (recurso, tipo, período): actualiza las `pendiente`/
 * rechazadas/vencidas/archivadas de ese período, crea las ausentes e IGNORA las ya presentadas o
 * aprobadas con archivo para ese período (ver `lib/plan-writes.ts`). Si la transacción falla, borra
 * el archivo (compensación).
 *
 * FormData: `file`, `resource` ('empleado'|'equipo'), `documentTypeId`, `appliesIds` (JSON string[]),
 * `validity?` (ISO), `period?` (YYYY-MM), `policyNumber?` (sólo equipos), `sharedPath?`.
 * Sin `sharedPath` el servidor arma el nombre del archivo; si viene, tiene que estar dentro de la
 * carpeta de la empresa activa. El usuario que sube sale de la sesión, nunca del cliente.
 *
 * Perímetro: todos los `appliesIds` deben pertenecer a la empresa activa y el tipo de documento
 * ser global o de la empresa; si no, no se escribe nada.
 */
export async function uploadMultiResourceDocument(formData: FormData): Promise<Result> {
  const file = formData.get('file');
  const resource = formString(formData, 'resource');
  const documentTypeId = formString(formData, 'documentTypeId');
  const appliesRaw = formString(formData, 'appliesIds');
  const clientPath = formString(formData, 'sharedPath');
  const validityRaw = formString(formData, 'validity');
  const period = formString(formData, 'period');
  // Solo aplica a equipos (documents_equipment.policy_number)
  const policyNumber = formString(formData, 'policyNumber');

  if (!(file instanceof File) || file.size === 0 || !resource || !documentTypeId || !appliesRaw) {
    return { ok: false, error: 'Faltan datos para subir el documento' };
  }
  if (resource !== 'empleado' && resource !== 'equipo') {
    return { ok: false, error: 'Tipo de recurso inválido' };
  }

  let appliesIds: string[];
  try {
    const parsed: unknown = JSON.parse(appliesRaw);
    if (!Array.isArray(parsed) || !parsed.every((id): id is string => typeof id === 'string')) {
      return { ok: false, error: 'Lista de recursos inválida' };
    }
    appliesIds = [...new Set(parsed)];
  } catch {
    return { ok: false, error: 'Lista de recursos inválida' };
  }
  if (!appliesIds.length) return { ok: false, error: 'No hay recursos para vincular' };

  const validity = validityRaw ? new Date(validityRaw) : null;
  if (validity && Number.isNaN(validity.getTime())) return { ok: false, error: 'Fecha de vencimiento inválida' };

  const companyId = await getActiveCompanyId();
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: 'Sesión requerida' };

  // ─── Perímetro: empresa, tipo de documento y recursos ──────────────────────
  const [company, docType, resources] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { company_name: true, company_cuit: true } }),
    prisma.document_types.findFirst({
      where: { id: documentTypeId, is_active: true, AND: [documentTypeCompanyScope(companyId)] },
      select: { name: true, applies: true },
    }),
    loadOwnedResources(resource, appliesIds, companyId),
  ]);
  if (!company) return { ok: false, error: 'Empresa activa no encontrada' };
  if (!docType || docType.applies !== (resource === 'empleado' ? 'Persona' : 'Equipos')) {
    return { ok: false, error: 'Tipo de documento no válido para este recurso' };
  }
  if (resources.length !== appliesIds.length) {
    logger.warn('Intento de subir documento a recursos de otra empresa', {
      data: { resource, companyId, requested: appliesIds.length, owned: resources.length },
    });
    return { ok: false, error: 'Alguno de los recursos no pertenece a la empresa activa' };
  }

  // ─── Nombre del archivo ────────────────────────────────────────────────────
  const extension = file.name.split('.').pop();
  if (!extension || extension === file.name) return { ok: false, error: 'El archivo no tiene extensión' };
  const companyFolder = `${formatPathSegment(company.company_name)}-(${company.company_cuit})/`;
  let sharedPath: string;
  if (clientPath) {
    if (!isPathWithinCompanyFolder(clientPath, companyFolder)) {
      return { ok: false, error: 'Ruta de archivo inválida' };
    }
    sharedPath = clientPath;
  } else {
    sharedPath = buildServerPath({ company, docType, resource, resources, validity, period, extension });
  }

  // ─── Qué filas escribir, por (recurso, tipo, período) — antes de subir ─────
  // Semántica legacy: un tipo mensual admite una fila por período; sólo choca la misma
  // (recurso, tipo, período) ya presentada/aprobada con archivo. N=1 lo informa; multi la ignora.
  const targetPeriod = normalizePeriod(period);
  const plan = planDocumentWrites(await loadExistingRows(resource, appliesIds, documentTypeId), appliesIds, period);
  if (appliesIds.length === 1 && plan.alreadyUploaded.length === 1) {
    return {
      ok: false,
      error: targetPeriod
        ? `El documento ya ha sido subido para el período ${targetPeriod}`
        : 'El documento ya ha sido subido anteriormente',
    };
  }
  if (plan.toUpdate.length + plan.toCreate.length === 0) {
    // Multi: todos ya lo tienen para ese período → nada que escribir, no se sube un archivo huérfano.
    return { ok: true, updated: 0, created: 0 };
  }

  // 1. Subir el archivo al storage (upsert: documento compartido por varios recursos)
  const uploaded = await storageUpload(DOCUMENT_FILES_BUCKET, sharedPath, file, { cacheControl: '0', upsert: true });
  if (!uploaded.ok) {
    return { ok: false, error: 'No se pudo subir el archivo al storage' };
  }

  // 2. Persistir en una transacción con actor (triggers de status/logs)
  try {
    const common = {
      state: 'presentado' as const,
      document_path: sharedPath,
      validity,
      user_id: userId,
    };
    // La fila que se actualiza ya tiene este período (se buscó por él): sólo se escribe si vino
    // en el form, nunca se borra un período existente.
    const updateWhere = { id_document_types: documentTypeId, period: targetPeriod };
    const periodData = targetPeriod ? { period: targetPeriod } : {};
    await withActor(userId, async (tx) => {
      if (resource === 'empleado') {
        if (plan.toUpdate.length) {
          await tx.documents_employees.updateMany({
            where: { applies: { in: plan.toUpdate }, ...updateWhere },
            data: {
              ...common,
              ...periodData,
              // 411: si la fila estaba archivada ("ya no aplica"), subir un archivo la reactiva.
              archived_at: null,
              // Reflejar el momento real de la subida (estas filas existían como `pendiente`).
              created_at: new Date(),
            },
          });
        }
        if (plan.toCreate.length) {
          await tx.documents_employees.createMany({
            data: plan.toCreate.map((applies) => ({
              ...common,
              period: targetPeriod,
              applies,
              id_document_types: documentTypeId,
            })),
          });
        }
        return;
      }
      const equipmentData = { ...common, policy_number: policyNumber ?? null };
      if (plan.toUpdate.length) {
        await tx.documents_equipment.updateMany({
          where: { applies: { in: plan.toUpdate }, ...updateWhere },
          data: { ...equipmentData, ...periodData, archived_at: null, created_at: new Date() },
        });
      }
      if (plan.toCreate.length) {
        await tx.documents_equipment.createMany({
          data: plan.toCreate.map((applies) => ({
            ...equipmentData,
            period: targetPeriod,
            applies,
            id_document_types: documentTypeId,
          })),
        });
      }
    });
    return { ok: true, updated: plan.toUpdate.length, created: plan.toCreate.length };
  } catch (error) {
    // Compensación: la BD falló → borrar el archivo subido para no dejar huérfanos
    logger.error('Error al persistir documentos multirecurso; revirtiendo storage', { data: { error } });
    await storageRemove(DOCUMENT_FILES_BUCKET, [sharedPath]);
    return { ok: false, error: 'No se pudieron guardar los documentos. Se revirtió la subida.' };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

type OwnedResource = { id: string; name: string; document: string };

/** Recursos de la empresa activa entre los pedidos (perímetro), con nombre y documento para el path. */
async function loadOwnedResources(resource: ResourceKind, ids: string[], companyId: string): Promise<OwnedResource[]> {
  if (resource === 'empleado') {
    const rows = await prisma.employees.findMany({
      where: { id: { in: ids }, company_id: companyId },
      select: { id: true, firstname: true, lastname: true, document_number: true },
    });
    return rows.map((r) => ({ id: r.id, name: `${r.firstname} ${r.lastname}`, document: r.document_number }));
  }
  const rows = await prisma.vehicles.findMany({
    where: { id: { in: ids }, company_id: companyId },
    select: { id: true, domain: true, serie: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.domain || r.serie || '', document: r.serie || r.domain || '' }));
}

/**
 * Path del archivo cuando el cliente no lo manda:
 * - N=1 → `<empresa>/<persona|equipos>/<nombre>-(<documento>)/<tipo>-(<marca>).<ext>`
 * - N>1 → `<empresa>/multirecursos/<persona|equipos>/<tipo>-(<marca>).<ext>`
 * `<marca>` = fecha de vencimiento `DD-MM-YYYY`, período o `v0`.
 */
function buildServerPath(input: {
  company: { company_name: string; company_cuit: string };
  docType: { name: string };
  resource: ResourceKind;
  resources: OwnedResource[];
  validity: Date | null;
  period: string | undefined;
  extension: string;
}): string {
  const { company, docType, resource, resources, validity, period, extension } = input;
  const resourceFolder = resource === 'empleado' ? 'persona' : 'equipos';
  const version = validity ? moment(validity).format('DD-MM-YYYY') : period || 'v0';
  if (resources.length === 1) {
    // Carpeta por recurso `<nombre>-(<documento>)`: se arma a mano porque `calculateNameOFDocument`
    // normaliza el segmento y perdería los paréntesis que usan las carpetas existentes.
    const target = resources[0];
    const companyFolder = `${formatPathSegment(company.company_name)}-(${company.company_cuit})`;
    const resourceSegment = `${formatPathSegment(target.name)}-(${target.document})`;
    const fileName = `${formatDocumentTypeName(docType.name)}-(${version}).${extension.replace(/\./g, '-')}`;
    return `${companyFolder}/${resourceFolder}/${resourceSegment}/${fileName}`;
  }
  return calculateNameOFDocument(
    company.company_name,
    company.company_cuit,
    resourceFolder,
    docType.name,
    version,
    extension,
    'multirecursos'
  );
}

/** Filas existentes del tipo para los recursos pedidos (todos los períodos; `planDocumentWrites` filtra). */
async function loadExistingRows(
  resource: ResourceKind,
  appliesIds: string[],
  documentTypeId: string
): Promise<ExistingDocumentRow[]> {
  const where = { applies: { in: appliesIds }, id_document_types: documentTypeId };
  const select = { applies: true, state: true, document_path: true, period: true, archived_at: true } as const;
  return resource === 'empleado'
    ? prisma.documents_employees.findMany({ where, select })
    : prisma.documents_equipment.findMany({ where, select });
}

export type UploadMultiResourceDocumentResult = Awaited<ReturnType<typeof uploadMultiResourceDocument>>;
