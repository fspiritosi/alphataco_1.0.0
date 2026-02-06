import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const dailyReportStatus: Record<string, BadgeVariant> = {
  abierto: 'default',
  cerrado_completo: 'success',
  cerrado_incompleto: 'destructive',
  cerrado: 'destructive',
};
