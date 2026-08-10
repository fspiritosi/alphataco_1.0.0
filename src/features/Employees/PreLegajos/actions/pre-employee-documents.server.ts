'use server';

import { checkPermissionServer } from '@/features/Permissions/actionsServer';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { requireServerAuthProfile } from '@/shared/actions/auth.actions';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';

const logger = new Logger('features/PreLegajos/documents');

const STORAGE_BUCKET = 'document-files';

type UploadResult = { ok: true; documentPath: string } | { ok: false; error: string };

/**
 * Checklist de documentos de un pre legajo: los tipos habilitados para pre legajo
 * (`available_for_pre_file`) cruzados con lo que el postulante ya subio.
 *
 * No hay motor de alertas: solo existen filas para documentos efectivamente cargados,
 * y nada de esto entra en el status documental ni en las estadisticas de empleados.
 */
export async function getPreEmployeeDocumentChecklist(preEmployeeId: string) {
  logger.debug('Obteniendo checklist de documentos', { data: { preEmployeeId } });

  try {
    const [documentTypes, uploaded] = await Promise.all([
      prisma.document_types.findMany({
        where: { available_for_pre_file: true, is_active: true, applies: 'Persona' },
        select: { id: true, name: true, mandatory: true, explired: true, description: true },
        orderBy: [{ mandatory: 'desc' }, { name: 'asc' }],
      }),
      prisma.documents_pre_employees.findMany({
        where: { pre_employee_id: preEmployeeId },
        select: { id: true, document_type_id: true, document_path: true, validity: true, uploaded_at: true },
      }),
    ]);

    const uploadedByType = new Map(uploaded.map((document) => [document.document_type_id, document]));

    return documentTypes.map((documentType) => ({
      documentType,
      document: uploadedByType.get(documentType.id) ?? null,
    }));
  } catch (error) {
    logger.error('Error al obtener el checklist de documentos', { data: { error, preEmployeeId } });
    throw error;
  }
}

export type PreEmployeeChecklistItem = Awaited<ReturnType<typeof getPreEmployeeDocumentChecklist>>[number];

/** Arma la ruta del archivo dentro del bucket, con el mismo esquema que el resto del sistema. */
function buildStoragePath(params: {
  companyName: string;
  companyCuit: string;
  preFileNumber: string;
  fullName: string;
  documentTypeName: string;
  fileExtension: string;
}) {
  const slug = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-');

  return `${slug(params.companyName)}-(${params.companyCuit})/pre-legajo/${params.preFileNumber}-${slug(
    params.fullName
  )}/${slug(params.documentTypeName)}.${params.fileExtension}`;
}

/**
 * Sube (o reemplaza) un documento del checklist del pre legajo.
 * Si la persistencia falla, borra el archivo para no dejarlo huerfano en el storage.
 */
