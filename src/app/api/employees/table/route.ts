import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const supabase = supabaseServer();
  const searchParams = request.nextUrl.searchParams;
  const company_id = searchParams.get('actual');
  try {
    let { data: employees, error } = await supabase
      .from('employees')
      .select(
        `*,guild(id, name),covenant(id, name),category(id, name), city (
        name
      ),
      province(
        name
      ),
      workflow_diagram(
        name
      ),
      hierarchical_position(
        name
      ),
      birthplace(
        name
      ),
      contractor_employee(
        customers(
          *
        )
      )`
      )
      // .select('*')
      // Filters
      .eq('company_id', company_id || '');
    if (error) {
      throw new Error(JSON.stringify(error));
    }
    return Response.json({ employees });
  } catch (error) {
    return Response.json({ error });
  }
}
