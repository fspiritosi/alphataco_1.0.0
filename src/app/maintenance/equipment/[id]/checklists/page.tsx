import { ChecklistsListServer } from '@/features/Mantenimiento/Checklists/ChecklistsListServer';

export default async function ChecklistsListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ChecklistsListServer equipmentId={id} />;
}
