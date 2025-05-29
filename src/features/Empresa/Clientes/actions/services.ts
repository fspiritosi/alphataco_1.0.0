'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Service = {
  id?: string;
  customer_id: string;
  area_id: string;
  sector_id: string;
  service_name: string;
  service_start: string;
  service_validity: string;
  is_active: boolean;
  contract_number?: string;
};

type ServiceForm = {
  id?: string;
  customer_id: string;
  area_id: string[];
  sector_id: string[];
  service_name: string;
  service_start: Date;
  service_validity: Date;
  is_active: boolean;
  contract_number?: string;
  service_areas?: Array<{
    area_id: string;
    areas_cliente: {
      id: string;
      nombre: string;
      descripcion_corta: string;
    };
  }>;
};

export async function handleServiceSubmit(
  values: ServiceForm,
  company_id: string,
  resetForm: () => void,
  router: ReturnType<typeof useRouter>
) {
  const supabase = supabaseBrowser();

  try {
    // 1. Crear el servicio
    const { data: serviceData, error } = await supabase
      .from('customer_services')
      .insert({
        company_id: company_id.replace(/"/g, ''),
        customer_id: values.customer_id,
        service_name: values.service_name,
        contract_number: values.contract_number || '',
        service_start: values.service_start.toISOString().split('T')[0],
        service_validity: values.service_validity.toISOString().split('T')[0],
        is_active: values.is_active,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error al crear el contrato: ${error.message}`);
    }

    const serviceId = serviceData?.id;
    if (!serviceId) {
      throw new Error('No se pudo obtener el ID del contrato creado');
    }

    // 2. Crear relaciones de áreas
    if (values.area_id?.length) {
      const areaInserts = values.area_id.map((area_id) => ({
        service_id: serviceId,
        area_id,
      }));

      const { error: areaError } = await supabase.from('service_areas' as any).insert(areaInserts);

      if (areaError) {
        throw new Error(`Error al crear relaciones de áreas: ${areaError.message}`);
      }
    }

    // 3. Crear relaciones de sectores
    if (values.sector_id?.length) {
      const sectorInserts = values.sector_id.map((sector_id) => ({
        service_id: serviceId,
        sector_id,
      }));

      const { error: sectorError } = await supabase.from('service_sectors' as any).insert(sectorInserts);

      if (sectorError) {
        throw new Error(`Error al crear relaciones de sectores: ${sectorError.message}`);
      }
    }

    toast.success('Contrato creado correctamente');
    resetForm();
    router.refresh();
    return true;
  } catch (error) {
    console.error('Error al crear el contrato:', error);
    toast.error('Error al crear el contrato');
    return false;
  }
}

export async function handleServiceUpdate(
  values: ServiceForm,
  editing_service_id: string,
  resetForm: () => void,
  router: ReturnType<typeof useRouter>
) {
  const supabase = supabaseBrowser();

  try {
    // 1. Actualizar datos principales del servicio
    const { error: updateError } = await supabase
      .from('customer_services')
      .update({
        customer_id: values.customer_id,
        service_name: values.service_name,
        contract_number: values.contract_number || '',
        service_start: values.service_start.toISOString().split('T')[0],
        service_validity: values.service_validity.toISOString().split('T')[0],
        is_active: values.is_active,
      })
      .eq('id', editing_service_id);

    if (updateError) {
      throw new Error(`Error al actualizar el contrato: ${updateError.message}`);
    }

    // 2. Manejo optimizado de áreas
    if (values.area_id) {
      // Obtener áreas actuales
      const { data: currentAreas, error: fetchAreasError } = await supabase
        .from('service_areas')
        .select('area_id')
        .eq('service_id', editing_service_id);

      if (fetchAreasError) {
        throw new Error(`Error al obtener áreas actuales: ${fetchAreasError.message}`);
      }

      const currentAreaIds = currentAreas?.map((a) => a.area_id) || [];
      const newAreaIds = values.area_id || [];

      // Encontrar áreas a eliminar (están en current pero no en new)
      const areasToDelete = currentAreaIds.filter((id) => !newAreaIds.includes(id));
      // Encontrar áreas a agregar (están en new pero no en current)
      const areasToAdd = newAreaIds.filter((id: string) => !currentAreaIds.includes(id));

      // Eliminar solo las áreas que ya no están en la selección
      if (areasToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('service_areas')
          .delete()
          .eq('service_id', editing_service_id)
          .in('area_id', areasToDelete);

        if (deleteError) {
          // Preservar el error original
          deleteError.message = `Error al eliminar relaciones de áreas: ${deleteError.message}`;
          throw deleteError;
        }
      }

      // Agregar solo las áreas nuevas
      if (areasToAdd.length > 0) {
        const areaInserts = areasToAdd.map((area_id: string) => ({
          service_id: editing_service_id,
          area_id,
        }));

        const { error: insertError } = await supabase.from('service_areas').insert(areaInserts);

        if (insertError) {
          throw new Error(`Error al agregar nuevas áreas: ${insertError.message}`);
        }
      }
    }

    // 3. Manejo optimizado de sectores
    if (values.sector_id) {
      // Obtener sectores actuales
      const { data: currentSectors, error: fetchSectorsError } = await supabase
        .from('service_sectors')
        .select('sector_id')
        .eq('service_id', editing_service_id);

      if (fetchSectorsError) {
        throw new Error(`Error al obtener sectores actuales: ${fetchSectorsError.message}`);
      }

      const currentSectorIds = currentSectors?.map((s) => s.sector_id) || [];
      const newSectorIds = values.sector_id || [];

      // Encontrar sectores a eliminar
      const sectorsToDelete = currentSectorIds.filter((id) => !newSectorIds.includes(id));
      // Encontrar sectores a agregar
      const sectorsToAdd = newSectorIds.filter((id: string) => !currentSectorIds.includes(id));

      // Eliminar solo los sectores que ya no están en la selección
      if (sectorsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('service_sectors')
          .delete()
          .eq('service_id', editing_service_id)
          .in('sector_id', sectorsToDelete);

        if (deleteError) {
          // Preservar el error original
          deleteError.message = `Error al eliminar relaciones de sectores: ${deleteError.message}`;
          throw deleteError;
        }
      }

      // Agregar solo los sectores nuevos
      if (sectorsToAdd.length > 0) {
        const sectorInserts = sectorsToAdd.map((sector_id: string) => ({
          service_id: editing_service_id,
          sector_id,
        }));

        const { error: insertError } = await supabase.from('service_sectors').insert(sectorInserts);

        if (insertError) {
          throw new Error(`Error al agregar nuevos sectores: ${insertError.message}`);
        }
      }
    }

    toast.success('Contrato actualizado correctamente');
    resetForm();
    router.refresh();
  } catch (error: any) {
    console.error('Error al actualizar el contrato:', error);

    // Verificar si es un error de restricción de clave foránea
    const errorMessage = error.message || '';
    const isForeignKeyError =
      error.code === '23503' ||
      errorMessage.includes('violates foreign key constraint') ||
      errorMessage.includes('dailyreportrows_areas_service_id_fkey');

    if (isForeignKeyError) {
      toast.error('No se pueden quitar áreas o sectores que están siendo utilizados en partes diarios');
    } else if (errorMessage) {
      // Mostrar el mensaje de error original si existe
      toast.error(`Error al actualizar el contrato: ${errorMessage}`);
    } else {
      toast.error('Error al actualizar el contrato');
    }
  }
}
