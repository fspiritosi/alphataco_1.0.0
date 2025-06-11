'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// export async function fetchAllWorkDiagrams() {
//   try {
//     const cookiesStore = cookies();
//     const supabase = supabaseServer();
//     const company_id = cookiesStore.get('actualComp')?.value;
//     if (!company_id) return [];

//     const { data, error } = await supabase
//       .from('work_diagram')
//       .select(
//         '*, active_novelty:diagram_type!work-diagram_active_novelty_fkey(*), inactive_novelty:diagram_type!work-diagram_inactive_novelty_fkey(*)'
//       )
//       //! .eq('active_novelty.company_id', company_id)
//       //! .eq('inactive_novelty.company_id', company_id)
//       .returns<WorkDiagramWithRelations[]>();

//     console.log(data);

//     if (error) {
//       console.error('Error fetching work diagrams:', error);
//       return [];
//     }
//     return data || [];
//   } catch (error) {
//     console.error('Error fetching work diagrams:', error);
//     return [];
//   }
// }

export async function fetchAllWorkDiagrams() {
  try {
    const cookiesStore = cookies();
    const supabase = supabaseServer();
    const company_id = cookiesStore.get('actualComp')?.value;
    if (!company_id) return [];

    const { data, error } = await supabase
      .from('work_diagram')
      .select(
        `
        *,
        work_diagram_active_novelties(
          id,
          created_at,
          diagram_type:diagram_type_id(*)
        ),
        inactive_novelty:diagram_type!work-diagram_inactive_novelty_fkey(*)
      `
      )
      // .eq('company_id', company_id)
      .returns<WorkDiagramWithRelations[]>();

    if (error) {
      console.error('Error fetching work diagrams:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching work diagrams:', error);
    return [];
  }
}
