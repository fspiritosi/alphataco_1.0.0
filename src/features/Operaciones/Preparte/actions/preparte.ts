'use server';

import {
  checkDailyReportExists,
  createDailyReport,
  createDailyReportCustomerEquipmentRelations,
  createDailyReportRow,
} from '@/features/Operaciones/PartesDiarios/actions/actions';
import { preparte_status } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';

const logger = new Logger('preparte-actions');

export type Preparte = {
  id?: string;
  cliente_id: string;
  contrato_id: string;
  tipo: string;
  jornada: string;
  start_time?: string | null;
  end_time?: string | null;
  solicitante: string;
  status?: string;
  item?: string | null;
  observaciones?: string | null;
  executionDate: string | null; // Ahora puede ser null cuando subject_to_availability es true
  requestDate: string;
  quantity?: number;
  numero_pedido: string;
  sector_service_id?: string | null;
  areas_service_id?: string | null;
  equipos_cliente?: string | null;
  // nueva columna para almacenar la URL o ruta de la imagen del preparte
  preparteImage?: string | null;
  confirmed_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Nuevo campo: indica si el pedido está sujeto a disponibilidad operativa
  subject_to_availability?: boolean;
  // FK a preparte.id (self-referential) para pedidos reprogramados
  reprogram?: string | null;
};

