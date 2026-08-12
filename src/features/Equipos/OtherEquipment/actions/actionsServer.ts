'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import moment from 'moment';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Database } from '../../../../../database.types';

const logger = new Logger('OtherEquipment/actions');

// ─── Tipos derivados ─────────────────────────────────────────────────────────

type OtherEquipmentInsert = Database['public']['Tables']['other_equipment']['Insert'];
type OtherEquipmentUpdate = Database['public']['Tables']['other_equipment']['Update'];
type CertificationInsert = Database['public']['Tables']['other_equipment_certifications']['Insert'];

// Tipo extendido para create/update que incluye el array de contractors
type OtherEquipmentInsertWithContractors = Omit<OtherEquipmentInsert, 'company_id'> & {
  contractors?: string[];
};

type OtherEquipmentUpdateWithContractors = OtherEquipmentUpdate & {
  contractors?: string[];
};

// ─── Helper interno: obtener company_id de cookie ────────────────────────────

async function getCompanyId(): Promise<string> {
  const cookiesStore = await cookies();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No hay empresa seleccionada. Por favor selecciona una empresa.');
  }

  return company_id;
}

// ─── Validación de duplicados ────────────────────────────────────────────────

/**
 * Verifica que serial_number e intern_number no estén duplicados
 * dentro de la misma empresa (solo equipos activos).
 * excludeId permite excluir el registro actual al editar.
 */
async function validateUniqueFields(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  companyId: string,
  serialNumber: string | null | undefined,
  internNumber: string | null | undefined,
  excludeId?: string
) {
  const errors: string[] = [];

  if (serialNumber) {
    let query = supabase
      .from('other_equipment')
      .select('id')
      .eq('company_id', companyId)
      .eq('serial_number', serialNumber)
      .eq('is_active', true)
      .limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      errors.push(`El N° de Serie "${serialNumber}" ya está en uso por otro equipo`);
    }
  }

  if (internNumber) {
    let query = supabase
      .from('other_equipment')
      .select('id')
      .eq('company_id', companyId)
      .eq('intern_number', internNumber)
      .eq('is_active', true)
      .limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      errors.push(`El N° Interno "${internNumber}" ya está en uso por otro equipo`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('. '));
  }
}

/**
 * Verifica si serial_number o intern_number ya existen en otros equipos activos.
 * Retorna un objeto con los campos duplicados para que el form muestre errores inline.
 */
export async function checkOtherEquipmentDuplicates(
  serialNumber: string | null | undefined,
  internNumber: string | null | undefined,
  excludeId?: string
): Promise<{ serial_number?: string; intern_number?: string }> {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();
  const errors: { serial_number?: string; intern_number?: string } = {};

  if (serialNumber) {
    let query = supabase
      .from('other_equipment')
      .select('id')
      .eq('company_id', company_id)
      .eq('serial_number', serialNumber)
      .eq('is_active', true)
      .limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      errors.serial_number = 'Este N° de Serie ya está en uso por otro equipo';
    }
  }

  if (internNumber) {
    let query = supabase
      .from('other_equipment')
      .select('id')
      .eq('company_id', company_id)
      .eq('intern_number', internNumber)
      .eq('is_active', true)
      .limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      errors.intern_number = 'Este N° Interno ya está en uso por otro equipo';
    }
  }

  return errors;
}

/**
 * Resuelve la carrera entre dos altas simultaneas (doble click, reintento del navegador).
 *
 * validateUniqueFields consulta y despues inserta: no es atomico, asi que dos requests
 * en paralelo pasan la validacion los dos y terminan con un equipo duplicado.
 * Despues de insertar volvemos a mirar la tabla: si hay mas de un equipo activo con el
 * mismo N° interno o de serie, el registro mas nuevo se elimina a si mismo.
 *
 * El criterio (created_at, id) es determinista, por lo que ambos requests eligen el mismo
 * ganador y nunca se borran los dos.
 *
 * Devuelve el campo en conflicto si el registro recien creado fue descartado.
 */
