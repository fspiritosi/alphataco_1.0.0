'use client';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clothingDeliveryTypeBadges, clothingDeliveryTypeLabels } from '@/features/Clothing/utils/mappers';
import type { clothing_delivery_type } from '@/generated/prisma/enums';

interface StepDeliveryTypeProps {
  value: string | null;
  onChange: (value: string) => void;
}

const deliveryTypeOptions = Object.keys(clothingDeliveryTypeLabels) as clothing_delivery_type[];

export function StepDeliveryType({ value, onChange }: StepDeliveryTypeProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1.5 text-foreground">Tipo de entrega</p>
        <p className="text-sm text-muted-foreground mb-3">
          Seleccione el motivo o tipo de entrega de indumentaria/EPP.
        </p>
      </div>

      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="Seleccione el tipo de entrega..." />
        </SelectTrigger>
        <SelectContent>
          {deliveryTypeOptions.map((type) => (
            <SelectItem key={type} value={type}>
              <div className="flex items-center gap-2">
                <span>{clothingDeliveryTypeLabels[type]}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Preview badge for selected type */}
      {value && (
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo seleccionado:</span>
          <Badge variant={clothingDeliveryTypeBadges[value as clothing_delivery_type]}>
            {clothingDeliveryTypeLabels[value as clothing_delivery_type]}
          </Badge>
        </div>
      )}
    </div>
  );
}
