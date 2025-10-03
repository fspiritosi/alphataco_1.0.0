'use server';

import { supabaseServer } from '@/lib/supabase/server';
// import { cookies } from 'next/headers';

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
  executionDate: string;
  requestDate: string;
  quantity?: number;
  numero_pedido: string;
  sector_service_id?: string | null;
  areas_service_id?: string | null;
  equipos_cliente?: string | null;
  // nueva columna para almacenar la URL o ruta de la imagen del preparte
  preparteImage?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Create a new preparte
export async function createPreparte(
  prepartesData: Omit<Preparte, 'id'> | Omit<Preparte, 'id'>[] | Omit<Preparte, 'id'>[][]
) {
  const supabase = supabaseServer();

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

    // Normalizar claves foráneas antes de insertar
    const normalized = await Promise.all(
      dataToInsert.map(async (item) => {
        let sector_fk: string | null | undefined = item.sector_service_id ?? null;
        let area_fk: string | null | undefined = item.areas_service_id ?? null;
        try {
          // Si viene un id de service_sectors, obtener el service_sectors.id correspondiente al sector_id
          if (sector_fk) {
            // Primero verificar si el ID existe en service_sectors
            const { data: ss, error: ssErr } = await supabase
              .from('service_sectors')
              .select('id, sector_id')
              .or(`id.eq.${sector_fk},and(sector_id.eq.${sector_fk},service_id.eq.${item.contrato_id})`)
              .maybeSingle?.();
            // .maybeSingle puede no existir según versión; fallback a single
            // @ts-ignore
            if (!ss && !ssErr) {
              const { data: ss2 } = await supabase
                .from('service_sectors')
                .select('id, sector_id')
                .or(`id.eq.${sector_fk},and(sector_id.eq.${sector_fk},service_id.eq.${item.contrato_id})`)
                .single();
              // @ts-ignore
              if (ss2) {
                // @ts-ignore
                sector_fk = ss2.id as string | undefined;
              }
            } else if (ss) {
              // @ts-ignore
              sector_fk = ss.id as string | undefined;
            }
          }
        } catch (e) {
          console.warn('No se pudo normalizar sector_service_id, usando valor original:', e);
        }

        try {
          // Si viene un id de service_areas desde el form, obtener el service_areas.id correspondiente al area_id
          if (area_fk) {
            // Primero verificar si el ID existe en service_areas
            const { data: sa, error: saErr } = await supabase
              .from('service_areas')
              .select('id, area_id')
              .or(`id.eq.${area_fk},and(area_id.eq.${area_fk},service_id.eq.${item.contrato_id})`)
              .maybeSingle?.();

            if (sa) {
              // Si encontramos el registro, usar el ID de service_areas
              area_fk = sa.id;
            } else if (!saErr) {
              // Si no hay error pero no se encontró, intentar con el ID directo
              console.warn('No se encontró el área en service_areas, usando ID directo');
            } else {
              console.error('Error buscando el área:', saErr);
              area_fk = null;
            }
          }
        } catch (e) {
          console.warn('No se pudo normalizar areas_service_id, usando valor original:', e);
        }

        return {
          ...item,
          sector_service_id: sector_fk ?? null,
          areas_service_id: area_fk ?? null,
          // Guardar solo el primer equipo seleccionado (si viene array del form)
          equipos_cliente: Array.isArray(item.equipos_cliente)
            ? item.equipos_cliente[0] ?? null
            : item.equipos_cliente ?? null,
        };
      })
    );

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
      sector_service_id: item.sector_service_id ?? null,
      areas_service_id: item.areas_service_id ?? null,
      equipos_cliente: item.equipos_cliente ?? null,
      preparteImage: (item as any).preparteImage ?? null,
    }));

    const { data, error } = await supabase
      .from('preparte' as any)
      .insert(validatedData)
      .select();

    if (error) {
      console.error('🔴 Error Supabase:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('🔴 Error en createPreparte:', error);
    throw new Error('Error al crear los prepartes: ' + (error as Error).message);
  }
}

