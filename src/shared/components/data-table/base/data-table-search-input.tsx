'use client';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/shared/hooks/useDebounce';
import * as React from 'react';

interface DataTableSearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
}

export function DataTableSearchInput({
  placeholder = 'Buscar...',
  value,
  onChange,
  className = 'h-8 w-[150px] lg:w-[250px]',
  disabled = false,
  debounceMs = 500,
}: DataTableSearchInputProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const debouncedValue = useDebounce(inputValue, debounceMs);
  const currentValue = value;

  return (
    <Input
      placeholder={placeholder}
      value={inputValue}
      onChange={(event) => {
        setInputValue(event.target.value);
      }}
      className={className}
      disabled={disabled}
    />
  );
}
