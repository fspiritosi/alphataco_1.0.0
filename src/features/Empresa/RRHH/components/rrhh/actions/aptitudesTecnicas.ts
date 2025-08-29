'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Interfaz para los puestos
interface Position {
  id: string;
  name: string;
  is_active: boolean;
}

// Tipos para las tablas de Supabase
interface SupabaseAptitudTecnica {
  id: string;
  nombre: string;
  is_active: boolean;
}

interface SupabaseAptitudPuesto {
  aptitud_id: string;
  puesto_id: string;
}

// Tipos para la aplicación
export interface AptitudTecnica {
  id: string;
  nombre: string;
  is_active: boolean;
  puestos: string[];
  aptitudes_tecnicas_puestos: Array<{
    puesto_id: {
      id: string;
      name: string;
      is_active: boolean;
    };
    aptitud_id: string;
    created_at: string;
  }>;
}

// Interfaz para crear una nueva aptitud
type CreateAptitudTecnicaData = Omit<AptitudTecnica, 'id' | 'created_at' | 'updated_at'>;

interface UpdateAptitudTecnicaData {
  id: string;
  nombre?: string;
  descripcion?: string | null;
  puestos?: string[];
  is_active?: boolean;
}

// Tipo para el resultado de las consultas de puestos
interface PuestoResult {
  puesto_id: string;
}

/**
 * Obtiene todas las aptitudes técnicas desde la base de datos
 */
export async function getAptitudesTecnicas(): Promise<AptitudTecnica[]> {
  try {
    const cookiesStore = cookies();
    const supabase = supabaseServer();

    if (!supabase) {
      console.error('No se pudo inicializar el cliente de Supabase');
      return [];
    }

    const company_id = cookiesStore.get('actualComp')?.value;

    if (!company_id) {
      console.error('No se encontró el ID de la compañía en las cookies');
      return [];
    }

    // Primero obtenemos las aptitudes técnicas
    const { data: aptitudesData, error: aptitudesError } = await supabase
      .from('aptitudes_tecnicas' as any)
      .select('*, aptitudes_tecnicas_puestos(*, puesto_id(*))');

    if (aptitudesError) {
      console.error('Error al obtener aptitudes técnicas:', aptitudesError);
      return [];
    }

    if (!aptitudesData || aptitudesData.length === 0) {
      return [];
    }

    // Obtenemos los IDs de las aptitudes para buscar sus relaciones con puestos
    const aptitudesIds = aptitudesData.map((a) => a.id);

    // Obtenemos las relaciones con los puestos
    const { data: puestosData, error: puestosError } = await supabase
      .from('aptitudes_tecnicas_puestos' as any)
      .select('*')
      .in('aptitud_id', aptitudesIds);

    if (puestosError) {
      console.error('Error al obtener relaciones con puestos:', puestosError);
    }

    // Obtenemos todos los puestos para asegurarnos de tener sus nombres
    const { data: todosLosPuestos, error: errorPuestos } = await supabase
      .from('company_positions' as any)
      .select('*')
      .eq('is_active', true);

    if (errorPuestos) {
      console.error('Error al obtener la lista completa de puestos:', errorPuestos);
    }

    // Mapear los datos al formato esperado
    const aptitudes: AptitudTecnica[] = aptitudesData.map((aptitud: any) => {
      // Filtrar las relaciones que corresponden a esta aptitud
      const relacionesPuestos = puestosData?.filter((p: any) => p.aptitud_id === aptitud.id) || [];

      // Construir el array de aptitudes_tecnicas_puestos con la información completa de los puestos
      const aptitudesTecnicasPuestos = relacionesPuestos.map((rp: any) => {
        // Buscar el puesto correspondiente en la lista completa
        const puestoCompleto = todosLosPuestos?.find((p: any) => p.id === rp.puesto_id);

        return {
          ...rp,
          puesto_id: puestoCompleto || {
            id: rp.puesto_id,
            name: 'Puesto no encontrado',
            is_active: false,
          },
        };
      });

      // Extraer los IDs de los puestos
      const puestos = aptitudesTecnicasPuestos.map((atp: any) => atp.puesto_id?.id).filter(Boolean);

      return {
        ...aptitud,
        puestos,
        aptitudes_tecnicas_puestos: aptitudesTecnicasPuestos,
      };
    });

    return aptitudes;
  } catch (error) {
    console.error('Error inesperado al obtener aptitudes técnicas:', error);
    return [];
  }
}

/**
 * Obtiene los puestos de trabajo desde la base de datos
 */
export async function getPositions(): Promise<Position[]> {
  try {
    const cookiesStore = cookies();
    const supabase = supabaseServer();

    // Verificar que tengamos una instancia de Supabase
    if (!supabase) {
      console.error('No se pudo inicializar el cliente de Supabase');
      return [];
    }

    const company_id = cookiesStore.get('actualComp')?.value;

    if (!company_id) {
      console.error('No se encontró el ID de la compañía en las cookies');
      return [];
    }

    // Obtener los puestos activos
    const { data, error } = await supabase
      .from('company_positions')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al obtener los puestos:', error);
      return [];
    }

    // Mapear los datos al formato esperado
    const positions: Position[] = (data || []).map((puesto: any) => ({
      id: puesto.id,
      name: puesto.name,
      is_active: puesto.is_active,
    }));

    return positions;
  } catch (error) {
    console.error('Error inesperado al obtener los puestos:', error);
    return [];
  }
}

