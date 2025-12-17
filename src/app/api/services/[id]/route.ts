import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const searchParams = request.nextUrl.searchParams;
  const company_id = searchParams.get('actual');
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    let { data: service, error } = await supabase
      .from('service_items')
      .select(`*`)
      .eq('company_id', company_id || '')
      .eq('id', id);

    if (error) {
      throw new Error(JSON.stringify(error));
    }
    return Response.json({ service });
  } catch (error) {}
}
