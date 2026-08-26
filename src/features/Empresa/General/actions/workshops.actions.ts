'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const logger = new Logger('workshops.actions');

// ==================== TYPES ====================

export type Workshop = Awaited<ReturnType<typeof fetchAllWorkshops>>[number];
export type WorkshopSector = Awaited<ReturnType<typeof fetchAllWorkshopSectors>>[number];

// ==================== WORKSHOP ACTIONS ====================

export async function fetchAllWorkshops() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    logger.warn('No company ID found');
    return [];
  }

  const { data, error } = await supabase
    .from('workshops')
    .select(
      `
      *,
      provinces(id, name),
      cities(id, name)
    `
    )
    .eq('company_id', company_id)
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching workshops', { data: { error } });
    return [];
  }

  return data || [];
}

export async function fetchActiveWorkshops() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    logger.warn('No company ID found');
    return [];
  }

  const { data, error } = await supabase
    .from('workshops')
    .select(
      `
      *,
      provinces(id, name),
      cities(id, name)
    `
    )
    .eq('company_id', company_id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching active workshops', { data: { error } });
    return [];
  }

  return data || [];
}

export async function fetchInternalWorkshops() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    logger.warn('No company ID found');
    return [];
  }

  const { data, error } = await supabase
    .from('workshops')
    .select('id, name')
    .eq('company_id', company_id)
    .eq('is_active', true)
    .eq('type', 'interno')
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching internal workshops', { data: { error } });
    return [];
  }

  return data || [];
}

export async function createWorkshop(workshop: {
  name: string;
  type: 'interno' | 'externo';
  address?: string | null;
  province?: number | null;
  city?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  provider_name?: string | null;
  provider_phone?: string | null;
  provider_email?: string | null;
  is_active: boolean;
}) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No company ID found');
  }

  const { data, error } = await supabase
    .from('workshops')
    .insert({
      ...workshop,
      company_id,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating workshop', { data: { error } });
    throw new Error('Error creating workshop');
  }

  logger.info('Workshop created successfully', { data: { workshopId: data.id } });
  return data;
}

export async function updateWorkshop(workshop: {
  id: string;
  name: string;
  type: 'interno' | 'externo';
  address?: string | null;
  province?: number | null;
  city?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  provider_name?: string | null;
  provider_phone?: string | null;
  provider_email?: string | null;
  is_active: boolean;
}) {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    throw new Error('No company ID found');
  }

  const { id, ...updateData } = workshop;

  const { data, error } = await supabase
    .from('workshops')
    .update(updateData)
    .eq('id', id)
    .eq('company_id', company_id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating workshop', { data: { error } });
    throw new Error('Error updating workshop');
  }

  logger.info('Workshop updated successfully', { data: { workshopId: data.id } });
  return data;
}

// ==================== WORKSHOP SECTOR ACTIONS ====================

export async function fetchAllWorkshopSectors() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;

  if (!company_id) {
    logger.warn('No company ID found');
    return [];
  }

  const { data, error } = await supabase
    .from('workshop_sectors')
    .select(
      `
      *,
      workshops(id, name, type)
    `
    )
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching workshop sectors', { data: { error } });
    return [];
  }

  // Filter sectors by company (through workshops)
  const filteredData = data?.filter((sector) => sector.workshops !== null) || [];

  return filteredData;
}

export async function fetchSectorsByWorkshop(workshopId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('workshop_sectors')
    .select(
      `
      *,
      workshops(id, name, type)
    `
    )
    .eq('workshop_id', workshopId)
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching sectors by workshop', { data: { error, workshopId } });
    return [];
  }

  return data || [];
}

export async function createWorkshopSector(sector: {
  name: string;
  description?: string | null;
  workshop_id: string;
  is_active: boolean;
  max_capacity?: number | null;
}) {
  const supabase = await supabaseServer();

  // Guarda contra duplicados dentro del mismo taller: repetir el alta del mismo
  // sector creaba una segunda fila identica sin ningun aviso (ticket 616).
  const { data: existing } = await supabase
    .from('workshop_sectors')
    .select('id, name')
    .eq('workshop_id', sector.workshop_id)
    .ilike('name', sector.name.trim())
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error(`Ya existe el sector "${existing[0].name}" en este taller.`);
  }

  const { data, error } = await supabase.from('workshop_sectors').insert(sector).select().single();

  if (error) {
    logger.error('Error creating workshop sector', { data: { error } });
    throw new Error('Error creating workshop sector');
  }

  logger.info('Workshop sector created successfully', { data: { sectorId: data.id } });
  return data;
}

export async function updateWorkshopSector(sector: {
  id: string;
  name: string;
  description?: string | null;
  workshop_id: string;
  is_active: boolean;
  max_capacity?: number | null;
}) {
  const supabase = await supabaseServer();

  const { id, ...updateData } = sector;

  const { data, error } = await supabase.from('workshop_sectors').update(updateData).eq('id', id).select().single();

  if (error) {
    logger.error('Error updating workshop sector', { data: { error } });
    throw new Error('Error updating workshop sector');
  }

  logger.info('Workshop sector updated successfully', { data: { sectorId: data.id } });
  return data;
}
