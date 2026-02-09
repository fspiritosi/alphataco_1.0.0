import { supabaseServer } from '@/lib/supabase/server';
import CardInfo from '@/shared/components/cards/CardInfo';

export type Status = 'pendiente' | 'reprogramado' | 'cancelado' | 'rechazado' | 'confirmado' | 'vencido';

interface StatusCardServerProps {
  status: Status | null;
  label: string;
  color?: string;
}

/**
 * Server Component que carga el count de prepartes por estado
 * Cada card hace su propia query COUNT independiente
 * Hace fetch directo con supabaseServer() (no server actions)
 */
export async function StatusCardServer({ status, label, color }: StatusCardServerProps) {
  const supabase = await supabaseServer();

  // Hacer COUNT query directamente en el componente servidor
  let count = 0;

  if (status === null) {
    // Count total
    const { count: totalCount } = await supabase.from('preparte').select('*', { count: 'exact', head: true });
    count = totalCount || 0;
  } else {
    // Count por estado
    const { count: statusCount } = await supabase
      .from('preparte')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    count = statusCount || 0;
  }

  return <CardInfo title={label} value={count} valueClassname={color} />;
}
