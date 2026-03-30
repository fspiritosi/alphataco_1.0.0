import { MaintenanceHeader } from '@/features/Mantenimiento/shared/components/maintenance-header';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TireServiceClient from './tire-service-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TireServicePage({ params }: Props) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/maintenance');
  }

  // Obtain company_id and verify that vehicle has an effective tire_template_id
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id, tire_template_id, sub_type:subType(tire_template_id)')
    .eq('id', id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  const vehicleTireTemplateId = equipmentData.tire_template_id as string | null;
  const subTypeTireTemplateId = (equipmentData.sub_type as unknown as { tire_template_id: string | null } | null)
    ?.tire_template_id;
  const effectiveTemplateId = vehicleTireTemplateId ?? subTypeTireTemplateId;

  // If the vehicle has no tire template (neither override nor sub-type), redirect back to the equipment dashboard
  if (!effectiveTemplateId) {
    redirect(`/maintenance/equipment/${id}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MaintenanceHeader title="Operación de Gomería" showBack backHref={`/maintenance/equipment/${id}`} />
      <main className="flex-1 flex flex-col p-4 pb-24">
        <TireServiceClient vehicleId={id} companyId={equipmentData.company_id} />
      </main>
    </div>
  );
}
