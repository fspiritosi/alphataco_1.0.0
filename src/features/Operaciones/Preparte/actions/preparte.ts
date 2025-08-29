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
  observaciones?: string;
  executionDate: string;
  requestDate: string;
  quantity?: number;
  numero_pedido: string;
};

// Create a new preparte
export async function createPreparte(
  prepartesData: Omit<Preparte, 'id'> | Omit<Preparte, 'id'>[] | Omit<Preparte, 'id'>[][]
) {
  const supabase = supabaseServer();

  try {
    console.log('📦 Data recibida en createPreparte:', JSON.stringify(prepartesData, null, 2));

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

    console.log('🔄 Data normalizada:', JSON.stringify(dataToInsert, null, 2));

    // Validar que tenemos datos válidos
    if (dataToInsert.length === 0) {
      throw new Error('No hay datos válidos para insertar');
    }

    const validatedData = dataToInsert.map((item) => ({
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
  const { data, error } = await supabase
    .from('preparte' as any)
    .update({
      ...preparteData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating preparte:', error);
    throw new Error('Error al actualizar el preparte');
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

// Get preparte by ID
export async function getPreparteById(id: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('preparte' as any)
    .select('*')
    .eq('id', id)
    .single();

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

  const { data, error } = await supabase
    .from('preparte' as any)
    .select('numero_pedido')
    .not('numero_pedido', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error al obtener el último número de pedido:', error);
    return 'PED-0000';
  }

  return data?.numero_pedido || 'PED-0000';
}
