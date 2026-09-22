'use server';

import { documentTypeReadScope } from '@/features/Documentacion/TiposDocumentos/lib/document-type-scope';
import { Logger } from '@/lib/logger';
import { withActor } from '@/shared/lib/actor';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { DOCUMENT_FILES_BUCKET, storageRemove, storageUpload } from '@/shared/lib/storage';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { formatDocumentTypeName, formatPathSegment } from '@/shared/utils/legacy-mappers';
import moment from 'moment';

/**
 * Subida de un documento de EMPRESA (`documents_company`). Antes el navegador tocaba el storage
 * y la tabla por PostgREST; ahora el archivo viaja en un `FormData`, se sube en el servidor
 * (P3: storage) y la fila se escribe con Prisma dentro de `withActor`.
 *
 * FormData: `file`, `documentTypeId`, `validity?` (YYYY-MM-DD), `period?` (YYYY-MM).
 * Perímetro: la fila es siempre la de la empresa activa (`applies`), el tipo tiene que aplicar a
 * Empresa y ser global o de la empresa, y el usuario sale de la sesión.
 */
const logger = new Logger('features/Empresa/General/company-documents');

export type UploadCompanyDocumentResult = { ok: true } | { ok: false; error: string };

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === 'string' && value ? value : undefined;
}

export async function uploadCompanyDocument(formData: FormData): Promise<UploadCompanyDocumentResult> {
  const file = formData.get('file');
  const documentTypeId = formString(formData, 'documentTypeId');
  const validityRaw = formString(formData, 'validity');
  const period = formString(formData, 'period');

  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No se ha subido el archivo' };
  if (!documentTypeId) return { ok: false, error: 'Falta el tipo de documento' };

  const extension = file.name.split('.').pop();
  if (!extension || extension === file.name) return { ok: false, error: 'El archivo no tiene extensión' };

  // Acepta DD/MM/YYYY, YYYY-MM-DD o DD-MM-YYYY; siempre persiste como DD/MM/YYYY (validity es String en BD).
  const validityMoment = validityRaw ? moment(validityRaw, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;
  if (validityMoment && !validityMoment.isValid()) return { ok: false, error: 'Fecha de vencimiento inválida' };

  try {
    const companyId = await getActiveCompanyId();
    const credentialId = await getSessionUserId();
    if (!credentialId) return { ok: false, error: 'Sesión requerida' };

    const [company, docType, profile, existing] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId }, select: { company_name: true, company_cuit: true } }),
      prisma.document_types.findFirst({
        where: { id: documentTypeId, applies: 'Empresa', is_active: true, AND: [documentTypeReadScope(companyId)] },
        select: { name: true, explired: true, is_it_montlhy: true },
      }),
      prisma.profile.findUnique({ where: { credential_id: credentialId }, select: { id: true } }),
      prisma.documents_company.findFirst({
        where: { applies: companyId, id_document_types: documentTypeId },
        select: { id: true, document_path: true },
      }),
    ]);
    if (!company) return { ok: false, error: 'Empresa activa no encontrada' };
    if (!docType) return { ok: false, error: 'Tipo de documento no válido para la empresa' };
    if (!profile) return { ok: false, error: 'El usuario de sesión no tiene perfil' };
    if (docType.explired && !validityMoment) return { ok: false, error: 'Este documento requiere fecha de vencimiento' };
    if (docType.is_it_montlhy && !period) return { ok: false, error: 'Este documento requiere período' };
    if (existing?.document_path) return { ok: false, error: 'Este documento ya se encuentra subido' };

    // El nombre se normaliza: Storage rechaza tildes y ñ en la key con `InvalidKey`.
    const companyFolder = `${formatPathSegment(company.company_name)}-(${company.company_cuit})`;
    const validitySegment = validityMoment ? validityMoment.format('YYYY-MM-DD') : 'v0';
    const path = `${companyFolder}/empresa/${formatDocumentTypeName(docType.name)}-(${validitySegment}).${extension}`;

    const uploaded = await storageUpload(DOCUMENT_FILES_BUCKET, path, file); // P3: storage
    if (!uploaded.ok) {
      return {
        ok: false,
        error: /exists|duplicate/i.test(uploaded.error) ? 'Este documento ya se encuentra subido' : uploaded.error,
      };
    }

    const data = {
      validity: validityMoment ? validityMoment.format('DD/MM/YYYY') : null,
      period: period ?? null,
      user_id: profile.id,
      created_at: new Date(),
      state: 'presentado' as const,
      document_path: uploaded.data.path,
    };

    try {
      await withActor(credentialId, async (tx) => {
        if (existing) {
          await tx.documents_company.update({ where: { id: existing.id }, data });
        } else {
          await tx.documents_company.create({ data: { ...data, applies: companyId, id_document_types: documentTypeId } });
        }
      });
    } catch (dbError) {
      await storageRemove(DOCUMENT_FILES_BUCKET, [uploaded.data.path]); // compensación (P3: storage)
      throw dbError;
    }

    logger.info('Documento de empresa subido', { data: { companyId, documentTypeId } });
    return { ok: true };
  } catch (error) {
    logger.error('Error al subir documento de empresa', { data: { error, documentTypeId } });
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo subir el documento' };
  }
}