/**
 * Obtiene tanto las aptitudes técnicas como los puestos en una sola llamada
 */
export async function getAptitudesData() {
  try {
    const [aptitudes, positions] = await Promise.all([getAptitudesTecnicas(), getPositions()]);

    // Asegurarse de que siempre devolvamos arrays
    return {
      aptitudes: Array.isArray(aptitudes) ? aptitudes : [],
      positions: Array.isArray(positions) ? positions : [],
    };
  } catch (error) {
    console.error('Error al obtener los datos de aptitudes y puestos:', error);
    return { aptitudes: [], positions: [] };
  }
}

export async function createAptitudTecnica(aptitud: CreateAptitudTecnicaData): Promise<AptitudTecnica> {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  // Crear la aptitud
  const { data: aptitudData, error: aptitudError } = await supabase
    .from('aptitudes_tecnicas' as any)
    .insert({
      nombre: aptitud.nombre,
      is_active: aptitud.is_active ?? true,
    } as Omit<SupabaseAptitudTecnica, 'id'>)
    .select()
    .single();

  if (aptitudError) {
    console.error('Error al crear la aptitud técnica:', aptitudError);
    throw aptitudError;
  }

  if (!aptitudData) throw new Error('No se pudo crear la aptitud');

  // Insertar relaciones con puestos si existen
  if (aptitud.puestos?.length && aptitudData) {
    const relaciones = aptitud.puestos.map((puesto_id) => ({
      aptitud_id: aptitudData.id,
      puesto_id: String(puesto_id),
    }));

    const { error: puestosError } = await supabase.from('aptitudes_tecnicas_puestos' as any).insert(relaciones as any);

    if (puestosError) {
      console.error('Error al crear relaciones con puestos:', puestosError);
      throw puestosError;
    }
  }

  // Obtener la aptitud con sus relaciones
  const result = await getAptitudTecnicaById(aptitudData.id);
  if (!result) throw new Error('No se pudo obtener la aptitud creada');
  return result;
}

export async function updateAptitudTecnica(aptitud: UpdateAptitudTecnicaData): Promise<AptitudTecnica> {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { id, puestos } = aptitud;
  // Actualizar datos básicos de la aptitud
  const { data: updatedAptitud, error: updateError } = await (supabase as unknown as any)
    .from('aptitudes_tecnicas' as any)
    .update({
      id: aptitud.id,
      nombre: aptitud.nombre,
      is_active: aptitud.is_active ?? true,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error al actualizar la aptitud técnica:', updateError);
    throw updateError;
  }

  if (!updatedAptitud) throw new Error('No se pudo actualizar la aptitud');

  // Si se proporcionaron puestos, actualizar las relaciones
  if (puestos) {
    // Primero, eliminar todas las relaciones existentes
    const { error: deleteError } = await supabase
      .from('aptitudes_tecnicas_puestos' as any)
      .delete()
      .eq('aptitud_id', String(id));

    if (deleteError) {
      console.error('Error al eliminar relaciones de puestos existentes:', deleteError);
      throw deleteError;
    }

    // Luego, insertar las nuevas relaciones
    if (puestos.length > 0) {
      const relaciones = puestos.map((puesto_id) => ({
        aptitud_id: String(id),
        puesto_id: String(puesto_id),
      }));

      const { error: insertError } = await supabase.from('aptitudes_tecnicas_puestos' as any).insert(relaciones as any);

      if (insertError) {
        console.error('Error al insertar nuevas relaciones de puestos:', insertError);
        throw insertError;
      }
    }
  }

  // Obtener la aptitud con sus relaciones
  const result = await getAptitudTecnicaById(id);
  if (!result) throw new Error('No se pudo obtener la aptitud actualizada');
  return result;
}

// Función auxiliar para obtener una aptitud con sus puestos
async function getAptitudTecnicaById(id: string | number): Promise<AptitudTecnica | null> {
  const supabase = supabaseServer();

  try {
    // Obtener la aptitud
    const { data: aptitud, error: aptitudError } = await supabase
      .from('aptitudes_tecnicas' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (aptitudError || !aptitud) {
      console.error('Error al obtener la aptitud:', aptitudError);
      return null;
    }

    // Obtener los puestos relacionados
    const { data: puestos, error: puestosError } = await supabase
      .from('aptitudes_tecnicas_puestos' as any)
      .select('puesto_id')
      .eq('aptitud_id', id);

    if (puestosError) {
      console.error('Error al obtener los puestos de la aptitud:', puestosError);
      return null;
    }

    // Mapear los resultados al formato esperado
    return {
      ...aptitud,
      puestos: (puestos as Array<{ puesto_id: string }>).map((p) => p.puesto_id),
    } as AptitudTecnica;
  } catch (error) {
    console.error('Error inesperado al obtener la aptitud:', error);
    return null;
  }
}