// Tipo para registrar cambios en el log
export type PreparteChangeLog = {
  preparte_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  changed_by?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

// Create a new preparte
export async function createPreparte(
  prepartesData: Omit<Preparte, 'id'> | Omit<Preparte, 'id'>[] | Omit<Preparte, 'id'>[][]
) {
  const supabase = await supabaseServer();

  try {
    // SOLUCIÓN: Manejar explícitamente el array doble
    let dataToInsert: Omit<Preparte, 'id'>[];

    // Caso 1: Array doblemente anidado [[{...}, {...}]]
    if (Array.isArray(prepartesData) && prepartesData.length === 1 && Array.isArray(prepartesData[0])) {
      dataToInsert = prepartesData[0]; // ← Extraemos el array interno
    }
    // Caso 2: Array simple de objetos [{...}, {...}]
    else if (Array.isArray(prepartesData)) {
      dataToInsert = prepartesData as Omit<Preparte, 'id'>[];
    }
    // Caso 3: Objeto simple {...}
    else {
      dataToInsert = [prepartesData];
    }

    // Validar que tenemos datos válidos
    if (dataToInsert.length === 0) {
      throw new Error('No hay datos válidos para insertar');
    }

    // ============================================
    // OPTIMIZACIÓN: Batch lookup para evitar N+1 queries
    // ============================================

    // 1. Extraer IDs únicos para pre-cargar lookups
    const uniqueServiceIds = [...new Set(dataToInsert.map((item) => item.contrato_id))];
    const uniqueSectorIds = [
      ...new Set(dataToInsert.map((item) => item.sector_service_id).filter(Boolean) as string[]),
    ];
    const uniqueAreaIds = [...new Set(dataToInsert.map((item) => item.areas_service_id).filter(Boolean) as string[])];

    // 2. Batch query para service_sectors (1 query en lugar de N)
    let serviceSectorsMap = new Map<string, string>();
    if (uniqueSectorIds.length > 0 && uniqueServiceIds.length > 0) {
      const { data: serviceSectors } = await supabase
        .from('service_sectors')
        .select('id, sector_id, service_id')
        .in('service_id', uniqueServiceIds)
        .in('sector_id', uniqueSectorIds);

      serviceSectors?.forEach((ss) => {
        // Crear múltiples claves para diferentes lookups
        serviceSectorsMap.set(`${ss.service_id}:${ss.sector_id}`, ss.id);
        serviceSectorsMap.set(ss.sector_id, ss.id);
        serviceSectorsMap.set(ss.id, ss.id); // También por ID directo
      });
    }

    // 3. Batch query para service_areas (1 query en lugar de N)
    let serviceAreasMap = new Map<string, string>();
    if (uniqueAreaIds.length > 0 && uniqueServiceIds.length > 0) {
      const { data: serviceAreas } = await supabase
        .from('service_areas')
        .select('id, area_id, service_id')
        .in('service_id', uniqueServiceIds)
        .in('area_id', uniqueAreaIds);

      serviceAreas?.forEach((sa) => {
        // Crear múltiples claves para diferentes lookups
        serviceAreasMap.set(`${sa.service_id}:${sa.area_id}`, sa.id);
        serviceAreasMap.set(sa.area_id, sa.id);
        serviceAreasMap.set(sa.id, sa.id); // También por ID directo
      });
    }

    // 4. Normalizar usando maps (sin queries adicionales)
    const normalized = dataToInsert.map((item) => {
      let sector_fk: string | null = null;
      let area_fk: string | null = null;

      // Normalizar sector usando el map pre-cargado
      if (item.sector_service_id) {
        const key = `${item.contrato_id}:${item.sector_service_id}`;
        sector_fk =
          serviceSectorsMap.get(key) || serviceSectorsMap.get(item.sector_service_id) || item.sector_service_id;
      }

      // Normalizar área usando el map pre-cargado
      if (item.areas_service_id) {
        const key = `${item.contrato_id}:${item.areas_service_id}`;
        area_fk = serviceAreasMap.get(key) || serviceAreasMap.get(item.areas_service_id) || item.areas_service_id;
      }

      return {
        ...item,
        sector_service_id: sector_fk,
        areas_service_id: area_fk,
        // Guardar solo el primer equipo seleccionado (si viene array del form)
        equipos_cliente: Array.isArray(item.equipos_cliente)
          ? item.equipos_cliente[0] ?? null
          : item.equipos_cliente ?? null,
      };
    });

    const validatedData = normalized.map((item) => ({
      cliente_id: item.cliente_id,
      contrato_id: item.contrato_id,
      tipo: item.tipo,
      jornada: item.jornada,
      start_time: item.start_time,
      end_time: item.end_time,
      solicitante: item.solicitante,
      status: item.status,
      item: item.item,
      observaciones: item.observaciones,
      executionDate: item.executionDate,
      requestDate: item.requestDate,
      quantity: item.quantity,
      numero_pedido: item.numero_pedido,
      sector_service_id: item.sector_service_id || null,
      areas_service_id: item.areas_service_id || null,
      equipos_cliente: item.equipos_cliente || null,
      preparteImage: (item as any).preparteImage || null,
      subject_to_availability: item.subject_to_availability ?? false,
    }));

    const { data, error } = await supabase
      .from('preparte' as any)
      .insert(validatedData)
      .select();

    if (error) {
      logger.error('Error Supabase', { data: { error } });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error en createPreparte', { data: { error } });
    throw new Error('Error al crear los prepartes: ' + (error as Error).message);
  }
}

// Update an existing preparte
export async function updatePreparte(id: string, preparteData: Partial<Preparte>) {
  const supabase = await supabaseServer();
  // Construir payload: solo tocar sector/área/equipos si vienen en el payload
  const payload: any = {
    ...preparteData,
    updated_at: new Date().toISOString(),
  };
  // Nunca enviar columnas que no existen en la tabla
  if ('image_url' in payload) delete payload.image_url;
  // Campos del formulario que no van a la tabla preparte
  if ('item_change_reason' in payload) delete payload.item_change_reason;
  if ('original_item_id' in payload) delete payload.original_item_id;

  // Equipos: solo si la clave está presente
  if ('equipos_cliente' in preparteData) {
    payload.equipos_cliente = Array.isArray(preparteData.equipos_cliente)
      ? preparteData.equipos_cliente?.[0] ?? null
      : preparteData.equipos_cliente ?? null;
  }

  // ============================================
  // OPTIMIZACIÓN: Ejecutar lookups de sector y área en paralelo
  // ============================================
  const needsSectorLookup = 'sector_service_id' in preparteData && preparteData.sector_service_id;
  const needsAreaLookup = 'areas_service_id' in preparteData && preparteData.areas_service_id;

  if (needsSectorLookup || needsAreaLookup) {
    // Obtener contrato_id si no está en el payload (puede ser necesario para ambos lookups)
    let contratoId = preparteData.contrato_id as string | undefined;
    if (!contratoId) {
      const { data: current } = await supabase
        .from('preparte' as any)
        .select('contrato_id')
        .eq('id', id)
        .single();
      contratoId = current?.contrato_id;
    }

    if (contratoId) {
      // Preparar promises para ejecutar en paralelo
      const sectorPromise = needsSectorLookup
        ? supabase
            .from('service_sectors')
            .select('id, sector_id')
            .eq('service_id', contratoId)
            .eq('sector_id', preparteData.sector_service_id!)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const areaPromise = needsAreaLookup
        ? supabase
            .from('service_areas')
            .select('id, area_id')
            .eq('service_id', contratoId)
            .eq('area_id', preparteData.areas_service_id!)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      // Ejecutar lookups en paralelo
      const [sectorResult, areaResult] = await Promise.all([sectorPromise, areaPromise]);

      // Aplicar resultados de sector
      if (needsSectorLookup) {
        payload.sector_service_id = sectorResult.data?.id || preparteData.sector_service_id;
      }

      // Aplicar resultados de área
      if (needsAreaLookup) {
        payload.areas_service_id = areaResult.data?.id || preparteData.areas_service_id;
      }
    } else {
      // Si no hay contratoId, usar valores originales
      if (needsSectorLookup) {
        payload.sector_service_id = preparteData.sector_service_id;
      }
      if (needsAreaLookup) {
        payload.areas_service_id = preparteData.areas_service_id;
      }
    }
  }

  // Si viene la url/route de la imagen, incluirla tal cual
  if ('preparteImage' in preparteData) {
    (payload as any).preparteImage = preparteData.preparteImage ?? null;
  }
  const { data, error } = await supabase
    .from('preparte' as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating preparte', { data: { error } });
    throw new Error('Error al actualizar el preparte');
  }

  // Si hay un número de pedido y se actualizó la imagen, actualizar todas las líneas
  if (payload.numero_pedido && payload.preparteImage) {
    try {
      await updatePreparteImageByOrderNumber(payload.numero_pedido, payload.preparteImage);
    } catch (error) {
      logger.error('Error al actualizar imágenes de todas las líneas', { data: { error } });
      // No lanzamos el error para no fallar la actualización principal
    }
  }

  return data;
}

// Delete a preparte
export async function deletePreparte(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('preparte' as any)
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Error deleting preparte', { data: { error } });
    throw new Error('Error al eliminar el preparte');
  }

  return { success: true };
}

// Actualiza la imagen para todas las filas que comparten el mismo número de pedido
export async function updatePreparteImageByOrderNumber(numero_pedido: string, imageUrl: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('preparte' as any)
    .update({ preparteImage: imageUrl, updated_at: new Date().toISOString() })
    .eq('numero_pedido', numero_pedido)
    .select();

  if (error) {
    logger.error('[updatePreparteImageByOrderNumber] Error', { data: { error } });
    throw new Error('Error al actualizar la imagen del pedido');
  }

  return data;
}

// Get preparte by ID
export async function getPreparteById(id: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('preparte').select('*').eq('id', id).single();

  if (error) {
    logger.error('Error fetching preparte', { data: { error } });
    throw new Error('Error al obtener el preparte');
  }

  return data;
}

// List all prepartes with optional filters
type ListPrepartesOptions = {
  status?: string;
  cliente_id?: string;
  limit?: number;
};

export async function listPrepartes(options?: ListPrepartesOptions) {
  const supabase = await supabaseServer();

  const defaultLimit = 100;
  const limit = options?.limit ?? defaultLimit;

  let query = supabase
    .from('preparte')
    .select('*, service_items(id, item_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.cliente_id) {
    query = query.eq('cliente_id', options.cliente_id);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error listing prepartes', { data: { error } });
    throw new Error('Error al listar los prepartes');
  }

  return data;
}

/**
 * Cuenta el número total de prepartes (sin límite)
 */
export async function countPrepartes(): Promise<number> {
  const supabase = await supabaseServer();

  const { count, error } = await supabase.from('preparte').select('*', { count: 'exact', head: true });

  if (error) {
    logger.error('Error counting prepartes', { data: { error } });
    return 0;
  }

  return count || 0;
}

/**
 * Cuenta prepartes por estado específico
 */
export async function countPrepartesByStatus(
  status: 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'confirmado' | 'vencido'
): Promise<number> {
  const supabase = await supabaseServer();

  const { count, error } = await supabase
    .from('preparte')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);

  if (error) {
    logger.error('Error counting prepartes by status', { data: { error, status } });
    return 0;
  }

  return count || 0;
}