// Update an existing preparte
export async function updatePreparte(id: string, preparteData: Partial<Preparte>) {
  const supabase = supabaseServer();
  console.log(preparteData);
  // Construir payload: solo tocar sector/área/equipos si vienen en el payload
  const payload: any = {
    ...preparteData,
    updated_at: new Date().toISOString(),
  };
  console.log(payload);
  // Nunca enviar columnas que no existen en la tabla
  if ('image_url' in payload) delete payload.image_url;

  // Equipos: solo si la clave está presente
  if ('equipos_cliente' in preparteData) {
    payload.equipos_cliente = Array.isArray(preparteData.equipos_cliente)
      ? preparteData.equipos_cliente?.[0] ?? null
      : preparteData.equipos_cliente ?? null;
  }

  // Sector: normalizar solo si la clave está presente y tiene valor
  if ('sector_service_id' in preparteData) {
    let sector_fk: string | null | undefined = preparteData.sector_service_id ?? null;
    if (sector_fk) {
      // Obtener cliente_id solo si es necesario para normalizar
      let clienteId = preparteData.cliente_id as string | undefined;
      if (!clienteId) {
        const { data: current } = await supabase
          .from('preparte' as any)
          .select('cliente_id')
          .eq('id', id)
          .single();
        clienteId = current?.cliente_id as string | undefined;
      }

      try {
        const { data: ss, error: ssErr } = await supabase
          .from('service_sectors')
          .select('id, sector_id')
          .or(`id.eq.${sector_fk},and(sector_id.eq.${sector_fk},service_id.eq.${clienteId})`)
          .maybeSingle?.();
        // @ts-ignore fallback
        if (!ss && !ssErr) {
          const { data: ss2 } = await supabase
            .from('service_sectors')
            .select('id, sector_id')
            .or(`id.eq.${sector_fk},and(sector_id.eq.${sector_fk},service_id.eq.${clienteId})`)
            .single();
          // @ts-ignore
          if (ss2) {
            // @ts-ignore
            sector_fk = ss2.id as string | undefined;
          }
        } else if (ss) {
          // @ts-ignore
          sector_fk = ss.id as string | undefined;
        }
      } catch (e) {
        console.warn('[updatePreparte] No se pudo normalizar sector_service_id, usando valor original:', e);
      }
    }
    payload.sector_service_id = sector_fk; // puede ser string o null si explícitamente se envió null
  }

  // Área: normalizar solo si la clave está presente y tiene valor
  if ('areas_service_id' in preparteData) {
    let area_fk: string | null | undefined = preparteData.areas_service_id ?? null;
    if (area_fk) {
      // Obtener contrato_id solo si es necesario para normalizar
      let contratoId = preparteData.contrato_id as string | undefined;
      if (!contratoId) {
        const { data: current } = await supabase
          .from('preparte' as any)
          .select('contrato_id')
          .eq('id', id)
          .single();
        contratoId = current?.contrato_id as string | undefined;
      }

      try {
        const { data: sa, error: saErr } = await supabase
          .from('service_areas')
          .select('id, area_id')
          .or(`id.eq.${area_fk},and(area_id.eq.${area_fk},service_id.eq.${contratoId})`)
          .maybeSingle?.();

        if (sa) {
          // Si encontramos el registro, usar el ID de service_areas
          area_fk = sa.id;
        } else if (!saErr) {
          // Si no hay error pero no se encontró, intentar con el ID directo
          console.warn('[updatePreparte] No se encontró el área en service_areas, usando ID directo');
        } else {
          console.error('[updatePreparte] Error buscando el área:', saErr);
          area_fk = null;
        }
      } catch (e) {
        console.warn('[updatePreparte] No se pudo normalizar areas_service_id, usando valor original:', e);
      }
    }
    payload.areas_service_id = area_fk; // puede ser string o null si explícitamente se envió null
  }

  // Si viene la url/route de la imagen, incluirla tal cual
  if ('preparteImage' in preparteData) {
    (payload as any).preparteImage = preparteData.preparteImage ?? null;
  }
  console.log();
  const { data, error } = await supabase
    .from('preparte' as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating preparte:', error);
    throw new Error('Error al actualizar el preparte');
  }

  // Si hay un número de pedido y se actualizó la imagen, actualizar todas las líneas
  if (payload.numero_pedido && payload.preparteImage) {
    try {
      await updatePreparteImageByOrderNumber(payload.numero_pedido, payload.preparteImage);
    } catch (error) {
      console.error('Error al actualizar imágenes de todas las líneas:', error);
      // No lanzamos el error para no fallar la actualización principal
    }
  }

  return data;
}

// Delete a preparte
export async function deletePreparte(id: string) {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from('preparte' as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting preparte:', error);
    throw new Error('Error al eliminar el preparte');
  }

  return { success: true };
}

// Actualiza la imagen para todas las filas que comparten el mismo número de pedido
export async function updatePreparteImageByOrderNumber(numero_pedido: string, imageUrl: string) {
  console.log('🔄 [updatePreparteImageByOrderNumber] Actualizando imagen para numero_pedido:', numero_pedido);

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('preparte' as any)
    .update({ preparteImage: imageUrl, updated_at: new Date().toISOString() })
    .eq('numero_pedido', numero_pedido)
    .select();

  if (error) {
    console.error('❌ [updatePreparteImageByOrderNumber] Error:', error);
    throw new Error('Error al actualizar la imagen del pedido');
  }

  console.log('✅ [updatePreparteImageByOrderNumber] Actualizadas', data?.length || 0, 'filas');
  return data;
}

