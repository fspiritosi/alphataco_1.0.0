'use client';

import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';
import { getVehicleTypes } from '@/features/Equipos/EquipoID/lib/actions/vehicle-catalog-actions';
import { Logger } from '@/lib/logger';
import { useQuery } from '@tanstack/react-query';

const logger = new Logger('TypeMultiSelect');

interface TypeMultiSelectProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function TypeMultiSelect({ selectedValues, onChange, disabled = false }: TypeMultiSelectProps) {
  const { data: vehicleTypes = [], isLoading: loading } = useQuery({
    queryKey: ['vehicle-types', 'vehicle'],
    queryFn: () => getVehicleTypes('vehicle'),
    staleTime: 5 * 60 * 1000,
  });

  if (loading) {
    return <div className="w-full max-w-[400px] h-9 bg-gray-100 animate-pulse rounded-md"></div>;
  }

  return (
    <MultiSelect values={selectedValues} onValuesChange={onChange}>
      <MultiSelectTrigger className={`w-full max-w-[400px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <MultiSelectValue placeholder="Seleccionar tipos de vehículos..." />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectGroup>
          {vehicleTypes?.map((type) => (
            <MultiSelectItem key={type.id} value={type.id}>
              {type.name}
            </MultiSelectItem>
          ))}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  );
}