async function discardIfDuplicateRace(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  companyId: string,
  created: { id: string; created_at: string; serial_number: string | null; intern_number: string | null }
): Promise<'serial_number' | 'intern_number' | null> {
  const fieldsToCheck = (['intern_number', 'serial_number'] as const).filter((field) => created[field]);

  for (const field of fieldsToCheck) {
    const { data: siblings } = await supabase
      .from('other_equipment')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq(field, created[field] as string)
      .eq('is_active', true);

    if (!siblings || siblings.length < 2) continue;

    const [winner] = [...siblings].sort((a, b) =>
      a.created_at === b.created_at ? a.id.localeCompare(b.id) : a.created_at < b.created_at ? -1 : 1
    );

    if (winner.id === created.id) continue;

    const { error: deleteError } = await supabase.from('other_equipment').delete().eq('id', created.id);

    if (deleteError) {
      logger.error('No se pudo descartar el equipo duplicado por request simultanea', {
        data: { id: created.id, field, error: deleteError.message },
      });
      throw new Error('Se creo un equipo duplicado y no se pudo revertir. Revisa el listado antes de reintentar.');
    }

    logger.warn('Equipo duplicado descartado por request simultanea', {
      data: { descartado: created.id, conservado: winner.id, field },
    });
    return field;
  }

  return null;
}

// ─── CRUD Principal ──────────────────────────────────────────────────────────

/**
 * Obtiene un registro de other_equipment por ID con todos sus JOINs.
 * Incluye tipo, subtipo, marca, modelo, propietario, jerarquía, centro de costo,
 * vehículo vinculado y contratistas asociados.
 */
export async function getOtherEquipmentById(id: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('other_equipment')
    .select(
      `
      *,
      type(id, name, generates_qr),
      sub_type(id, name),
      brand_vehicles(id, name),
      model_vehicles(id, name),
      equipment_owners(id, name),
      hierarchy(id, name),
      cost_center(id, name),
      vehicles(id, domain),
      contractor_other_equipment(customers(id, name))
      `
    )
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error al obtener other_equipment por ID', {
      data: { id, error: error.message },
    });
    throw new Error('Error al obtener el equipo');
  }

  // Transformar para que el formulario reciba un array de IDs de contractors
  return {
    ...data,
    contractors:
      data.contractor_other_equipment
        ?.map((rel) => (rel.customers as { id: string; name: string } | null)?.id)
        .filter(Boolean) ?? [],
  };
}

export type OtherEquipmentDetail = Awaited<ReturnType<typeof getOtherEquipmentById>>;

/**
 * Crea un nuevo registro de other_equipment.
 * Separa los contractors del payload principal y los gestiona en la tabla pivot.
 * Valida que no exista otro equipo activo con el mismo intern_number o serial_number.
 */
export async function createOtherEquipment(data: OtherEquipmentInsertWithContractors) {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();

  const { contractors, ...equipmentData } = data;

  // Validar que serial_number e intern_number no estén duplicados
  await validateUniqueFields(supabase, company_id, equipmentData.serial_number, equipmentData.intern_number);

  const { data: created, error } = await supabase
    .from('other_equipment')
    .insert({
      ...equipmentData,
      condition: 'operativo', // Asignar automáticamente el estado operativo
      company_id,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error al crear other_equipment', {
      data: { error: error.message },
    });
    throw new Error('Error al crear el equipo');
  }

  // Si otra request simultanea inserto el mismo equipo, descartar el sobrante antes de
  // asociar contratistas (asi no queda basura en la tabla pivot).
  const racedField = await discardIfDuplicateRace(supabase, company_id, created);

  if (racedField) {
    const label = racedField === 'intern_number' ? 'N° Interno' : 'N° de Serie';
    throw new Error(`El equipo con ese ${label} ya fue creado. No se generó un duplicado.`);
  }

  // Gestionar relaciones con contratistas
  if (contractors && contractors.length > 0) {
    await updateOtherEquipmentContractors(created.id, contractors as string[]);
  }

  revalidatePath('/dashboard/equipment');
  logger.info('Other equipment creado exitosamente', { data: { id: created.id } });
  return created;
}

export type OtherEquipmentRow = Awaited<ReturnType<typeof createOtherEquipment>>;

/**
 * Actualiza un registro de other_equipment existente.
 * Separa los contractors del payload principal y los gestiona en la tabla pivot.
 * Valida que no exista otro equipo activo (excluyendo el propio) con el mismo
 * intern_number o serial_number.
 */
export async function updateOtherEquipment(id: string, data: OtherEquipmentUpdateWithContractors) {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();

  const { contractors, ...equipmentData } = data;

  // Validar que serial_number e intern_number no estén duplicados (excluyendo el registro actual)
  await validateUniqueFields(supabase, company_id, equipmentData.serial_number, equipmentData.intern_number, id);

  const { data: updated, error } = await supabase
    .from('other_equipment')
    .update(equipmentData)
    .eq('id', id)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    logger.error('Error al actualizar other_equipment', {
      data: { id, error: error.message },
    });
    throw new Error('Error al actualizar el equipo');
  }

  // Gestionar relaciones con contratistas si se proporcionaron
  if (contractors !== undefined) {
    await updateOtherEquipmentContractors(id, contractors as string[]);
  }

  revalidatePath('/dashboard/equipment');
  logger.info('Other equipment actualizado exitosamente', { data: { id } });
  return updated;
}