export async function uploadPreEmployeeDocument(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file') as File | null;
  const preEmployeeId = formData.get('preEmployeeId') as string | null;
  const documentTypeId = formData.get('documentTypeId') as string | null;
  const validityRaw = (formData.get('validity') as string | null) || undefined;

  if (!file || !preEmployeeId || !documentTypeId) {
    return { ok: false, error: 'Faltan datos para subir el documento' };
  }

  const hasPermission = await checkPermissionServer('empleados', 'pre-legajos', 'update');
  if (!hasPermission) return { ok: false, error: 'No tenés permiso para cargar documentos del pre legajo' };

  const profile = await requireServerAuthProfile();

  const [preEmployee, documentType] = await Promise.all([
    prisma.pre_employees.findUnique({
      where: { id: preEmployeeId },
      select: {
        id: true,
        status: true,
        pre_file_number: true,
        firstname: true,
        lastname: true,
        company: { select: { company_name: true, company_cuit: true } },
      },
    }),
    prisma.document_types.findUnique({
      where: { id: documentTypeId },
      select: { id: true, name: true, available_for_pre_file: true },
    }),
  ]);

  if (!preEmployee) return { ok: false, error: 'El pre legajo no existe' };
  if (!documentType?.available_for_pre_file) {
    return { ok: false, error: 'Ese tipo de documento no está habilitado para pre legajos' };
  }
  if (preEmployee.status === 'legajo') {
    return { ok: false, error: 'El pre legajo ya fue convertido: los documentos se cargan desde el legajo' };
  }
  if (preEmployee.status === 'rechazado') {
    return { ok: false, error: 'El pre legajo está rechazado: hay que reabrirlo para cargar documentos' };
  }

  const fileExtension = file.name.split('.').pop() ?? 'pdf';
  const documentPath = buildStoragePath({
    companyName: preEmployee.company.company_name,
    companyCuit: preEmployee.company.company_cuit,
    preFileNumber: preEmployee.pre_file_number,
    fullName: `${preEmployee.lastname} ${preEmployee.firstname}`,
    documentTypeName: documentType.name,
    fileExtension,
  });

  const supabase = await supabaseServer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(documentPath, file, { cacheControl: '0', upsert: true });

  if (uploadError) {
    logger.error('Error al subir el documento del pre legajo al storage', { data: { uploadError, documentPath } });
    return { ok: false, error: 'No se pudo subir el archivo' };
  }

  try {
    await prisma.documents_pre_employees.upsert({
      where: {
        pre_employee_id_document_type_id: { pre_employee_id: preEmployeeId, document_type_id: documentTypeId },
      },
      create: {
        pre_employee_id: preEmployeeId,
        document_type_id: documentTypeId,
        document_path: documentPath,
        validity: validityRaw ? new Date(validityRaw) : null,
        user_id: profile.id,
      },
      update: {
        document_path: documentPath,
        validity: validityRaw ? new Date(validityRaw) : null,
        user_id: profile.id,
        uploaded_at: new Date(),
      },
    });

    logger.info('Documento de pre legajo cargado', { data: { preEmployeeId, documentTypeId } });
    revalidatePath('/dashboard/employee/pre-legajo');
    return { ok: true, documentPath };
  } catch (error) {
    // Compensacion: la BD fallo, no dejamos el archivo huerfano
    logger.error('Error al persistir el documento; revirtiendo storage', { data: { error, documentPath } });
    await supabase.storage.from(STORAGE_BUCKET).remove([documentPath]);
    return { ok: false, error: 'No se pudo guardar el documento. Se revirtió la subida.' };
  }
}

/** Quita un documento del checklist (borra la fila y el archivo). */
export async function deletePreEmployeeDocument(documentId: string) {
  logger.debug('Eliminando documento de pre legajo', { data: { documentId } });

  const hasPermission = await checkPermissionServer('empleados', 'pre-legajos', 'update');
  if (!hasPermission) throw new Error('No tenés permiso para eliminar documentos del pre legajo');

  const document = await prisma.documents_pre_employees.findUniqueOrThrow({
    where: { id: documentId },
    select: { id: true, document_path: true, pre_employees: { select: { status: true } } },
  });

  if (document.pre_employees.status === 'legajo') {
    throw new Error('El pre legajo ya fue convertido: no se pueden borrar sus documentos');
  }

  try {
    await prisma.documents_pre_employees.delete({ where: { id: documentId } });

    const supabase = await supabaseServer();
    await supabase.storage.from(STORAGE_BUCKET).remove([document.document_path]);

    revalidatePath('/dashboard/employee/pre-legajo');
  } catch (error) {
    logger.error('Error al eliminar el documento del pre legajo', { data: { error, documentId } });
    throw error;
  }
}

/** URL firmada para ver o descargar un documento del pre legajo. */
export async function getPreEmployeeDocumentUrl(documentPath: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(documentPath, 60 * 5);

  if (error) {
    logger.error('Error al generar la URL del documento', { data: { error, documentPath } });
    throw new Error('No se pudo generar el enlace del documento');
  }

  return data.signedUrl;
}
