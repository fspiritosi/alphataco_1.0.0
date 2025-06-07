'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// General Actions

export async function getCompany() {
  try {
    const cookiesStore = cookies();
    const supabase = supabaseServer();
    const company_id = cookiesStore.get('actualComp')?.value;
    if (!company_id) return null;
    const { data, error } = await supabase
      .from('company')
      .select(
        `
      *,
      cities (
        name
      ),
      provinces(
        name
      )
    `
      )
      .eq('id', company_id);

    if (error) {
      console.error('Error fetching cost centers:', error);
      return null;
    }
    return data[0];
  } catch (error) {
    return null;
  }
}

// Cost Center Actions

export async function fetchAllCostCenters() {
  const cookiesStore = cookies();
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('cost_center').select('*').returns<CostCenter[]>();

  if (error) {
    console.error('Error fetching cost centers:', error);
    return [];
  }
  return data;
}

export const createCostCenter = async (costCenter: { name: string; is_active: boolean }) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('cost_center')
    .insert({ name: costCenter.name, is_active: costCenter.is_active })
    .returns<CostCenter[]>();

  if (error) {
    console.error('Error creating cost center:', error);
    throw new Error('Error creating cost center');
  }
  return data;
};

export const updateCostCenter = async (costCenter: { id: string; name: string; is_active: boolean }) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('cost_center')
    .update({ name: costCenter.name, is_active: costCenter.is_active })
    .eq('id', costCenter.id)
    .returns<CostCenter[]>();

  if (error) {
    console.error('Error updating cost center:', error);
    throw new Error('Error updating cost center');
  }
  return data;
};

// Sector Actions

export async function fetchAllSectors() {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('hierarchy').select('*').returns<[]>();

  if (error) {
    console.error('Error fetching sectors:', error);
    return [];
  }
  return data;
}

export const createSector = async (sector: { name: string; is_active: boolean }) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('hierarchy')
    .insert({ name: sector.name, is_active: sector.is_active })
    .returns<[]>();

  if (error) {
    console.error('Error creating sector:', error);
    throw new Error('Error creating sector');
  }
  return data;
};

export const updateSector = async (sector: { id: string; name: string; is_active: boolean }) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('hierarchy')
    .update({ name: sector.name, is_active: sector.is_active })
    .eq('id', sector.id)
    .returns<[]>();

  if (error) {
    console.error('Error updating sector:', error);
    throw new Error('Error updating sector');
  }
  return data;
};

export const getRoles = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const { data: roles, error } = await supabase.from('roles').select('*').eq('intern', false).neq('name', 'Invitado');
  if (error) {
    console.error('Error updating sector:', error);
    throw new Error('Error updating sector');
  }
  return roles;
};

export const fetchCustomers = async () => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .eq('company_id', company_id!);
  if (error) {
    console.error('Error fetching customers:', error);
  }
  return data;
};

export const getProfile = async (email: string) => {
  const cookiesStore = cookies();
  const supabase = supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const { data: profile, error } = await supabase.from('profile').select('*').eq('email', email);
  if (error) {
    console.error('Error fetching profile:', error);
  }
  return profile;
};
