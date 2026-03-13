'use server';

import { Logger } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

import { revalidatePath } from 'next/cache';

const logger = new Logger('features/Empresa/General');

// General Actions

export async function getCompany() {
  try {
    const cookiesStore = await cookies();
    const supabase = await supabaseServer();
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
      logger.error('Error fetching company data', { data: { error } });
      return null;
    }
    return data[0];
  } catch (error) {
    return null;
  }
}
export async function getCompanyName() {
  try {
    const cookiesStore = await cookies();
    const supabase = await supabaseServer();
    const company_id = cookiesStore.get('actualComp')?.value;
    if (!company_id) return null;
    const { data, error } = await supabase.from('company').select(`company_name`).eq('id', company_id);

    if (error) {
      logger.error('Error fetching company data', { data: { error } });
      return null;
    }
    return data[0];
  } catch (error) {
    return null;
  }
}

export async function AddCompany(formData: FormData, url: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: profile, error } = await supabase
    .from('profile')
    .select('*')
    .eq('email', user?.email || '');

  const formattedData = {
    city: parseInt(formData.get('city') as string),
    province_id: parseInt(formData.get('province_id') as string),
    owner_id: profile?.[0]?.id,
    company_name: formData.get('company_name') as string,
    company_cuit: formData.get('company_cuit') as string,
    website: formData.get('website') as string,
    contact_email: formData.get('contact_email') as string,
    contact_phone: formData.get('contact_phone') as string,
    address: formData.get('address') as string,
    country: formData.get('country') as string,
    industry: formData.get('industry') as string,
    description: formData.get('description') as string,
    by_defect: true,
    company_logo: url ?? '',
  };

  const { data, error: companyError } = await supabase.from('company').insert([formattedData]).select();

  // Nota: El rol OWNER se asigna automáticamente mediante el trigger
  // assign_owner_role_on_company_creation() en la base de datos

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard');
  return { error: companyError, data };
  //redirijir al dashboard
}

export async function EditCompany(formData: FormData, url: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: profile, error } = await supabase
    .from('profile')
    .select('*')
    .eq('email', user?.email || '');

  const formattedData = {
    city: parseInt(formData.get('city') as string),
    province_id: parseInt(formData.get('province_id') as string),
    owner_id: profile?.[0]?.id,
    company_name: formData.get('company_name') as string,
    company_cuit: formData.get('company_cuit') as string,
    website: formData.get('website') as string,
    contact_email: formData.get('contact_email') as string,
    contact_phone: formData.get('contact_phone') as string,
    address: formData.get('address') as string,
    country: formData.get('country') as string,
    industry: formData.get('industry') as string,
    description: formData.get('description') as string,
    by_defect: true,
    company_logo: url ?? '',
  };
  let { data: companyId } = await supabase.from('company').select('id').eq('company_cuit', formattedData.company_cuit);

  const { data, error: companyError } = await supabase
    .from('company')
    .update(formattedData)
    //.select()
    .eq('id', companyId?.[0].id || '')
    .select('*');

  revalidatePath('/dashboard', 'layout');

  // revalidatePath('/dashboard')

  return { error: companyError, data };
  //return data
  //redirijir al dashboard
}

// Cost Center Actions

export async function fetchAllCostCenters() {
  const cookiesStore = await cookies();
  // await new Promise((resolve) => setTimeout(resolve, 5000));

  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase
    .from('cost_center')
    .select('*')
    .order('name', { ascending: true })
    .returns<CostCenter[]>();

  if (error) {
    logger.error('Error fetching company data', { data: { error } });
    return [];
  }
  return data;
}

export const createCostCenter = async (costCenter: { name: string; is_active: boolean }) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('cost_center')
    .insert({ name: costCenter.name, is_active: costCenter.is_active })
    .returns<CostCenter[]>();

  if (error) {
    logger.error('Error creating cost center', { data: { error } });
    throw new Error('Error creating cost center');
  }
  return data;
};

export const updateCostCenter = async (costCenter: { id: string; name: string; is_active: boolean }) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('cost_center')
    .update({ name: costCenter.name, is_active: costCenter.is_active })
    .eq('id', costCenter.id)
    .returns<CostCenter[]>();

  if (error) {
    logger.error('Error updating cost center', { data: { error } });
    throw new Error('Error updating cost center');
  }
  return data;
};

// Sector Actions

export async function fetchAllSectors() {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) return [];

  const { data, error } = await supabase.from('hierarchy').select('*').order('name', { ascending: true }).returns<[]>();

  if (error) {
    logger.error('Error fetching sectors', { data: { error } });
    return [];
  }
  return data;
}

export const createSector = async (sector: { name: string; is_active: boolean }) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('hierarchy')
    .insert({ name: sector.name, is_active: sector.is_active })
    .returns<[]>();

  if (error) {
    logger.error('Error creating sector', { data: { error } });
    throw new Error('Error creating sector');
  }
  return data;
};

export const updateSector = async (sector: { id: string; name: string; is_active: boolean }) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  if (!company_id) throw new Error('No company ID found');

  const { data, error } = await supabase
    .from('hierarchy')
    .update({ name: sector.name, is_active: sector.is_active })
    .eq('id', sector.id)
    .returns<[]>();

  if (error) {
    logger.error('Error updating sector', { data: { error } });
    throw new Error('Error updating sector');
  }
  return data;
};

export const getRoles = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const { data: roles, error } = await supabase.from('roles').select('*').eq('intern', false).neq('name', 'Invitado');
  if (error) {
    logger.error('Error updating sector', { data: { error } });
    throw new Error('Error updating sector');
  }
  return roles;
};

export const fetchCustomers = async () => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .eq('company_id', company_id!);
  if (error) {
    logger.error('Error fetching customers', { data: { error } });
  }
  return data;
};

export const getProfile = async (email: string) => {
  const cookiesStore = await cookies();
  const supabase = await supabaseServer();
  const company_id = cookiesStore.get('actualComp')?.value;
  const { data: profile, error } = await supabase.from('profile').select('*').eq('email', email);
  if (error) {
    logger.error('Error fetching profile', { data: { error } });
  }
  return profile;
};