export async function getLastOrderNumber() {
  const supabase = await supabaseServer();

  // Usar función RPC optimizada que calcula el máximo directamente en PostgreSQL
  const { data, error } = await supabase.rpc('get_max_order_number');

  if (error) {
    logger.error('Error al obtener el último número de pedido', { data: { error } });
    return 'PED-0000';
  }

  // La función RPC retorna directamente el número formateado (ej: "PED-0170")
  return (data as string) || 'PED-0000';
}

export async function fetchPrepartes({
  pageIndex = 0,
  pageSize = 10,
  sorting = [],
  columnFilters = [],
}: {
  pageIndex: number;
  pageSize: number;
  sorting: any[];
  columnFilters: any[];
}) {
  const supabase = await supabaseServer();

  try {
    // Construir la consulta base
    let query = supabase.from('preparte').select('*, service_items(id, item_name)', { count: 'exact' });

    // Aplicar ordenamiento
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      query = query.order(id, { ascending: !desc });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Aplicar filtros
    const toStartOfDay = (d: unknown) => {
      const m = moment(d as string | number | Date);
      return m.isValid() ? m.startOf('day').format('YYYY-MM-DD') : undefined;
    };
    const toEndOfDay = (d: unknown) => {
      const m = moment(d as string | number | Date);
      return m.isValid() ? m.endOf('day').format('YYYY-MM-DD') : undefined;
    };

    for (const filter of columnFilters || []) {
      const { id, value } = filter || {};
      if (value == null || value === '') continue;

      // Rango de fechas: { from?: Date|string|null, to?: Date|string|null }
      if (typeof value === 'object' && value !== null && ('from' in value || 'to' in value)) {
        const fromDate = (value as any)?.from ? toStartOfDay((value as any).from) : undefined;
        const toDate = (value as any)?.to ? toEndOfDay((value as any).to) : undefined;
        if (fromDate) query = query.gte(id, fromDate);
        if (toDate) query = query.lte(id, toDate);
        continue;
      }

      // Filtros facetados: array de valores
      if (Array.isArray(value)) {
        const vals = value.filter((v) => v !== undefined && v !== null && v !== '');
        if (vals.length > 0) {
          query = query.in(id, vals);
        }
        continue;
      }

      // Fallback: igualdad simple
      query = query.eq(id, value);
    }

    // Aplicar paginación
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    return {
      rows: data || [],
      pageCount: Math.ceil((count || 0) / pageSize),
      rowCount: count || 0,
    };
  } catch (error) {
    logger.error('Error al cargar prepartes', { data: { error } });
    return {
      rows: [],
      pageCount: 0,
      rowCount: 0,
    };
  }
}

