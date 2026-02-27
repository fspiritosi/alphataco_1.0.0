import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RequestsListClient from './requests-list-client';

export default async function RequestsListPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employee =
    ((user?.app_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined);

  if (!employee && !user?.id) {
    redirect('/maintenance');
  }

  // Obtener todas las solicitudes del equipo, ordenadas por fecha más reciente primero
  const { data: allRequests, error } = await supabase
    .from('repair_solicitudes')
    .select(
      'id, created_at, state, user_description, mechanic_description, user_images, mechanic_images, kilometer, reparation_type:types_of_repairs(id, name, criticity, type_of_maintenance), equipment_id:vehicles(id, domain, serie, intern_number, year, kilometer, condition, brand:brand_vehicles(name), model:model_vehicles(name))'
    )
    .eq('equipment_id', resolvedParams.id)
    .order('created_at', { ascending: false });

  return <RequestsListClient equipmentId={resolvedParams.id} allRequests={(allRequests || []) as any} />;
}
