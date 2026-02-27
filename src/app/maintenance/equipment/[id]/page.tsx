import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EquipmentDashboardClient from './equipment-dashboard-client';

export default async function EquipmentDashboardPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer();
  const URL = process.env.NEXT_PUBLIC_BASE_URL;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employee =
    ((user?.app_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined);

  if (!employee && !user?.id) {
    redirect('/maintenance');
  }

  // Obtener datos del equipo
  const { data: equipmentData, error: equipmentError } = await supabase
    .from('vehicles')
    .select(
      'id, domain, serie, intern_number, picture, brand:brand_vehicles(name), model:model_vehicles(name), year, kilometer, engine_hours, condition, company_id, type:type(id, name), sub_type:subType(id, name), is_active'
    )
    .eq('id', resolvedParams.id)
    .single();

  if (equipmentError || !equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // Obtener role si es usuario
  let role: string | undefined;
  if (user?.id) {
    const { shared_user } = await fetch(
      `${URL}/api/shared_company_role?company_id=${equipmentData.company_id}&profile_id=${user.id}`
    )
      .then((e) => e.json())
      .catch(() => ({ shared_user: null }));
    role = shared_user?.[0]?.role;
  }

  const isGuest = role === 'Invitado';

  // Obtener nombre del empleado/usuario
  const empleado_name =
    ((user?.user_metadata as unknown as Record<string, unknown>)?.fullname as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employeeName as string | undefined);

  return (
    <EquipmentDashboardClient
      equipment={{
        id: equipmentData.id,
        domain: equipmentData.domain,
        serie: equipmentData.serie,
        intern_number: equipmentData.intern_number,
        picture: equipmentData.picture,
        brand: (equipmentData.brand as any)?.name || '',
        model: (equipmentData.model as any)?.name || '',
        year: equipmentData.year || '',
        kilometer: equipmentData.kilometer || '0',
        engine_hours: equipmentData.engine_hours ?? null,
        condition: equipmentData.condition || 'operativo',
        type: (equipmentData.type as any)?.name || '',
        sub_type: (equipmentData.sub_type as any)?.name || '',
        is_active: equipmentData.is_active ?? true,
      }}
      equipmentId={resolvedParams.id}
      isGuest={isGuest}
      empleadoName={empleado_name}
    />
  );
}
