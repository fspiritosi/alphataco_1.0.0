'use client';

import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select';
import { getSubTypesByType } from '@/features/Equipos/EquipoID/lib/actions/vehicle-catalog-actions';
import { useEffect, useState } from 'react';

interface VehicleSubType {
  id: string;
  name: string;
  type_id: string;
}

interface SubTypeMultiSelectProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  selectedTypes: string[];
  disabled?: boolean;
}

export function SubTypeMultiSelect({
  selectedValues,
  onChange,
  selectedTypes,
  disabled = false,
}: SubTypeMultiSelectProps) {
  const [vehicleSubTypes, setVehicleSubTypes] = useState<VehicleSubType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadVehicleSubTypes = async () => {
      if (selectedTypes.length === 0) {
        setVehicleSubTypes([]);
        onChange([]);
        return;
      }

      setLoading(true);
      try {
        const allSubTypes: VehicleSubType[] = [];

        for (const typeId of selectedTypes) {
          const subTypes = await getSubTypesByType(typeId);
          console.log('subTypes', subTypes);
          allSubTypes.push(...(subTypes as any));
          console.log('allSubTypes', allSubTypes);
        }

        // Remove duplicates based on id
        const uniqueSubTypes = allSubTypes.filter(
          (subType, index, self) => index === self.findIndex((s) => s.id === subType.id)
        );

        setVehicleSubTypes(uniqueSubTypes);

        // Clear selected values if they're no longer valid
        const validSubTypeIds = uniqueSubTypes.map((st) => st.id);
        const validSelectedValues = selectedValues.filter((value) => validSubTypeIds.includes(value));

        if (validSelectedValues.length !== selectedValues.length) {
          onChange(validSelectedValues);
        }
      } catch (error) {
        console.error('Error loading vehicle subtypes:', error);
        setVehicleSubTypes([]);
      } finally {
        setLoading(false);
      }
    };

    loadVehicleSubTypes();
  }, [selectedTypes]);

  const isDisabled = disabled || selectedTypes.length === 0 || selectedTypes.length > 1;

  if (loading) {
    return <div className="w-full max-w-[400px] h-9 bg-gray-100 animate-pulse rounded-md"></div>;
  }

  return (
    <MultiSelect values={selectedValues} onValuesChange={onChange}>
      <MultiSelectTrigger className="w-full max-w-[400px]" disabled={isDisabled}>
        <MultiSelectValue
          overflowBehavior="wrap-when-open"
          placeholder={
            selectedTypes.length === 0
              ? 'Primero selecciona un tipo'
              : selectedTypes.length > 1
                ? 'Selecciona solo un tipo'
                : 'Seleccionar subtipos...'
          }
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectGroup>
          {vehicleSubTypes.map((subType) => (
            <MultiSelectItem key={subType.id} value={subType.id}>
              {subType.name}
            </MultiSelectItem>
          ))}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  );
}
