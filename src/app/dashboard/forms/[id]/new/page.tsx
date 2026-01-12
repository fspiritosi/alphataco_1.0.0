import {
  fetchChecklistTemplateById,
  fetchCustomFormById,
  fetchFilteredEquipmentForChecklist,
  getCurrentProfile,
} from '@/app/server/GET/actions';
import { NormalizedChecklistForm } from '@/components/CheckList/NormalizedChecklistForm';
import { mapEquipmentToChecklistFormat } from '@/lib/utils';

async function page({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15+, params es una Promise, necesitamos hacer await
  const resolvedParams = await params;

  const currentUserProfile = await getCurrentProfile();
  const currentUser = currentUserProfile && currentUserProfile.length > 0 ? currentUserProfile[0] : null;

  // Intentar obtener el checklist desde la nueva estructura normalizada
  const checklistTemplate = await fetchChecklistTemplateById(resolvedParams.id);

  // Si no existe en la nueva estructura, intentar con la antigua
  const formInfo = checklistTemplate ? null : await fetchCustomFormById(resolvedParams.id);

  // Obtener equipos filtrados optimizados (solo si es checklist normalizado)
  let equipments: Awaited<ReturnType<typeof mapEquipmentToChecklistFormat>>[] = [];

  if (checklistTemplate) {
    // Usar función optimizada que filtra directamente en la base de datos
    const filteredEquipments = await fetchFilteredEquipmentForChecklist(resolvedParams.id);
    equipments = filteredEquipments.map(mapEquipmentToChecklistFormat);
  }

  // Si es un checklist de la nueva estructura
  if (checklistTemplate) {
    return (
      <div className="px-7 py-4">
        <NormalizedChecklistForm
          shouldDisabledInputs={false}
          template={checklistTemplate}
          equipments={equipments}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // Si es un formulario de la estructura antigua
  if (formInfo && formInfo.length > 0) {
    return (
      <div className="px-7">
        <div className="p-4 border rounded-lg">
          <p className="text-muted-foreground">
            Formulario de estructura antigua detectado. La nueva implementación de checklists está en desarrollo.
          </p>
          <p className="text-sm text-gray-500 mt-2">Formulario: {formInfo[0].name}</p>
        </div>
      </div>
    );
  }

  // Si no se encuentra ningún formulario
  return (
    <div className="px-7">
      <div className="p-4 border rounded-lg">
        <p className="text-red-600">No se encontró el formulario con ID: {resolvedParams.id}</p>
      </div>
    </div>
  );
}

export default page;