// Mueve un archivo ya subido en el bucket a la ruta final y retorna la URL pública final
export async function movePreparteFile(
  fromPublicUrl: string,
  clienteName: string,
  contratoName: string,
  numeroPedido: string
): Promise<string> {
  const supabase = await supabaseServer();

  // Bucket configurable por env
  const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_PREPARTE_BUCKET || 'preparte-img';

  // Normalizar nombres para la ruta (solo para carpetas)
  const normalize = (s: string) =>
    s
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase() || '';

  const empresaDir = normalize(clienteName) || 'empresa';
  const contratoDir = normalize(contratoName) || 'servicio';

  const baseUrl = process.env.NEXT_PUBLIC_PROJECT_URL as string;
  const detectBucketFromUrl = (): string | null => {
    try {
      const u = new URL(fromPublicUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      // .../storage/v1/object/public/<bucket>/<rest>
      const publicIdx = parts.findIndex((p) => p === 'public');
      if (publicIdx >= 0 && parts[publicIdx + 1]) return parts[publicIdx + 1];
      return null;
    } catch {
      return null;
    }
  };
  const detectedBucket = detectBucketFromUrl();
  const BUCKET = detectedBucket || DEFAULT_BUCKET;

  const prefix = `${baseUrl}/${BUCKET}/`;

  // Obtener el path relativo del objeto subido de forma robusta
  const extractFromPath = (): string => {
    try {
      const urlObj = new URL(fromPublicUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      // Buscar el bucket en el pathname y tomar lo que le sigue
      const bucketIdx = parts.findIndex((p) => p === BUCKET);
      if (bucketIdx >= 0) {
        return decodeURIComponent(parts.slice(bucketIdx + 1).join('/'));
      }
      // Fallback: si coincide con el prefijo exacto
      const byPrefix = fromPublicUrl.startsWith(prefix) ? fromPublicUrl.slice(prefix.length) : undefined;
      if (byPrefix) return decodeURIComponent(byPrefix);
      // Último segmento sin querystring
      const clean = fromPublicUrl.split('?')[0];
      const last = clean.split('/').pop() || '';
      return decodeURIComponent(last);
    } catch {
      // Si no es URL válida, usar heurística simple
      const clean = fromPublicUrl.split('?')[0];
      const last = clean.split('/').pop() || '';
      return decodeURIComponent(last);
    }
  };

  let fromPath = extractFromPath();
  if (fromPath.startsWith('/')) fromPath = fromPath.slice(1);

  // Si el cliente removió espacios de la URL (ej: via replace(/\s/g, '')), intentar resolver el nombre real
  const resolveActualObject = async (candidate: string): Promise<string> => {
    // Buscar en la raíz del bucket (ya que el hook sube al root con el nombre del archivo)
    const parentDir = candidate.includes('/') ? candidate.split('/').slice(0, -1).join('/') : '';
    const candName = candidate.split('/').pop() as string;
    const withoutSpaces = (s: string) => s.replace(/\s+/g, '');
    try {
      const { data: listData, error: listErr } = await supabase.storage.from(BUCKET).list(parentDir);
      if (listErr) {
        logger.warn('No se pudo listar el bucket para resolver nombre real', { data: { message: listErr.message } });
        return candidate; // continuar con candidate aunque pueda fallar
      }
      // Buscar match ignorando espacios y case-sensitive básico
      const match = listData?.find((f: any) => withoutSpaces(f.name) === withoutSpaces(candName));
      if (match) {
        const resolved = parentDir ? `${parentDir}/${match.name}` : match.name;

        return resolved;
      }
      return candidate;
    } catch (e) {
      logger.warn('Error resolviendo nombre real del objeto', { data: { error: e } });
      return candidate;
    }
  };

  // Resolver posible desincronización de espacios en el nombre
  fromPath = await resolveActualObject(fromPath);

  const currentExt = fromPath.split('.').pop()?.toLowerCase() || 'jpg';
  const targetPath = `${empresaDir}/${contratoDir}/${numeroPedido}/${numeroPedido}.${currentExt}`;

  // Mover a la estructura deseada
  if (fromPath !== targetPath) {
    // Intento 1: mover
    let { error } = await supabase.storage.from(BUCKET).move(fromPath, targetPath);
    if (error && /already exists/i.test(error.message)) {
      // Si ya existe, eliminar destino y reintentar una vez
      const parent = `${empresaDir}/${contratoDir}/${numeroPedido}`;
      const fileName = `${numeroPedido}.${currentExt}`;
      await supabase.storage.from(BUCKET).remove([`${parent}/${fileName}`]);
      const retry = await supabase.storage.from(BUCKET).move(fromPath, targetPath);
      error = retry.error as any;
    }
    if (error) {
      logger.error('Error moviendo archivo', { data: { error } });
      throw new Error(`No se pudo mover el archivo en Storage: ${error.message}`);
    }
  }

  // URL pública final
  const finalUrl = `${baseUrl.replace(/\/$/, '')}/${BUCKET}/${targetPath}`;
  return finalUrl;
}
// Función para actualizar el estado de múltiples prepartes
export async function updateMultiplePreparteStatus(
  ids: string[],
  updateData: {
    status?: 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'vencido' | 'confirmado';
    cancel_reason?: string;
    rejected_reason?: string;
    reprogram_reason?: string;
    confirmed_by?: string;
  }
) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('preparte')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .select();

  if (error) {
    logger.error('Error updating multiple preparte status', { data: { error } });
    throw error;
  }

  return data;
}

/**
 * Confirma un preparte individual y lo migra al parte diario.
 * Fuente única de verdad para la lógica de confirmación.
 * Usado desde handleConfirm (individual) y confirmMultiplePrepartesToDailyReport (masivo).
 *
 * @param overrideExecutionDate - Fecha de ejecución override (para el flujo vencido con nueva fecha)
 * @param confirmedBy - Nombre de quien confirma (opcional; si no se pasa, no se actualiza)
 * @param dailyReportCache - Cache interno de dailyReportId por fecha (para optimizar bulk)
 */
async function _confirmSinglePreparte(
  preparteId: string,
  overrideExecutionDate?: string,
  confirmedBy?: string,
  dailyReportCache?: Map<string, string>
) {
  const supabase = await supabaseServer();

  // 1. Verificar si ya tiene fila en dailyreportrows (protección contra duplicados / UNIQUE constraint)
  const { data: existingRow } = await supabase
    .from('dailyreportrows')
    .select('id')
    .eq('preparte_id', preparteId)
    .maybeSingle();

  if (existingRow) {
    // Ya migrado: solo actualizar confirmed_by si se proporcionó
    if (confirmedBy) {
      await updatePreparte(preparteId, { confirmed_by: confirmedBy });
    }
    return { success: true, dailyReportRowId: existingRow.id, alreadyExisted: true };
  }

  // 2. Obtener datos actuales del preparte
  const preparte = await getPreparteById(preparteId);
  if (!preparte) {
    throw new Error('No se encontró el pedido');
  }

  // 3. Determinar fecha de ejecución (override tiene prioridad sobre la de BD)
  const rawDate = overrideExecutionDate || preparte.executionDate;
  const parsedDate = rawDate ? moment.utc(rawDate) : null;

  if (preparte.subject_to_availability && !parsedDate?.isValid()) {
    throw new Error(`${preparte.numero_pedido || preparteId}: sujeto a disponibilidad sin fecha asignada`);
  }

  if (!parsedDate || !parsedDate.isValid()) {
    throw new Error(`${preparte.numero_pedido || preparteId}: sin fecha de ejecución válida`);
  }

  // 4. Verificar/crear daily report para la fecha (con cache para bulk)
  const executionDate = parsedDate.format('YYYY-MM-DD');
  let dailyReportId = dailyReportCache?.get(executionDate);

  if (!dailyReportId) {
    const existingReports = await checkDailyReportExists([executionDate]);
    dailyReportId = existingReports[0]?.id;

    if (!dailyReportId) {
      const newReport = await createDailyReport([executionDate]);
      if (!newReport?.[0]?.id) {
        throw new Error('No se pudo crear el parte diario');
      }
      dailyReportId = newReport[0].id;
    }

    dailyReportCache?.set(executionDate, dailyReportId);
  }

  // 5. Crear fila en dailyreportrows
  const dailyReportData = {
    daily_report_id: dailyReportId,
    customer_id: preparte.cliente_id,
    service_id: preparte.contrato_id,
    item_id: preparte.item,
    start_time: preparte.start_time || null,
    end_time: preparte.end_time || null,
    working_day: preparte.jornada,
    description: preparte.observaciones || '',
    sector_service_id: preparte.sector_service_id,
    areas_service_id: preparte.areas_service_id,
    type_service: preparte.tipo as 'mensual' | 'adicional' | 'adicional_permanente',
    status: 'sin_recursos_asignados' as const,
    preparte_id: preparteId,
  };

  const createdRows = await createDailyReportRow([dailyReportData]);
  const createdRowId = createdRows?.[0]?.id;

  if (!createdRowId) {
    throw new Error('No se pudo crear la fila en el parte diario');
  }

  // 6. Asociar equipos del cliente si existen
  if (preparte.equipos_cliente) {
    const equipmentIds = Array.isArray(preparte.equipos_cliente)
      ? preparte.equipos_cliente
      : [preparte.equipos_cliente].filter(Boolean);

    if (equipmentIds.length > 0) {
      await createDailyReportCustomerEquipmentRelations(createdRowId, equipmentIds);
    }
  }

  // 7. Actualizar status del preparte
  const statusUpdate: Partial<Preparte> = {
    status: preparte.status === 'vencido' ? 'vencido' : 'confirmado',
  };
  if (confirmedBy) {
    statusUpdate.confirmed_by = confirmedBy;
  }
  await updatePreparte(preparteId, statusUpdate);

  return { success: true, dailyReportRowId: createdRowId, alreadyExisted: false };
}

/**
 * Server action: Confirma un preparte individual y lo migra al parte diario.
 * Usado desde handleConfirm (individual) en PreparteManager.
 *
 * @param overrideExecutionDate - ISO string de fecha override (para vencidos con nueva fecha)
 */
export async function confirmPreparteToDailyReport(preparteId: string, overrideExecutionDate?: string) {
  return _confirmSinglePreparte(preparteId, overrideExecutionDate);
}

/**
 * Server action: Confirma múltiples prepartes y los migra al parte diario.
 * Usado desde PreparteBulkStatusModal (masivo).
 * Gestiona un cache interno de daily reports por fecha para optimizar.
 */
export async function confirmMultiplePrepartesToDailyReport(preparteIds: string[], confirmedBy: string) {
  const dailyReportCache = new Map<string, string>();
  let succeeded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const id of preparteIds) {
    try {
      const result = await _confirmSinglePreparte(id, undefined, confirmedBy, dailyReportCache);
      if (result.alreadyExisted) {
        skipped++;
      } else {
        succeeded++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(message);
      logger.error('Error al confirmar preparte en bulk', { data: { preparteId: id, error } });
    }
  }

  return { succeeded, skipped, errors };
}

/**
 * Registra un cambio en el log de cambios de preparte.
 * Diseñado para ser genérico y soportar cambios de cualquier campo.
 */
export async function logPreparteChange(changeLog: PreparteChangeLog) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const data = await prisma.preparte_change_logs.create({
      data: {
        preparte_id: changeLog.preparte_id,
        field_name: changeLog.field_name,
        old_value: changeLog.old_value,
        new_value: changeLog.new_value,
        reason: changeLog.reason,
        changed_by: changeLog.changed_by || user?.id || null,
        metadata: changeLog.metadata ? JSON.parse(JSON.stringify(changeLog.metadata)) : {},
      },
    });

    return data;
  } catch (error) {
    logger.error('Error logging preparte change', { data: { error } });
    throw new Error('Error al registrar el cambio en el historial');
  }
}

