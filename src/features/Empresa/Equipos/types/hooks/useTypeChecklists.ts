'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';
import { useQuery } from '@tanstack/react-query';

async function fetchTypeChecklists(typeId: string) {
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.from('checklist_template_types').select('template_id').eq('type_id', typeId);

  if (error) {
    console.error('Error fetching checklists for type:', error);
    throw error;
  }

  return (data || []).map((item) => item.template_id).filter((id): id is string => id !== null);
}

export function useTypeChecklists(typeId: string | null) {
  return useQuery({
    queryKey: ['type-checklists', typeId],
    queryFn: () => fetchTypeChecklists(typeId!),
    enabled: !!typeId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
  });
}
