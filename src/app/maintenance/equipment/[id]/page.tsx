import { getSessionRoleForEquipment } from '@/features/Mantenimiento/EquipmentDashboard/actions/equipment-access.server';
import EquipmentDashboardClient from '@/features/Mantenimiento/EquipmentDashboard/components/equipment-dashboard-client';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function EquipmentDashboardPage({
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

  // Obtener datos del equipo
  const { data: equipmentData, error: equipmentError } = await supabase
    .from('vehicles')
    .select(
      'id, domain, serie, intern_number, picture, brand:brand_vehicles(name), model:model_vehicles(name), year, kilometer, engine_hours, condition, company_id, type:type(id, name), sub_type:subType(id, name, tire_template_id), tire_template_id, is_active'
    )
    .eq('id', resolvedParams.id)
    .single();

  if (equipmentError || !equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  // Obtener role si es usuario. La empresa la deriva la action del equipo de la ruta:
  // el flujo QR corre sin empresa activa en la sesión y el caller no la manda.
  const role = user?.id ? await getSessionRoleForEquipment(resolvedParams.id) : null;

  const isGuest = role === 'Invitado';

  // Obtener nombre del empleado/usuario
  const empleado_name =
    ((user?.user_metadata as unknown as Record<string, unknown>)?.fullname as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employeeName as string | undefined);

  const isAnonymous = user?.is_anonymous ?? true;

  return (
    <EquipmentDashboardClient
      equipment={{
        id: equipmentData.id,
        domain: equipmentData.domain,
        serie: equipmentData.serie,
        intern_number: equipmentData.intern_number,
        picture: equipmentData.picture,
        brand: (equipmentData.brand as { name: string } | null)?.name || '',
        model: (equipmentData.model as { name: string } | null)?.name || '',
        year: equipmentData.year || '',
        kilometer: equipmentData.kilometer || '0',
        engine_hours: equipmentData.engine_hours ?? null,
        condition: equipmentData.condition || 'operativo',
        type: (equipmentData.type as { name: string } | null)?.name || '',
        sub_type: (equipmentData.sub_type as unknown as { name: string } | null)?.name || '',
        is_active: equipmentData.is_active ?? true,
        tire_template_id:
          (equipmentData.tire_template_id as string | null) ??
          (equipmentData.sub_type as unknown as { tire_template_id: string | null } | null)?.tire_template_id ??
          null,
      }}
      equipmentId={resolvedParams.id}
      isGuest={isGuest}
      isAnonymous={isAnonymous}
      empleadoName={empleado_name}
    />
  );
}
