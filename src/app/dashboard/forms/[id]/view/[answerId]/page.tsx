import { fetchActiveCustomersForChecklist, fetchActiveEmployeesForChecklist } from '@/features/Checklists';
import { NormalizedChecklistForm } from '@/features/Checklists/components/NormalizedChecklistForm';
import { fetchChecklistAnswerById } from '@/features/Checklists/actions/checklist-queries';
import { getCurrentProfile } from '@/features/Formularios/actions/form-actions';
import { ChecklistPDFDownloadButton } from '@/features/Checklists/components/ChecklistPDFDownloadButton';
import { fetchAllEquipment } from '@/shared/actions/equipment.actions';
import BackButton from '@/shared/components/common/BackButton';
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
  const [allEquipment, customers, employees, currentUserProfile] = await Promise.all([
    fetchAllEquipment(),
    fetchActiveCustomersForChecklist(),
    fetchActiveEmployeesForChecklist(),
    getCurrentProfile(),
  ]);

  const equipments = allEquipment
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

  const currentUser = currentUserProfile && currentUserProfile.length > 0 ? currentUserProfile[0] : null;

  const answerData = normalizedAnswer.answer_data as any;
  const defaultAnswers = {
    equipment_id: normalizedAnswer.equipment_id,
    customer_id: answerData?.customer_id || '',
    chofer: answerData?.chofer || '',
    fecha: answerData?.fecha || '',
    hora: answerData?.hora || '',
    kilometraje: answerData?.kilometraje || '',
    horometro: answerData?.horometro || '',
    observaciones: normalizedAnswer.observations || '',
    // Observaciones por item (columna OBSERVACIONES del formulario en papel)
    item_observations: answerData?.item_observations || {},
    ...answerData?.answers, // Respuestas por sección
  };

  // Obtener el ID del enganche si existe (puede venir de hitch_equipment_id o de la relación)
  const hitchEquipmentId = (normalizedAnswer as any).hitch_equipment_id || null;

  // Obtener datos del equipo para el PDF
  const selectedEquipment = equipments.find((eq) => eq.value === normalizedAnswer.equipment_id);
  const dominio = selectedEquipment?.domain || selectedEquipment?.serie || '';
  const tipoEquipo = selectedEquipment?.sub_type_name || selectedEquipment?.type_name || '';

  // Obtener nombre del cliente para el PDF
  const selectedCustomer = customers.find((c) => c.id === answerData?.customer_id);
  const clienteName = selectedCustomer?.name || '';

  // Preparar secciones con los campos necesarios para el PDF
  const sections = (template.checklist_template_sections || []).map((section: any) => ({
    id: section.id,
    code: section.code || section.section?.code || `section_${section.id}`,
    name: section.name || section.section?.name || 'Sin nombre',
    order_index: section.order_index,
    checklist_template_items: (section.checklist_template_items || []).map((item: any) => ({
      id: item.id,
      code: item.code || `item_${item.id}`,
      label: item.label,
      order_index: item.order_index,
      is_critical: item.is_critical || false,
      requires_side_validation: item.requires_side_validation || false,
      input_type: item.input_type || null,
    })),
  }));

  return (
    <div className="px-7 py-4">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          {template.description && <p className="text-muted-foreground">{template.description}</p>}
        </div>
        <ChecklistPDFDownloadButton
          templateName={template.name}
          templateCode={template.code}
          sections={sections}
          dominio={dominio}
          tipoEquipo={tipoEquipo}
          cliente={clienteName}
          observaciones={normalizedAnswer.observations || answerData?.observaciones || ''}
          fechaInspeccion={answerData?.fecha || ''}
          chofer={answerData?.chofer || ''}
          answers={answerData?.answers || {}}
          itemObservations={answerData?.item_observations || {}}
        />
      </div>
      <NormalizedChecklistForm
        template={template as any}
        equipments={equipments}
        customers={customers}
        employees={employees}
        currentUser={currentUser}
        defaultAnswers={defaultAnswers}
        defaultHitchEquipmentId={hitchEquipmentId}
        defaultCustomerId={answerData?.customer_id || null}
        readOnly
      />
    </div>
  );
}
