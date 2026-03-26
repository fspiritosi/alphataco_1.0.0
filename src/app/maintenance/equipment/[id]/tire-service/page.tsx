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

  // Obtain company_id and verify that sub_type has a tire_template_id
  const { data: equipmentData } = await supabase
    .from('vehicles')
    .select('company_id, sub_type:subType(tire_template_id)')
    .eq('id', id)
    .single();

  if (!equipmentData?.company_id) {
    redirect('/maintenance?error=equipment_not_found');
  }

  const subTypeTireTemplateId = (equipmentData.sub_type as unknown as { tire_template_id: string | null } | null)
    ?.tire_template_id;

  // If the vehicle's sub_type has no tire template, redirect back to the equipment dashboard
  if (!subTypeTireTemplateId) {
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
