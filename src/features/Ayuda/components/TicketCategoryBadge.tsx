import { Badge } from '@/components/ui/badge';

interface Props {
  label: string;
}

export function TicketCategoryBadge({ label }: Props) {
  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
  );
}
