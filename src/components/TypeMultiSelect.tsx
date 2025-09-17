'use client';

import { fetchTypeVehicles } from '@/app/server/GET/actions';
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';
import { useEffect, useState } from 'react';

interface VehicleType {
  id: string;
  name: string;
}

interface TypeMultiSelectProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function TypeMultiSelect({ selectedValues, onChange, disabled = false }: TypeMultiSelectProps) {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVehicleTypes = async () => {
      setLoading(true);
      try {
        const types = await fetchTypeVehicles();
        setVehicleTypes(types);
      } catch (error) {
        console.error('Error loading vehicle types:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVehicleTypes();
  }, []);

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
