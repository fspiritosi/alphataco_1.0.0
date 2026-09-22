'use server';

import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { storageRemove, storageSignedUrls, storageUpload } from '@/shared/lib/storage'; // P3: storage
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { revalidatePath } from 'next/cache';
import { errorMessage, fail, ok, type ActionResult } from '../lib/action-result';
import { diffAssignments } from '../lib/assignment-diff';
import {
  buildContractDocumentPath,
  classifyDocumentType,
  CONTRACT_DOCUMENTS_BUCKET,
} from '../lib/contract-documents';
import { serviceFormSchema, type ServiceFormValues } from '../schemas/service';

const logger = new Logger('features/Empresa/Clientes/services');

const COMERCIAL_PATH = '/dashboard/comercial';

const serviceInclude = {
  customers: { select: { id: true, name: true } },
  service_areas: {
    select: {
      area_id: true,
      areas_cliente: { select: { id: true, nombre: true, descripcion_corta: true } },
    },
  },
  service_sectors: {
    select: { sector_id: true, sectors: { select: { id: true, name: true } } },
  },
} satisfies Prisma.customer_servicesInclude;

/** Contratos de la empresa activa con cliente, áreas y sectores; ordenados por nombre. */
export async function getCustomerServices() {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.customer_services.findMany({
      where: withCompany({}, companyId),
      include: serviceInclude,
      orderBy: { service_name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener contratos', { data: { error, companyId } });
    throw error;
  }
}

export type CustomerServiceRow = Awaited<ReturnType<typeof getCustomerServices>>[number];

/**
 * Contratos activos de un cliente de la empresa activa (para vincular áreas recién creadas).
 */
export async function getActiveContractsByCustomer(customerId: string) {
  const companyId = await getActiveCompanyId();
  try {
    return await prisma.customer_services.findMany({
      where: { customer_id: customerId, company_id: companyId, is_active: true },
      select: { id: true, service_name: true, contract_number: true, service_start: true, service_validity: true },
      orderBy: { service_name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al cargar contratos del cliente', { data: { error, customerId } });
    throw error;
  }
}

export type ActiveContract = Awaited<ReturnType<typeof getActiveContractsByCustomer>>[number];

/** Verifica que el contrato pertenezca a la empresa activa; devuelve su cliente. */
async function findOwnedService(serviceId: string, companyId: string) {
  return prisma.customer_services.findFirst({
    where: { id: serviceId, company_id: companyId },
    select: { id: true, customer_id: true, service_name: true, customers: { select: { name: true } } },
  });
}

/** Áreas y sectores del cliente (los ids del formulario tienen que pertenecer a ese cliente). */
async function assertAreasAndSectorsBelongToCustomer(
  customerId: string,
  areaIds: string[],
  sectorIds: string[]
): Promise<void> {
  const [areas, sectors] = await Promise.all([
    areaIds.length ? prisma.areas_cliente.count({ where: { id: { in: areaIds }, customer_id: customerId } }) : 0,
    sectorIds.length
      ? prisma.sectors.count({ where: { id: { in: sectorIds }, sector_customer: { some: { customer_id: customerId } } } })
      : 0,
  ]);
  if (areas !== areaIds.length) throw new Error('Una o más áreas no pertenecen al cliente');
  if (sectors !== sectorIds.length) throw new Error('Uno o más sectores no pertenecen al cliente');
}

function isForeignKeyError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

const FK_IN_USE_MESSAGE = 'No se pueden quitar áreas o sectores que están siendo utilizados en partes diarios';

/** Alta de contrato con sus áreas y sectores. */
export async function createCustomerService(input: ServiceFormValues): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  const values = parsed.data;

  const companyId = await getActiveCompanyId();
  try {
    const customer = await prisma.customers.findFirst({
      where: { id: values.customer_id, company_id: companyId },
      select: { id: true },
    });
    if (!customer) return fail('Cliente no encontrado');
    await assertAreasAndSectorsBelongToCustomer(values.customer_id, values.area_id, values.sector_id);

    const created = await prisma.$transaction(async (tx) => {
      const service = await tx.customer_services.create({
        data: {
          company_id: companyId,
          customer_id: values.customer_id,
          service_name: values.service_name,
          contract_number: values.contract_number || '',
          service_start: values.service_start,
          service_validity: values.service_validity,
          is_active: values.is_active,
        },
        select: { id: true },
      });
      if (values.area_id.length > 0) {
        await tx.service_areas.createMany({
          data: values.area_id.map((area_id) => ({ service_id: service.id, area_id })),
        });
      }
      if (values.sector_id.length > 0) {
        await tx.service_sectors.createMany({
          data: values.sector_id.map((sector_id) => ({ service_id: service.id, sector_id })),
        });
      }
      return service;
    });

    logger.info('Contrato creado', { data: { serviceId: created.id } });
    revalidatePath(COMERCIAL_PATH);
    return ok({ id: created.id });
  } catch (error) {
    logger.error('Error al crear el contrato', { data: { error } });
    return fail(errorMessage(error, 'Error al crear el contrato'));
  }
}

/**
 * Edición de contrato. Áreas y sectores se reconcilian contra la base con altas y bajas
 * explícitas (`diffAssignments`): el formulario se renderiza desde el servidor para UN
 * contrato, así que la selección final es la fuente de verdad de ese contrato.
 */
export async function updateCustomerService(
  serviceId: string,
  input: ServiceFormValues
): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos');
  const values = parsed.data;

  const companyId = await getActiveCompanyId();
  try {
    const service = await findOwnedService(serviceId, companyId);
    if (!service) return fail('Contrato no encontrado');
    const customer = await prisma.customers.findFirst({
      where: { id: values.customer_id, company_id: companyId },
      select: { id: true },
    });
    if (!customer) return fail('Cliente no encontrado');
    await assertAreasAndSectorsBelongToCustomer(values.customer_id, values.area_id, values.sector_id);

    const [currentAreas, currentSectors] = await Promise.all([
      prisma.service_areas.findMany({ where: { service_id: serviceId }, select: { area_id: true } }),
      prisma.service_sectors.findMany({ where: { service_id: serviceId }, select: { sector_id: true } }),
    ]);
    const areas = diffAssignments(
      currentAreas.map((a) => a.area_id),
      values.area_id
    );
    const sectors = diffAssignments(
      currentSectors.map((s) => s.sector_id),
      values.sector_id
    );

    await prisma.$transaction(async (tx) => {
      await tx.customer_services.update({
        where: { id: serviceId },
        data: {
          customer_id: values.customer_id,
          service_name: values.service_name,
          contract_number: values.contract_number || '',
          service_start: values.service_start,
          service_validity: values.service_validity,
          is_active: values.is_active,
        },
      });
      if (areas.toRemove.length > 0) {
        await tx.service_areas.deleteMany({ where: { service_id: serviceId, area_id: { in: areas.toRemove } } });
      }
      if (areas.toAdd.length > 0) {
        await tx.service_areas.createMany({
          data: areas.toAdd.map((area_id) => ({ service_id: serviceId, area_id })),
        });
      }
      if (sectors.toRemove.length > 0) {
        await tx.service_sectors.deleteMany({
          where: { service_id: serviceId, sector_id: { in: sectors.toRemove } },
        });
      }
      if (sectors.toAdd.length > 0) {
        await tx.service_sectors.createMany({
          data: sectors.toAdd.map((sector_id) => ({ service_id: serviceId, sector_id })),
        });
      }
    });

    logger.info('Contrato actualizado', {
      data: { serviceId, areas: { added: areas.toAdd.length, removed: areas.toRemove.length } },
    });
    revalidatePath(COMERCIAL_PATH);
    return ok({ id: serviceId });
  } catch (error) {
    if (isForeignKeyError(error)) return fail(FK_IN_USE_MESSAGE);
    logger.error('Error al actualizar el contrato', { data: { error, serviceId } });
    return fail(errorMessage(error, 'Error al actualizar el contrato'));
  }
}

// ───────────────────────────── Documentos de contrato ─────────────────────────────

const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Documentos de un contrato de la empresa activa con URL firmada (1 h). Si el storage no
 * puede firmar alguno, ese documento vuelve con `url: ''` en vez de romper la lista.
 */
export async function getContractDocuments(serviceId: string) {
  const companyId = await getActiveCompanyId();
  const service = await findOwnedService(serviceId, companyId);
  if (!service) throw new Error('Contrato no encontrado');

  try {
    const docs = await prisma.documents_contracts.findMany({
      where: { contract_id: serviceId },
      orderBy: { date: 'desc' },
    });
    if (docs.length === 0) return [];

    const signed = await storageSignedUrls(
      CONTRACT_DOCUMENTS_BUCKET,
      docs.map((d) => d.path),
      SIGNED_URL_SECONDS
    ); // P3: storage
    const urlByPath = new Map(signed.ok ? signed.data.map((item) => [item.path, item.url]) : []);
    if (!signed.ok) {
      logger.warn('No se pudieron firmar los documentos del contrato', { data: { serviceId, error: signed.error } });
    }

    return docs.map((doc) => ({ ...doc, url: urlByPath.get(doc.path) ?? '' }));
  } catch (error) {
    logger.error('Error al cargar documentos del contrato', { data: { error, serviceId } });
    throw error;
  }
}

export type ContractDocument = Awaited<ReturnType<typeof getContractDocuments>>[number];

/**
 * Sube un documento al bucket y registra sus metadatos. El archivo viaja en el FormData
 * (`file`, `contractId`, `docType`, `docDescription`). Si falla el insert, se elimina el
 * archivo ya subido.
 */
export async function uploadContractDocument(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const file = formData.get('file');
  const serviceId = String(formData.get('contractId') ?? '');
  const docType = String(formData.get('docType') ?? '').trim();
  const docDescription = String(formData.get('docDescription') ?? '').trim();

  if (!(file instanceof File) || file.size === 0) return fail('No se recibió ningún archivo');
  if (!serviceId) return fail('Contrato no indicado');

  const companyId = await getActiveCompanyId();
  const service = await findOwnedService(serviceId, companyId);
  if (!service || !service.customer_id) return fail('Contrato no encontrado');

  const path = buildContractDocumentPath({
    companyId,
    customerId: service.customer_id,
    contractId: serviceId,
    fileName: file.name,
  });

  const uploaded = await storageUpload(CONTRACT_DOCUMENTS_BUCKET, path, file, { upsert: true }); // P3: storage
  if (!uploaded.ok) return fail(`Error al subir el archivo: ${uploaded.error}`);

  try {
    const created = await prisma.documents_contracts.create({
      data: {
        contract_id: serviceId,
        name: file.name,
        type: classifyDocumentType(file.type, file.name),
        size: String(file.size),
        path,
        description: docDescription || docType || null,
        date: new Date(),
      },
      select: { id: true },
    });
    logger.info('Documento de contrato subido', { data: { serviceId, documentId: created.id } });
    return ok({ id: created.id });
  } catch (error) {
    logger.error('Error al guardar metadatos del documento; se limpia el archivo', { data: { error, path } });
    await storageRemove(CONTRACT_DOCUMENTS_BUCKET, [path]); // P3: storage
    return fail(errorMessage(error, 'Error al guardar los metadatos del documento'));
  }
}

/** Busca el documento y verifica que su contrato sea de la empresa activa. */
async function findOwnedDocument(documentId: string, companyId: string) {
  const doc = await prisma.documents_contracts.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  const service = await findOwnedService(doc.contract_id, companyId);
  return service ? doc : null;
}

/** Borra metadatos y archivo. Si el archivo no se puede borrar, el registro ya no existe (se loguea). */
export async function deleteContractDocument(documentId: string): Promise<ActionResult> {
  const companyId = await getActiveCompanyId();
  try {
    const doc = await findOwnedDocument(documentId, companyId);
    if (!doc) return fail('Documento no encontrado');

    await prisma.documents_contracts.delete({ where: { id: documentId } });
    const removed = await storageRemove(CONTRACT_DOCUMENTS_BUCKET, [doc.path]); // P3: storage
    if (!removed.ok) {
      logger.warn('El registro fue eliminado pero el archivo no se pudo borrar del storage', {
        data: { documentId, path: doc.path, error: removed.error },
      });
    }
    logger.info('Documento de contrato eliminado', { data: { documentId } });
    return ok(null);
  } catch (error) {
    logger.error('Error al eliminar el documento', { data: { error, documentId } });
    return fail(errorMessage(error, 'Error al eliminar el documento'));
  }
}

/** URL firmada corta (1 min) para descargar un documento. */
export async function getContractDocumentDownloadUrl(documentId: string): Promise<ActionResult<{ url: string }>> {
  const companyId = await getActiveCompanyId();
  try {
    const doc = await findOwnedDocument(documentId, companyId);
    if (!doc) return fail('Documento no encontrado');
    const signed = await storageSignedUrls(CONTRACT_DOCUMENTS_BUCKET, [doc.path], 60); // P3: storage
    if (!signed.ok) return fail(`Error al generar la URL de descarga: ${signed.error}`);
    return ok({ url: signed.data[0].url });
  } catch (error) {
    logger.error('Error al generar la URL de descarga', { data: { error, documentId } });
    return fail(errorMessage(error, 'Error al generar la URL de descarga'));
  }
}
