import type { BadgeProps } from '@/components/ui/badge';
import type { clothing_delivery_type } from '@/generated/prisma/enums';

export const clothingDeliveryTypeLabels: Record<clothing_delivery_type, string> = {
  PLANNED_CCT: 'Planificada CCT',
  PLANNED_EPP: 'Planificada EPP',
  REPLACEMENT: 'Reposición',
};

export const clothingDeliveryTypeBadges: Record<clothing_delivery_type, NonNullable<BadgeProps['variant']>> = {
  PLANNED_CCT: 'default',
  PLANNED_EPP: 'secondary',
  REPLACEMENT: 'outline',
};
