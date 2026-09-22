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
 * Cuenta con Prisma acotado a la empresa activa (los pedidos viejos sin company_id
 * se siguen contando, mismo criterio que el resto del módulo).
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