/**
 * Elimina un registro de other_equipment por ID.
 * Solo permite eliminar registros de la empresa activa.
 */
export async function deleteOtherEquipment(id: string) {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();

  const { error } = await supabase.from('other_equipment').delete().eq('id', id).eq('company_id', company_id);

  if (error) {
    logger.error('Error al eliminar other_equipment', {
      data: { id, error: error.message },
    });
    throw new Error('Error al eliminar el equipo');
  }

  revalidatePath('/dashboard/equipment');
  logger.info('Other equipment eliminado exitosamente', { data: { id } });
}

/**
 * Activa o desactiva un equipo.
 * Al desactivar, registra el motivo y la fecha de baja.
 * Al activar, limpia el motivo y la fecha de baja.
 */
export async function toggleOtherEquipmentStatus(
  id: string,
  activate: boolean,
  reason?: Database['public']['Enums']['termination_reason_enum'],
  date?: Date
) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('other_equipment')
    .update({
      is_active: activate,
      reason_for_termination: activate ? null : reason ?? null,
      termination_date: activate ? null : date ? moment(date).format('YYYY-MM-DD') : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error al cambiar estado de other_equipment', {
      data: { id, activate, error: error.message },
    });
    throw new Error('Error al cambiar el estado del equipo');
  }

  revalidatePath('/dashboard/equipment');
  logger.info(`Other equipment ${activate ? 'activado' : 'desactivado'} exitosamente`, {
    data: { id },
  });
  return data;
}

// ─── Gestión de Contratistas ─────────────────────────────────────────────────

/**
 * Actualiza las relaciones de contratistas de un equipo con diff inteligente.
 * Consulta las relaciones actuales, inserta las nuevas y elimina las que ya no están.
 */
export async function updateOtherEquipmentContractors(equipmentId: string, contractorIds: string[]) {
  const supabase = await supabaseServer();

  // Obtener relaciones actuales
  const { data: currentRelations, error: fetchError } = await supabase
    .from('contractor_other_equipment')
    .select('contractor_id')
    .eq('equipment_id', equipmentId);

  if (fetchError) {
    logger.error('Error al obtener contratistas actuales', {
      data: { equipmentId, error: fetchError.message },
    });
    throw new Error('Error al gestionar contratistas del equipo');
  }

  const currentContractorIds = currentRelations?.map((r) => r.contractor_id) ?? [];

  // Calcular diferencias
  const toAdd = contractorIds.filter((cid) => !currentContractorIds.includes(cid));
  const toRemove = currentContractorIds.filter((cid) => cid !== null && !contractorIds.includes(cid));

  // Eliminar relaciones que ya no corresponden
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('contractor_other_equipment')
      .delete()
      .eq('equipment_id', equipmentId)
      .in('contractor_id', toRemove as string[]);

    if (deleteError) {
      logger.error('Error al eliminar contratistas del equipo', {
        data: { equipmentId, toRemove, error: deleteError.message },
      });
      throw new Error('Error al desasociar contratistas del equipo');
    }
  }

  // Insertar nuevas relaciones
  if (toAdd.length > 0) {
    const newRelations = toAdd.map((contractorId) => ({
      equipment_id: equipmentId,
      contractor_id: contractorId,
    }));

    const { error: insertError } = await supabase.from('contractor_other_equipment').insert(newRelations);

    if (insertError) {
      logger.error('Error al insertar contratistas del equipo', {
        data: { equipmentId, toAdd, error: insertError.message },
      });
      throw new Error('Error al asociar contratistas al equipo');
    }
  }

  logger.info('Contratistas del equipo actualizados', {
    data: { equipmentId, agregados: toAdd.length, eliminados: toRemove.length },
  });
}

// ─── Certificaciones ─────────────────────────────────────────────────────────

/**
 * Obtiene todas las certificaciones de un equipo.
 */
export async function getOtherEquipmentCertifications(equipmentId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('other_equipment_certifications')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al obtener certificaciones del equipo', {
      data: { equipmentId, error: error.message },
    });
    throw new Error('Error al obtener las certificaciones del equipo');
  }

  return data ?? [];
}