// Get preparte by ID
export async function getPreparteById(id: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('preparte').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching preparte:', error);
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
  const supabase = supabaseServer();
  let query = supabase
    .from('preparte' as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.cliente_id) {
    query = query.eq('cliente_id', options.cliente_id);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing prepartes:', error);
    throw new Error('Error al listar los prepartes');
  }

  return data;
}

export async function getLastOrderNumber() {
  const supabase = supabaseServer();

  // Evitar .single() que dispara PGRST116 cuando no hay filas
  const { data, error } = await supabase
    .from('preparte' as any)
    .select('numero_pedido')
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error al obtener el último número de pedido:', error);
    return 'PED-0000';
  }

  if (!data || data.length === 0) return 'PED-0000';

  return (data[0] as any)?.numero_pedido || 'PED-0000';
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
  const supabase = supabaseServer();

  try {
    // Construir la consulta base
    let query = supabase.from('preparte' as any).select('*', { count: 'exact' });

    // Aplicar ordenamiento
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      query = query.order(id, { ascending: !desc });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Aplicar filtros
    const toStartOfDayISO = (d: any) => {
      const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : (d as Date);
      if (Number.isNaN(date?.getTime?.())) return undefined;
      date.setHours(0, 0, 0, 0);
      return date.toISOString();
    };
    const toEndOfDayISO = (d: any) => {
      const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : (d as Date);
      if (Number.isNaN(date?.getTime?.())) return undefined;
      date.setHours(23, 59, 59, 999);
      return date.toISOString();
    };

    for (const filter of columnFilters || []) {
      const { id, value } = filter || {};
      if (value == null || value === '') continue;

      // Rango de fechas: { from?: Date|string|null, to?: Date|string|null }
      if (typeof value === 'object' && value !== null && ('from' in value || 'to' in value)) {
        const fromISO = (value as any)?.from ? toStartOfDayISO((value as any).from) : undefined;
        const toISO = (value as any)?.to ? toEndOfDayISO((value as any).to) : undefined;
        if (fromISO) query = query.gte(id, fromISO);
        if (toISO) query = query.lte(id, toISO);
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
    console.error('Error al cargar prepartes:', error);
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
  const supabase = supabaseServer();

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

  console.log('🔍 [movePreparteFile] Debug info:', {
    fromPublicUrl,
    baseUrl,
    detectedBucket,
    BUCKET,
    clienteName,
    contratoName,
    numeroPedido,
    empresaDir,
    contratoDir,
  });

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

  console.log('🔍 [movePreparteFile] From path:', fromPath);

  // Si el cliente removió espacios de la URL (ej: via replace(/\s/g, '')), intentar resolver el nombre real
  const resolveActualObject = async (candidate: string): Promise<string> => {
    // Buscar en la raíz del bucket (ya que el hook sube al root con el nombre del archivo)
    const parentDir = candidate.includes('/') ? candidate.split('/').slice(0, -1).join('/') : '';
    const candName = candidate.split('/').pop() as string;
    const withoutSpaces = (s: string) => s.replace(/\s+/g, '');
    try {
      const { data: listData, error: listErr } = await supabase.storage.from(BUCKET).list(parentDir);
      if (listErr) {
        console.warn('⚠️ No se pudo listar el bucket para resolver nombre real:', listErr.message);
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
      console.warn('⚠️ Error resolviendo nombre real del objeto:', e);
      return candidate;
    }
  };

  // Resolver posible desincronización de espacios en el nombre
  fromPath = await resolveActualObject(fromPath);

  const currentExt = fromPath.split('.').pop()?.toLowerCase() || 'jpg';
  const targetPath = `${empresaDir}/${contratoDir}/${numeroPedido}/${numeroPedido}.${currentExt}`;

  console.log('🔍 [movePreparteFile] Moving from:', fromPath, 'to:', targetPath);

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
      console.error('❌ Error moviendo archivo:', error);
      throw new Error(`No se pudo mover el archivo en Storage: ${error.message}`);
    }
    console.log('✅ Archivo movido exitosamente');
  }

  // URL pública final
  const finalUrl = `${baseUrl.replace(/\/$/, '')}/${BUCKET}/${targetPath}`;
  console.log('🔍 [movePreparteFile] Final URL:', finalUrl);
  return finalUrl;
}
