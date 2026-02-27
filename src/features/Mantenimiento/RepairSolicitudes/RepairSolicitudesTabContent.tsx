import { RepairSolicitudesList } from './RepairSolicitudesList';

interface RepairSolicitudesTabContentProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function RepairSolicitudesTabContent({ searchParams }: RepairSolicitudesTabContentProps) {
  return <RepairSolicitudesList searchParams={searchParams} />;
}
