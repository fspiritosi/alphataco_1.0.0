'use server';

import { preparte_status } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server'; // P3: storage
import { getServerAuthProfile } from '@/shared/actions/auth.actions';
import { prisma } from '@/shared/lib/prisma';
import { getSessionUserId } from '@/shared/lib/session';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import type { Preparte, PreparteChangeLog } from '../types';

const logger = new Logger('features/Operaciones/Preparte/mutations');

/**
 * Alcance de empresa del módulo: los pedidos viejos no tienen `company_id` y se siguen
 * viendo desde cualquier empresa (mismo criterio que antes de la migración).
 */
function preparteCompanyScope(companyId: string) {
  return { OR: [{ company_id: companyId }, { company_id: null }] };
}

/** `''` en una FK uuid es un 400 de Postgres: se normaliza a `null`. */
function toUuidOrNull(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/** Convierte una fecha del formulario (`YYYY-MM-DD` o ISO) a `Date`; vacío → `null`. */
function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Convierte un `HH:mm[:ss]` a la columna `time` de Postgres (Prisma la modela como Date). */
function toPgTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toPreparteStatus(value: string | null | undefined): preparte_status | null {
  if (!value) return null;
  return Object.values(preparte_status).includes(value as preparte_status) ? (value as preparte_status) : null;
}

// ============================================================================
// VALIDACIÓN DE PERÍMETRO
// ============================================================================

/**
 * Verifica que cliente, contrato, item y equipo del cliente pertenezcan a la empresa
 * activa antes de escribirlos en un pedido. Sin RLS es la única defensa: cualquier
 * uuid que llegue del cliente sería aceptado por la FK.
 */
async function assertPreparteReferences(
  companyId: string,
  refs: {
    customerIds: string[];
    serviceIds: string[];
    itemIds: string[];
    customerEquipmentIds: string[];
  }
): Promise<void> {
  const customerIds = [...new Set(refs.customerIds.filter(Boolean))];
  const serviceIds = [...new Set(refs.serviceIds.filter(Boolean))];
  const itemIds = [...new Set(refs.itemIds.filter(Boolean))];
  const customerEquipmentIds = [...new Set(refs.customerEquipmentIds.filter(Boolean))];

  const [customers, services, items, equipment] = await Promise.all([
    customerIds.length
      ? prisma.customers.findMany({ where: { id: { in: customerIds }, company_id: companyId }, select: { id: true } })
      : Promise.resolve([]),
    serviceIds.length
      ? prisma.customer_services.findMany({
          where: { id: { in: serviceIds }, customers: { company_id: companyId } },
          select: { id: true },
        })
      : Promise.resolve([]),
    itemIds.length
      ? prisma.service_items.findMany({
          where: { id: { in: itemIds }, customer_services: { customers: { company_id: companyId } } },
          select: { id: true },
        })
      : Promise.resolve([]),
    customerEquipmentIds.length
      ? prisma.equipos_clientes.findMany({
          where: { id: { in: customerEquipmentIds }, customers: { company_id: companyId } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (
    customers.length !== customerIds.length ||
    services.length !== serviceIds.length ||
    items.length !== itemIds.length ||
    equipment.length !== customerEquipmentIds.length
  ) {
    throw new Error('Alguno de los datos del pedido no pertenece a la empresa activa.');
  }
}

/** Lanza si el pedido no es de la empresa activa. Devuelve la fila leída. */
async function requirePreparteInCompany(id: string, companyId: string) {
  const row = await prisma.preparte.findFirst({
    where: { id, ...preparteCompanyScope(companyId) },
  });
  if (!row) {
    throw new Error('El pedido no existe o no pertenece a la empresa activa.');
  }
  return row;
}

// ============================================================================
// NORMALIZACIÓN DE SECTOR / ÁREA
// ============================================================================

/**
 * El formulario puede mandar el `service_sectors.id` o el `sectors.id`; en la tabla se
 * guarda SIEMPRE el `service_sectors.id` del contrato. Devuelve el mapa de traducción.
 */
async function buildSectorMap(serviceIds: string[], sectorValues: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!serviceIds.length || !sectorValues.length) return map;

  const rows = await prisma.service_sectors.findMany({
    where: { service_id: { in: serviceIds } },
    select: { id: true, sector_id: true, service_id: true },
  });

  for (const row of rows) {
    map.set(`${row.service_id}:${row.sector_id}`, row.id);
    map.set(row.sector_id, row.id);
    map.set(row.id, row.id);
  }
  return map;
}

/** Equivalente de `buildSectorMap` para áreas (`service_areas.id` ← `areas_cliente.id`). */
async function buildAreaMap(serviceIds: string[], areaValues: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!serviceIds.length || !areaValues.length) return map;

  const rows = await prisma.service_areas.findMany({
    where: { service_id: { in: serviceIds } },
    select: { id: true, area_id: true, service_id: true },
  });

  for (const row of rows) {
    map.set(`${row.service_id}:${row.area_id}`, row.id);
    map.set(row.area_id, row.id);
    map.set(row.id, row.id);
  }
  return map;
}

// ============================================================================
// CREATE
// ============================================================================

/** Aplana el payload del formulario, que puede venir como objeto, array o array de arrays. */
function flattenPreparteInput(
  input: Omit<Preparte, 'id'> | Omit<Preparte, 'id'>[] | Omit<Preparte, 'id'>[][]
): Omit<Preparte, 'id'>[] {
  if (!Array.isArray(input)) return [input];
  if (input.length === 1 && Array.isArray(input[0])) return input[0];
  return input as Omit<Preparte, 'id'>[];
}

/**
 * Crea una o varias líneas de pedido.
 *
 * Perímetro: `company_id` = empresa activa y todas las FKs verificadas contra ella.
 */
export async function createPreparte(
  prepartesData: Omit<Preparte, 'id'> | Omit<Preparte, 'id'>[] | Omit<Preparte, 'id'>[][]
) {
  try {
    const dataToInsert = flattenPreparteInput(prepartesData);
    if (dataToInsert.length === 0) {
      throw new Error('No hay datos válidos para insertar');
    }

    const companyId = await getActiveCompanyId();

    await assertPreparteReferences(companyId, {
      customerIds: dataToInsert.map((item) => item.cliente_id),
      serviceIds: dataToInsert.map((item) => item.contrato_id),
      itemIds: dataToInsert.map((item) => toUuidOrNull(item.item)).filter((id): id is string => id !== null),
      customerEquipmentIds: dataToInsert
        .map((item) => toUuidOrNull(normalizeSingleEquipment(item.equipos_cliente)))
        .filter((id): id is string => id !== null),
    });

    const serviceIds = [...new Set(dataToInsert.map((item) => item.contrato_id).filter(Boolean))];
    const [sectorMap, areaMap] = await Promise.all([
      buildSectorMap(
        serviceIds,
        dataToInsert.map((item) => item.sector_service_id ?? '').filter(Boolean)
      ),
      buildAreaMap(
        serviceIds,
        dataToInsert.map((item) => item.areas_service_id ?? '').filter(Boolean)
      ),
    ]);

    const rows = dataToInsert.map((item) => {
      const rawSector = toUuidOrNull(item.sector_service_id);
      const rawArea = toUuidOrNull(item.areas_service_id);

      return {
        cliente_id: item.cliente_id,
        contrato_id: item.contrato_id,
        company_id: companyId,
        tipo: item.tipo,
        jornada: item.jornada,
        start_time: item.start_time ?? null,
        end_time: item.end_time ?? null,
        solicitante: item.solicitante,
        status: toPreparteStatus(item.status) ?? preparte_status.pendiente,
        item: toUuidOrNull(item.item),
        observaciones: item.observaciones ?? null,
        executionDate: toDateOrNull(item.executionDate),
        requestDate: toDateOrNull(item.requestDate),
        quantity: item.quantity ?? null,
        numero_pedido: item.numero_pedido,
        sector_service_id: rawSector
          ? sectorMap.get(`${item.contrato_id}:${rawSector}`) ?? sectorMap.get(rawSector) ?? rawSector
          : null,
        areas_service_id: rawArea
          ? areaMap.get(`${item.contrato_id}:${rawArea}`) ?? areaMap.get(rawArea) ?? rawArea
          : null,
        equipos_cliente: toUuidOrNull(normalizeSingleEquipment(item.equipos_cliente)),
        preparteImage: item.preparteImage ?? null,
        subject_to_availability: item.subject_to_availability ?? false,
        reprogram: toUuidOrNull(item.reprogram),
      };
    });

    return await prisma.preparte.createManyAndReturn({ data: rows });
  } catch (error) {
    logger.error('Error al crear los pedidos', { data: { error } });
    throw new Error('Error al crear los prepartes: ' + (error as Error).message);
  }
}

/** El formulario manda el equipo del cliente como array; en la tabla va uno solo. */
function normalizeSingleEquipment(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Actualiza una línea de pedido.
 *
 * Perímetro: el pedido tiene que ser de la empresa activa y las FKs nuevas también.
 * Los actores (`rejected_by` / `cancelled_by` / `reprogrammed_by`) salen SIEMPRE de la
 * sesión, nunca del payload.
 */
export async function updatePreparte(id: string, preparteData: Partial<Preparte>) {
  try {
    const companyId = await getActiveCompanyId();
    const current = await requirePreparteInCompany(id, companyId);

    const contratoId = preparteData.contrato_id ?? current.contrato_id;

    await assertPreparteReferences(companyId, {
      customerIds: preparteData.cliente_id ? [preparteData.cliente_id] : [],
      serviceIds: preparteData.contrato_id ? [preparteData.contrato_id] : [],
      itemIds: 'item' in preparteData ? [toUuidOrNull(preparteData.item)].filter((v): v is string => v !== null) : [],
      customerEquipmentIds:
        'equipos_cliente' in preparteData
          ? [toUuidOrNull(normalizeSingleEquipment(preparteData.equipos_cliente))].filter(
              (v): v is string => v !== null
            )
          : [],
    });

    const status = toPreparteStatus(preparteData.status);

    const data: Record<string, unknown> = { updated_at: new Date() };

    if (preparteData.cliente_id !== undefined) data.cliente_id = preparteData.cliente_id;
    if (preparteData.contrato_id !== undefined) data.contrato_id = preparteData.contrato_id;
    if (preparteData.tipo !== undefined) data.tipo = preparteData.tipo;
    if (preparteData.jornada !== undefined) data.jornada = preparteData.jornada;
    if (preparteData.start_time !== undefined) data.start_time = preparteData.start_time || null;
    if (preparteData.end_time !== undefined) data.end_time = preparteData.end_time || null;
    if (preparteData.solicitante !== undefined) data.solicitante = preparteData.solicitante;
    if (preparteData.observaciones !== undefined) data.observaciones = preparteData.observaciones ?? null;
    if (preparteData.numero_pedido !== undefined) data.numero_pedido = preparteData.numero_pedido;
    if (preparteData.quantity !== undefined) data.quantity = preparteData.quantity ?? null;
    if (preparteData.confirmed_by !== undefined) data.confirmed_by = preparteData.confirmed_by ?? null;
    if (preparteData.cancel_reason !== undefined) data.cancel_reason = preparteData.cancel_reason ?? null;
    if (preparteData.rejected_reason !== undefined) data.rejected_reason = preparteData.rejected_reason ?? null;
    if (preparteData.reprogram_reason !== undefined) data.reprogram_reason = preparteData.reprogram_reason ?? null;
    if (preparteData.reprogram !== undefined) data.reprogram = toUuidOrNull(preparteData.reprogram);
    if (preparteData.subject_to_availability !== undefined) {
      data.subject_to_availability = preparteData.subject_to_availability;
    }
    if ('executionDate' in preparteData) data.executionDate = toDateOrNull(preparteData.executionDate);
    if ('requestDate' in preparteData) data.requestDate = toDateOrNull(preparteData.requestDate);
    if ('item' in preparteData) data.item = toUuidOrNull(preparteData.item);
    if ('preparteImage' in preparteData) data.preparteImage = preparteData.preparteImage ?? null;
    if ('equipos_cliente' in preparteData) {
      data.equipos_cliente = toUuidOrNull(normalizeSingleEquipment(preparteData.equipos_cliente));
    }
    if (status) data.status = status;

    // Normalizar sector/área al `service_sectors.id` / `service_areas.id` del contrato.
    if ('sector_service_id' in preparteData) {
      const raw = toUuidOrNull(preparteData.sector_service_id);
      if (!raw) {
        data.sector_service_id = null;
      } else {
        const map = await buildSectorMap([contratoId], [raw]);
        data.sector_service_id = map.get(`${contratoId}:${raw}`) ?? map.get(raw) ?? raw;
      }
    }
    if ('areas_service_id' in preparteData) {
      const raw = toUuidOrNull(preparteData.areas_service_id);
      if (!raw) {
        data.areas_service_id = null;
      } else {
        const map = await buildAreaMap([contratoId], [raw]);
        data.areas_service_id = map.get(`${contratoId}:${raw}`) ?? map.get(raw) ?? raw;
      }
    }

    // El actor del cierre lo pone el servidor, nunca el cliente.
    if (status === preparte_status.rechazado || status === preparte_status.cancelado || status === preparte_status.reprogramado) {
      const profile = await getServerAuthProfile();
      if (profile) {
        if (status === preparte_status.rechazado) data.rejected_by = profile.credentialId;
        else if (status === preparte_status.cancelado) data.cancelled_by = profile.credentialId;
        else data.reprogrammed_by = profile.credentialId;
      }
    }

    const updated = await prisma.preparte.update({ where: { id }, data });

    // Si se actualizó la imagen, replicarla en todas las líneas del mismo pedido.
    if (updated.numero_pedido && typeof data.preparteImage === 'string' && data.preparteImage) {
      try {
        await updatePreparteImageByOrderNumber(updated.numero_pedido, data.preparteImage);
      } catch (error) {
        logger.error('Error al actualizar las imágenes de todas las líneas', { data: { error } });
      }
    }

    return updated;
  } catch (error) {
    logger.error('Error al actualizar el pedido', { data: { error, id } });
    throw error instanceof Error ? error : new Error('Error al actualizar el preparte');
  }
}

/** Replica la imagen en todas las líneas que comparten `numero_pedido` (empresa activa). */
export async function updatePreparteImageByOrderNumber(numero_pedido: string, imageUrl: string) {
  try {
    const companyId = await getActiveCompanyId();
    const result = await prisma.preparte.updateMany({
      where: { numero_pedido, ...preparteCompanyScope(companyId) },
      data: { preparteImage: imageUrl, updated_at: new Date() },
    });
    return { updated: result.count };
  } catch (error) {
    logger.error('Error al actualizar la imagen del pedido', { data: { error, numero_pedido } });
    throw new Error('Error al actualizar la imagen del pedido');
  }
}

/** Elimina una línea de pedido de la empresa activa. */
export async function deletePreparte(id: string) {
  try {
    const companyId = await getActiveCompanyId();
    await requirePreparteInCompany(id, companyId);
    await prisma.preparte.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    logger.error('Error al eliminar el pedido', { data: { error, id } });
    throw error instanceof Error ? error : new Error('Error al eliminar el preparte');
  }
}

// ============================================================================
// HISTORIAL
// ============================================================================

/**
 * Registra un cambio en el historial del pedido. El autor sale de la sesión
 * (`changed_by` del cliente se ignora si no hay sesión).
 */
export async function logPreparteChange(changeLog: PreparteChangeLog) {
  try {
    const companyId = await getActiveCompanyId();
    await requirePreparteInCompany(changeLog.preparte_id, companyId);

    const sessionUserId = await getSessionUserId();

    return await prisma.preparte_change_logs.create({
      data: {
        preparte_id: changeLog.preparte_id,
        field_name: changeLog.field_name,
        old_value: changeLog.old_value,
        new_value: changeLog.new_value,
        reason: changeLog.reason,
        changed_by: changeLog.changed_by || sessionUserId || null,
        metadata: changeLog.metadata ? JSON.parse(JSON.stringify(changeLog.metadata)) : {},
      },
    });
  } catch (error) {
    logger.error('Error al registrar el cambio del pedido', { data: { error } });
    throw new Error('Error al registrar el cambio en el historial');
  }
}

// ============================================================================
// ARCHIVO DE LA IMAGEN DEL PEDIDO (P3: storage)
// ============================================================================

/**
 * Mueve la imagen ya subida a su ruta final `<cliente>/<contrato>/<pedido>/<pedido>.<ext>`
 * y devuelve la URL pública final.
 *
 * P3: storage — el acceso a Supabase Storage se reemplaza por MinIO conservando la firma.
 */
export async function movePreparteFile(
  fromPublicUrl: string,
  clienteName: string,
  contratoName: string,
  numeroPedido: string
): Promise<string> {
  const supabase = await supabaseServer(); // P3: storage

  const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_PREPARTE_BUCKET || 'preparte-img';

  // Normalizar nombres para la ruta (sólo para carpetas)
  const normalize = (value: string) =>
    value
      ?.normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase() || '';

  const empresaDir = normalize(clienteName) || 'empresa';
  const contratoDir = normalize(contratoName) || 'servicio';

  const baseUrl = process.env.NEXT_PUBLIC_PROJECT_URL as string;

  const detectBucketFromUrl = (): string | null => {
    try {
      const url = new URL(fromPublicUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      // .../storage/v1/object/public/<bucket>/<resto>
      const publicIdx = parts.findIndex((part) => part === 'public');
      if (publicIdx >= 0 && parts[publicIdx + 1]) return parts[publicIdx + 1];
      return null;
    } catch {
      return null;
    }
  };

  const BUCKET = detectBucketFromUrl() || DEFAULT_BUCKET;
  const prefix = `${baseUrl}/${BUCKET}/`;

  const extractFromPath = (): string => {
    try {
      const url = new URL(fromPublicUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      const bucketIdx = parts.findIndex((part) => part === BUCKET);
      if (bucketIdx >= 0) return decodeURIComponent(parts.slice(bucketIdx + 1).join('/'));
      if (fromPublicUrl.startsWith(prefix)) return decodeURIComponent(fromPublicUrl.slice(prefix.length));
      const clean = fromPublicUrl.split('?')[0];
      return decodeURIComponent(clean.split('/').pop() || '');
    } catch {
      const clean = fromPublicUrl.split('?')[0];
      return decodeURIComponent(clean.split('/').pop() || '');
    }
  };

  let fromPath = extractFromPath();
  if (fromPath.startsWith('/')) fromPath = fromPath.slice(1);

  // El cliente puede haber quitado los espacios de la URL: resolver el nombre real.
  const resolveActualObject = async (candidate: string): Promise<string> => {
    const parentDir = candidate.includes('/') ? candidate.split('/').slice(0, -1).join('/') : '';
    const candidateName = candidate.split('/').pop() as string;
    const withoutSpaces = (value: string) => value.replace(/\s+/g, '');
    try {
      const { data: listData, error: listError } = await supabase.storage.from(BUCKET).list(parentDir); // P3: storage
      if (listError) {
        logger.warn('No se pudo listar el bucket para resolver el nombre real', {
          data: { message: listError.message },
        });
        return candidate;
      }
      const match = listData?.find((file) => withoutSpaces(file.name) === withoutSpaces(candidateName));
      if (match) return parentDir ? `${parentDir}/${match.name}` : match.name;
      return candidate;
    } catch (error) {
      logger.warn('Error resolviendo el nombre real del objeto', { data: { error } });
      return candidate;
    }
  };

  fromPath = await resolveActualObject(fromPath);

  const currentExt = fromPath.split('.').pop()?.toLowerCase() || 'jpg';
  const targetPath = `${empresaDir}/${contratoDir}/${numeroPedido}/${numeroPedido}.${currentExt}`;

  if (fromPath !== targetPath) {
    let { error } = await supabase.storage.from(BUCKET).move(fromPath, targetPath); // P3: storage
    if (error && /already exists/i.test(error.message)) {
      const parent = `${empresaDir}/${contratoDir}/${numeroPedido}`;
      await supabase.storage.from(BUCKET).remove([`${parent}/${numeroPedido}.${currentExt}`]); // P3: storage
      const retry = await supabase.storage.from(BUCKET).move(fromPath, targetPath); // P3: storage
      error = retry.error;
    }
    if (error) {
      logger.error('Error moviendo el archivo del pedido', { data: { error } });
      throw new Error(`No se pudo mover el archivo en Storage: ${error.message}`);
    }
  }

  return `${baseUrl.replace(/\/$/, '')}/${BUCKET}/${targetPath}`;
}
