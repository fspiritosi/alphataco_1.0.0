import {
  fetchAllEquipment,
  fetchChecklistTemplateById,
  fetchCustomFormById,
  getCurrentProfile,
} from '@/app/server/GET/actions';
import { NormalizedChecklistForm } from '@/components/CheckList/NormalizedChecklistForm';

async function page({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15+, params es una Promise, necesitamos hacer await
  const resolvedParams = await params;
  const equipments = (await fetchAllEquipment())
    .filter((equipment) => equipment.model && equipment.brand) // Filtrar equipos sin model o brand
    .map((equipment) => ({
      label: equipment.domain
        ? `${equipment.domain} - ${equipment.intern_number}`
        : `${equipment.serie} - ${equipment.intern_number}`,
      value: equipment.id,
      domain: equipment.domain,
      serie: equipment.serie,
      kilometer: equipment.kilometer ?? '0',
      model: equipment.model?.name || 'N/A',
      brand: equipment.brand?.name || 'N/A',
      intern_number: equipment.intern_number || '',
      sub_type_id: equipment.subType?.id || null,
    }));

  const currentUserProfile = await getCurrentProfile();
  const currentUser = currentUserProfile && currentUserProfile.length > 0 ? currentUserProfile[0] : null;

  // Intentar obtener el checklist desde la nueva estructura normalizada
  const checklistTemplate = await fetchChecklistTemplateById(resolvedParams.id);

  // Si no existe en la nueva estructura, intentar con la antigua
  const formInfo = checklistTemplate ? null : await fetchCustomFormById(resolvedParams.id);

  // Si es un checklist de la nueva estructura
  if (checklistTemplate) {
    return (
      <div className="px-7 py-4">
        <NormalizedChecklistForm template={checklistTemplate} equipments={equipments} currentUser={currentUser} />
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
