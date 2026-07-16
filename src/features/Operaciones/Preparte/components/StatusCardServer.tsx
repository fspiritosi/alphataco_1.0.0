import { getServerCompanyId } from '@/shared/actions/company.actions';
import CardInfo from '@/shared/components/cards/CardInfo';
import { prisma } from '@/shared/lib/prisma';

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
  const companyId = await getServerCompanyId();
  const count = await prisma.preparte.count({
    where: {
      OR: [{ company_id: companyId }, { company_id: null }],
      ...(status ? { status } : {}),
    },
  });

  return <CardInfo title={label} value={count} valueClassname={color} />;
}