/**
 * Obtiene el historial de cambios de un preparte con el nombre del usuario que realizó el cambio.
 */
export async function getPreparteChangeLogs(preparteId: string) {
  try {
    const data = await prisma.preparte_change_logs.findMany({
      where: { preparte_id: preparteId },
      include: {
        profile: { select: { credential_id: true, fullname: true } },
      },
      orderBy: { changed_at: 'desc' },
    });

    return data.map((log) => ({
      ...log,
      changed_by_name: log.profile?.fullname || null,
      metadata: log.metadata as Record<string, unknown> | null,
      profile: undefined,
    }));
  } catch (error) {
    logger.error('Error fetching preparte change logs', { data: { error } });
    throw new Error('Error al obtener el historial de cambios');
  }
}

/**
 * Obtiene el historial de cambios de todos los prepartes con el mismo numero_pedido.
 */
export async function getPreparteChangeLogsByOrderNumber(numeroPedido: string) {
  try {
    const data = await prisma.preparte_change_logs.findMany({
      where: {
        preparte: { numero_pedido: numeroPedido },
      },
      include: {
        profile: { select: { credential_id: true, fullname: true } },
      },
      orderBy: { changed_at: 'desc' },
    });

    return data.map((log) => ({
      ...log,
      changed_by_name: log.profile?.fullname || null,
      metadata: log.metadata as Record<string, unknown> | null,
      profile: undefined,
    }));
  } catch (error) {
    logger.error('Error fetching preparte change logs by order number', { data: { error } });
    throw new Error('Error al obtener el historial de cambios');
  }
}

