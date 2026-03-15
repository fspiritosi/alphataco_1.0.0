import type React from 'react';

/**
 * Crea opciones de filtro para columnas con valores anidados/complejos (ej: afectaciones M:M).
 * Extrae valores usando el accessor, deduplica, y mapea a { label, value, icon }.
 */
export const createNestedFilterOptions = <T>(
  data: T[] | undefined,
  accessor: (item: T) => unknown[],
  icon: React.ComponentType<{ className?: string }>
) => {
  const uniqueValues = Array.from(
    new Set(
      data
        ?.map((item) => accessor(item))
        .flat()
        .filter(Boolean)
    )
  );

  return uniqueValues.map((value) => ({
    label: (value as string) || '',
    value: (value as string) || '',
    icon,
  }));
};
