import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const searchParams = request.nextUrl.searchParams;
  const company_id = searchParams.get('actual');
  if (!company_id) {
    return Response.json({ error: 'company_id is required' });
  }
  try {
    let { data: employees, error } = await supabase.from('employees').select('*').eq('company_id', company_id);
    if (error) {
      throw new Error(JSON.stringify(error));
    }
    return Response.json({ employees });
  } catch (error) {
    return Response.json({ error });
  }
}
