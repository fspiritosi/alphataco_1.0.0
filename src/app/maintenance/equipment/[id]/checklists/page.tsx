import { fetchChecklistTemplatesForEquipment } from '@/features/Checklists/actions/checklist-queries';
import ChecklistsListClient from '@/features/Mantenimiento/Checklists/components/checklists-list-client';
import { supabaseServer } from '@/lib/supabase/server'; // P4: auth
import { redirect } from 'next/navigation';

export default async function ChecklistsListPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const resolvedParams = await params;
  const supabase = await supabaseServer(); // P4: auth

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employee =
    ((user?.app_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined) ??
    ((user?.user_metadata as unknown as Record<string, unknown>)?.employee_id as string | undefined);

  if (!employee && !user?.id) {
    redirect('/maintenance');
  }

  // Flujo QR anónimo: la empresa, el tipo y el subtipo salen del equipo, no de la sesión.
  // El filtro real por subtipo/tipo reemplaza al título hardcodeado que excluía un
  // `custom_form` legacy (los custom_form no son abribles desde este flujo).
  const checklists = await fetchChecklistTemplatesForEquipment(resolvedParams.id);

  if (checklists === null) {
    redirect('/maintenance?error=equipment_not_found');
  }

  return (
    <ChecklistsListClient
      equipmentId={resolvedParams.id}
      checklists={checklists.map((checklist) => ({
        id: checklist.id,
        name: checklist.name,
        form: { description: checklist.description ?? checklist.name, title: checklist.name },
        created_at: checklist.created_at ? checklist.created_at.toISOString() : new Date().toISOString(),
      }))}
    />
  );
}
