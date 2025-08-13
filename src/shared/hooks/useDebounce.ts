import { useEffect, useState } from 'react';

/**
 * Hook personalizado para implementar debounce
 * @param value - El valor que se quiere debounce
 * @param delay - El tiempo de retraso en milisegundos
 * @returns El valor con debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
