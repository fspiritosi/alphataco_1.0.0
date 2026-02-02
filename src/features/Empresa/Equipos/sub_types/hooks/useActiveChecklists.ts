'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { useQuery } from '@tanstack/react-query';

async function fetchActiveChecklists() {
  const supabase = supabaseBrowser();
  // const company_id = Cookies.get('actualComp')?.value;

  const { data, error } = await supabase
    .from('checklist_templates')
    .select('id, name, code, description')
    // .eq('company_id', company_id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active checklists:', error);
    throw error;
  }

  return data || [];
}

export function useActiveChecklists() {
  return useQuery({
    queryKey: ['active-checklists'],
    queryFn: fetchActiveChecklists,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
}
