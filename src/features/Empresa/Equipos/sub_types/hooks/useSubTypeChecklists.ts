'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { useQuery } from '@tanstack/react-query';

async function fetchSubTypeChecklists(subTypeId: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from('checklist_template_sub_types')
    .select('template_id')
    .eq('sub_type_id', subTypeId);

  if (error) {
    console.error('Error fetching checklists for subtype:', error);
    throw error;
  }

  return (data || []).map((item) => item.template_id);
}

export function useSubTypeChecklists(subTypeId: string | null) {
  return useQuery({
    queryKey: ['subtype-checklists', subTypeId],
    queryFn: () => fetchSubTypeChecklists(subTypeId!),
    enabled: !!subTypeId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
  });
}
