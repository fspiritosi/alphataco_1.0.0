import { ChecklistFormServer } from '@/features/Mantenimiento/Checklists/ChecklistFormServer';

export default async function ChecklistFormPage({
  params,
}: {
  params: Promise<{ id: string; checklistId: string }>;
}) {
  const { id, checklistId } = await params;

  return <ChecklistFormServer equipmentId={id} checklistId={checklistId} />;
}
