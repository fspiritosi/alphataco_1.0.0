import CardInfo from '@/shared/components/cards/CardInfo';
import { countPrepartes, countPrepartesByStatus } from '../actions/preparte';

export type Status = 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'confirmado' | 'vencido';

interface StatusCardServerProps {
  status: Status | null;
  label: string;
  color?: string;
}

/**
 * Server Component que carga el count de prepartes por estado
 * Cada card hace su propia query COUNT independiente
 */
export async function StatusCardServer({ status, label, color }: StatusCardServerProps) {
  const count = status === null ? await countPrepartes() : await countPrepartesByStatus(status);

  return <CardInfo title={label} value={count} valueClassname={color} />;
}
