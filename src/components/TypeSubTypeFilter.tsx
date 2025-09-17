'use client';

import { useEffect, useState } from 'react';
import { SubTypeMultiSelect } from './SubTypeMultiSelect';
import { TypeMultiSelect } from './TypeMultiSelect';

interface TypeSubTypeFilterProps {
  onFiltersChange: (filters: { typeIds: string[]; subTypeIds: string[] }) => void;
  className?: string;
}

export function TypeSubTypeFilter({ onFiltersChange, className = '' }: TypeSubTypeFilterProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);

  // Reset subtypes when types change
  useEffect(() => {
    if (selectedTypes.length !== 1) {
      setSelectedSubTypes([]);
    }
  }, [selectedTypes]);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange({
      typeIds: selectedTypes,
      subTypeIds: selectedSubTypes,
    });
  }, [selectedTypes, selectedSubTypes]);

  const handleTypeChange = (values: string[]) => {
    setSelectedTypes(values);
  };

  const handleSubTypeChange = (values: string[]) => {
    setSelectedSubTypes(values);
  };

  const handleClearFilters = () => {
    setSelectedTypes([]);
    setSelectedSubTypes([]);
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedSubTypes.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-4 items-start ">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipos de Vehículos</label>
          <TypeMultiSelect selectedValues={selectedTypes} onChange={handleTypeChange} />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Subtipos de Vehículos</label>
          <SubTypeMultiSelect
            selectedValues={selectedSubTypes}
            onChange={handleSubTypeChange}
            selectedTypes={selectedTypes}
          />
        </div>

        {/* {hasActiveFilters && (
          <div className="flex items-end h-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-7 sm:mt-0"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
        )} */}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedTypes.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Tipos:</span> {selectedTypes.length} seleccionado(s)
            </div>
          )}
          {selectedSubTypes.length > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Subtipos:</span> {selectedSubTypes.length} seleccionado(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
