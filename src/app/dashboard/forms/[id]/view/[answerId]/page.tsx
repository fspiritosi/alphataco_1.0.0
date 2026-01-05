import { fetchAllEquipment, fetchChecklistAnswerById, getCurrentProfile } from '@/app/server/GET/actions';
import BackButton from '@/components/BackButton';
import { NormalizedChecklistForm } from '@/components/CheckList/NormalizedChecklistForm';
import { notFound } from 'next/navigation';

export default async function ChecklistAnswerViewPage({
  params,
}: {
  params: Promise<{ id: string; answerId: string }>;
}) {
  const resolvedParams = await params;
  const templateId = resolvedParams.id;
  const answerId = resolvedParams.answerId;

  const normalizedAnswer = await fetchChecklistAnswerById(answerId);

  if (!normalizedAnswer) {
    notFound();
  }

  // Seguridad/consistencia: la URL incluye el template, validamos que la respuesta pertenezca.
  if (normalizedAnswer.template_id && normalizedAnswer.template_id !== templateId) {
    notFound();
  }

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

  // Para poder renderizar el Select de equipo (aunque sea readOnly), necesitamos opciones.
  const equipments = (await fetchAllEquipment())
    .filter((equipment) => equipment.model && equipment.brand)
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

  const answerData = normalizedAnswer.answer_data as any;
  const defaultAnswers = {
    equipment_id: normalizedAnswer.equipment_id,
    chofer: answerData?.chofer || '',
    fecha: answerData?.fecha || '',
    hora: answerData?.hora || '',
    kilometraje: answerData?.kilometraje || '',
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
        readOnly
      />
    </div>
  );
}
