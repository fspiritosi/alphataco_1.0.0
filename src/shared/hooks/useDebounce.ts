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
    console.log('⏱️ useDebounce - Setting timeout for value:', value, 'delay:', delay);

    const handler = setTimeout(() => {
      console.log('⏰ useDebounce - Timeout executed, updating debouncedValue to:', value);
      setDebouncedValue(value);
    }, delay);

    return () => {
      console.log('🧹 useDebounce - Clearing timeout for value:', value);
      clearTimeout(handler);
    };
  }, [value, delay]);

  console.log('🔄 useDebounce - Current state:', { value, debouncedValue, delay });
  return debouncedValue;
}