export type OtherEquipmentCertification = Awaited<ReturnType<typeof getOtherEquipmentCertifications>>[number];

/**
 * Crea una nueva certificación asociada a un equipo.
 */
export async function createOtherEquipmentCertification(
  data: Pick<CertificationInsert, 'equipment_id' | 'name' | 'file_url' | 'expiration_date'>
) {
  const supabase = await supabaseServer();

  const { data: created, error } = await supabase
    .from('other_equipment_certifications')
    .insert({
      equipment_id: data.equipment_id,
      name: data.name,
      file_url: data.file_url,
      expiration_date: data.expiration_date ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error al crear certificación del equipo', {
      data: { equipmentId: data.equipment_id, error: error.message },
    });
    throw new Error('Error al crear la certificación');
  }

  logger.info('Certificación creada exitosamente', {
    data: { id: created.id, equipmentId: data.equipment_id },
  });
  return created;
}

/**
 * Elimina una certificación por ID.
 * También elimina el archivo asociado en Supabase Storage si existe.
 */
export async function deleteOtherEquipmentCertification(id: string) {
  const supabase = await supabaseServer();

  // Obtener el file_url antes de eliminar para borrar del storage
  const { data: cert } = await supabase.from('other_equipment_certifications').select('file_url').eq('id', id).single();

  const { error } = await supabase.from('other_equipment_certifications').delete().eq('id', id);

  if (error) {
    logger.error('Error al eliminar certificación del equipo', {
      data: { id, error: error.message },
    });
    throw new Error('Error al eliminar la certificación');
  }

  // Eliminar archivo del storage si existe
  if (cert?.file_url) {
    const storagePath = extractStoragePath(cert.file_url, 'document-files');
    if (storagePath) {
      const { error: storageError } = await supabase.storage.from('document-files').remove([storagePath]);
      if (storageError) {
        logger.warn('No se pudo eliminar el archivo del storage', {
          data: { storagePath, error: storageError.message },
        });
      }
    }
  }

  logger.info('Certificación eliminada exitosamente', { data: { id } });
}

/**
 * Extrae el path relativo del storage a partir de una URL pública de Supabase.
 */
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.substring(idx + marker.length));
}

// ─── Fotos y Planos ──────────────────────────────────────────────────────────

/**
 * Actualiza el array de fotos de un equipo.
 * Reemplaza completamente el array existente con el nuevo.
 */
export async function updateOtherEquipmentPictures(id: string, pictures: string[]) {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();

  const { data, error } = await supabase
    .from('other_equipment')
    .update({ pictures })
    .eq('id', id)
    .eq('company_id', company_id)
    .select('id, pictures')
    .single();

  if (error) {
    logger.error('Error al actualizar fotos del equipo', {
      data: { id, error: error.message },
    });
    throw new Error('Error al actualizar las fotos del equipo');
  }

  logger.info('Fotos del equipo actualizadas', {
    data: { id, cantidad: pictures.length },
  });
  return data;
}

// ─── Catálogos ───────────────────────────────────────────────────────────────

/**
 * Obtiene la lista de vehículos activos de la empresa para el combobox de vinculación.
 * Solo retorna id y domain para ser eficiente.
 */
export async function getVehiclesForSelect() {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();

  const { data, error } = await supabase
    .from('vehicles')
    .select('id, domain')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .not('domain', 'is', null)
    .order('domain');

  if (error) {
    logger.error('Error al obtener vehículos para select', {
      data: { company_id, error: error.message },
    });
    throw new Error('Error al obtener los vehículos');
  }

  return data ?? [];
}

export type VehicleSelectItem = Awaited<ReturnType<typeof getVehiclesForSelect>>[number];

/**
 * Actualiza el array de planos de un equipo.
 * Reemplaza completamente el array existente con el nuevo.
 */
export async function updateOtherEquipmentBlueprints(id: string, blueprints: string[]) {
  const supabase = await supabaseServer();
  const company_id = await getCompanyId();

  const { data, error } = await supabase
    .from('other_equipment')
    .update({ blueprints })
    .eq('id', id)
    .eq('company_id', company_id)
    .select('id, blueprints')
    .single();

  if (error) {
    logger.error('Error al actualizar planos del equipo', {
      data: { id, error: error.message },
    });
    throw new Error('Error al actualizar los planos del equipo');
  }

  logger.info('Planos del equipo actualizados', {
    data: { id, cantidad: blueprints.length },
  });
  return data;
}
