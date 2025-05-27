'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function fetchAllWorkDiagrams() {
  try {
    const cookiesStore = cookies();
    const supabase = supabaseServer();
    const company_id = cookiesStore.get('actualComp')?.value;
    if (!company_id) return [];

    // Usamos la sintaxis según el ejemplo de Stack Overflow
    const { data, error } = await supabase
      .from('work_diagram')
      .select(
        '*, active_novelty:diagram_type!work-diagram_active_novelty_fkey(*), inactive_novelty:diagram_type!work-diagram_inactive_novelty_fkey(*)'
      )
      //! .eq('active_novelty.company_id', company_id)
      //! .eq('inactive_novelty.company_id', company_id)
      .returns<WorkDiagramWithRelations[]>();

    console.log(data);

    // Nota: Estamos seleccionando directamente las relaciones por sus nombres de columna
    // Esto funciona si la columna active_novelty y inactive_novelty ya están definidas como claves foráneas
    // que apuntan a la tabla diagram_type
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