// ── Reporte de Preparte ──────────────────────────────────────────────────

export type PreparteReportFilters = {
  from: string; // ISO date string YYYY-MM-DD
  to: string; // ISO date string YYYY-MM-DD
  clientIds?: string[];
  statuses?: preparte_status[];
  groupBy: 'line' | 'order';
};

export type PreparteReportDetail = {
  id: string;
  numero_pedido: string | null;
  clientName: string;
  contractName: string;
  itemName: string | null;
  requestDate: string | null;
  executionDate: string | null;
  status: string;
  solicitante: string;
  observaciones: string | null;
};

export type PreparteClientSummary = {
  clientName: string;
  total: number;
  byStatus: Record<string, { count: number; percentage: number }>;
  lostPercentage: number;
};

export type PreparteReportSummary = {
  from: string;
  to: string;
  clientSummaries: PreparteClientSummary[];
  total: number;
  byStatus: Record<string, { count: number; percentage: number }>;
  lostPercentage: number;
};

export type PreparteReportResult = {
  summary: PreparteReportSummary;
  details: PreparteReportDetail[];
};

export async function getPreparteReportData(filters: PreparteReportFilters): Promise<PreparteReportResult> {
  logger.info('Generando reporte de preparte', { data: { filters } });

  try {
    const fromDate = new Date(`${filters.from}T00:00:00Z`);
    const toDate = new Date(`${filters.to}T23:59:59Z`);

    const where: Record<string, unknown> = {
      OR: [
        { executionDate: { gte: fromDate, lte: toDate } },
        {
          executionDate: null,
          requestDate: { gte: fromDate, lte: toDate },
        },
      ],
    };

    if (filters.clientIds && filters.clientIds.length > 0) {
      where.cliente_id = { in: filters.clientIds };
    }

    if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    const data = await prisma.preparte.findMany({
      where,
      select: {
        id: true,
        numero_pedido: true,
        status: true,
        solicitante: true,
        observaciones: true,
        executionDate: true,
        requestDate: true,
        customers: { select: { name: true } },
        customer_services: { select: { service_name: true } },
        service_items: { select: { item_name: true } },
      },
      orderBy: [{ status: 'asc' }, { executionDate: 'asc' }],
    });

    const total = data.length;

    // Helper para calcular estadísticas de un grupo de registros
    function computeStats(rows: typeof data) {
      const count = rows.length;
      const statusCounts: Record<string, number> = {};
      for (const row of rows) {
        const s = row.status || 'sin_estado';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }
      const byStatus: Record<string, { count: number; percentage: number }> = {};
      for (const [status, c] of Object.entries(statusCounts)) {
        byStatus[status] = {
          count: c,
          percentage: count > 0 ? Math.round((c / count) * 10000) / 100 : 0,
        };
      }
      const rechazadoCount = statusCounts['rechazado'] || 0;
      const vencidoCount = statusCounts['vencido'] || 0;
      const lostPercentage = count > 0 ? Math.round(((rechazadoCount + vencidoCount) / count) * 10000) / 100 : 0;
      return { total: count, byStatus, lostPercentage };
    }

    // Agrupar por cliente
    const clientGroups = new Map<string, typeof data>();
    for (const row of data) {
      const clientName = row.customers?.name || 'Sin cliente';
      const group = clientGroups.get(clientName) || [];
      group.push(row);
      clientGroups.set(clientName, group);
    }

    // Resumen por cliente
    const clientSummaries: PreparteClientSummary[] = [...clientGroups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clientName, rows]) => ({
        clientName,
        ...computeStats(rows),
      }));

    // Totales globales
    const overallStats = computeStats(data);

    const summary: PreparteReportSummary = {
      from: filters.from,
      to: filters.to,
      clientSummaries,
      total,
      byStatus: overallStats.byStatus,
      lostPercentage: overallStats.lostPercentage,
    };

    const details: PreparteReportDetail[] = data.map((row) => ({
      id: row.id,
      numero_pedido: row.numero_pedido,
      clientName: row.customers?.name || '-',
      contractName: row.customer_services?.service_name || '-',
      itemName: row.service_items?.item_name || null,
      requestDate: row.requestDate ? moment(row.requestDate).format('DD/MM/YYYY') : null,
      executionDate: row.executionDate ? moment(row.executionDate).format('DD/MM/YYYY') : null,
      status: row.status || 'sin_estado',
      solicitante: row.solicitante,
      observaciones: row.observaciones,
    }));

    return { summary, details };
  } catch (error) {
    logger.error('Error generando reporte de preparte', { data: { error } });
    throw error;
  }
}
