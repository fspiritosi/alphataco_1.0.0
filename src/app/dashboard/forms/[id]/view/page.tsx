import { NormalizedChecklistForm } from '@/features/Formularios/Checklists/NormalizedChecklistForm';
import {
  fetchAnswerById,
  fetchChecklistAnswerById,
  getCurrentProfile,
} from '@/features/Formularios/actions/checklist-actions';
import { fetchAllEquipment } from '@/shared/actions/equipment.actions';
import BackButton from '@/shared/components/common/BackButton';

async function page({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15+, params es una Promise, necesitamos hacer await
  const resolvedParams = await params;

  // Intentar obtener respuesta de checklist normalizado
  const normalizedAnswer = await fetchChecklistAnswerById(resolvedParams.id);

  if (normalizedAnswer) {
    // Es una respuesta de checklist normalizado
    const template = normalizedAnswer.template as any;
    if (!template) {
      return (
        <div className="px-7">
          <div className="flex items-center gap-4 mb-6">
            <BackButton />
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-red-600">No se encontró el template del checklist</p>
          </div>
        </div>
      );
    }

    const equipments = (await fetchAllEquipment())
      .filter((equipment) => equipment.model && equipment.brand)
      .map((equipment) => ({
        label: equipment.domain
          ? `${equipment.domain} - ${equipment.intern_number || '(Sin información)'}`
          : `${equipment.serie} - ${equipment.intern_number || '(Sin información)'}`,
        value: equipment.id,
        domain: equipment.domain,
        serie: equipment.serie,
        kilometer: equipment.kilometer ?? '0',
        engine_hours: equipment.engine_hours ?? '0',
        model: equipment.model?.name || 'N/A',
        brand: equipment.brand?.name || 'N/A',
        intern_number: equipment.intern_number || '',
        sub_type_id: equipment.subType?.id || null,
        type_name: equipment.type?.name || 'N/A',
        sub_type_name: equipment.subType?.name || 'N/A',
      }));

    const currentUserProfile = await getCurrentProfile();
    const currentUser = currentUserProfile && currentUserProfile.length > 0 ? currentUserProfile[0] : null;

    // Preparar respuestas por defecto desde answer_data
    const answerData = normalizedAnswer.answer_data as any;
    const defaultAnswers = {
      equipment_id: normalizedAnswer.equipment_id,
      chofer: answerData?.chofer || '',
      fecha: answerData?.fecha || '',
      hora: answerData?.hora || '',
      kilometraje: answerData?.kilometraje || '',
      horometro: answerData?.horometro || '',
      observaciones: normalizedAnswer.observations || '',
      ...answerData?.answers, // Respuestas por sección
    };

    return (
      <div className="px-7 py-4">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            {template.description && <p className="text-muted-foreground">{template.description}</p>}
          </div>
        </div>
        <NormalizedChecklistForm
          template={template as any}
          equipments={equipments}
          currentUser={currentUser}
          defaultAnswers={defaultAnswers}
          readOnly={true}
        />
      </div>
    );
  }

  // Intentar con estructura antigua
  const answer = await fetchAnswerById(resolvedParams.id);
  if (!answer || answer.length === 0) {
    return (
      <div className="px-7">
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-red-600">No se encontró la respuesta con ID: {resolvedParams.id}</p>
        </div>
      </div>
    );
  }

  const equipments = (await fetchAllEquipment()).map((equipment) => ({
    label: equipment.domain
      ? `${equipment.domain} - ${equipment.intern_number}`
      : `${equipment.serie} - ${equipment.intern_number}`,
    value: equipment.id,
    domain: equipment.domain,
    serie: equipment.serie,
    kilometer: equipment.kilometer ?? '0',
    model: equipment.model?.name,
    brand: equipment.brand?.name,
    intern_number: equipment.intern_number || '',
  }));
  // TODO: Implementar visualización para estructura antigua
  return (
    <div className="px-7">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-muted-foreground">Visualización de respuestas de estructura antigua en desarrollo.</p>
      </div>
    </div>
  );
}

export default page;
