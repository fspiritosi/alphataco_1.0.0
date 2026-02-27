'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { ButtonGroup } from './button-group';

const CURRENCIES = [
  {
    value: 'USD',
    symbol: 'USD',
    label: 'Dólar Estadounidense',
  },
  {
    value: 'ARS',
    symbol: 'ARS',
    label: 'Peso Argentino',
  },
];

interface PriceCurrencyInputProps {
  price?: string;
  currency?: string;
  onPriceChange?: (price: string) => void;
  onCurrencyChange?: (currency: string) => void;
  placeholder?: string;
  disabled?: boolean;
}
// Función para formatear número con separadores de miles y 2 decimales
export const formatNumber = (value: string) => {
  if (!value || value === '0' || value === '') return '';

  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return value;

  // Formatear con separadores de miles y 2 decimales
  return numericValue.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function PriceCurrencyInput({
  price = '',
  currency = 'ARS',
  onPriceChange,
  onCurrencyChange,
  placeholder = '0.00',
  disabled = false,
}: PriceCurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const selectedCurrency = CURRENCIES.find((c) => c.value === currency) || CURRENCIES[0];

  // Función para limpiar el formato y obtener solo números
  const cleanNumber = (value: string) => {
    return value.replace(/[^\d.,]/g, '').replace(',', '.');
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue = cleanNumber(value);
    onPriceChange?.(cleanValue);
  };

  // Determinar qué valor mostrar
  const displayValue = isFocused ? price : formatNumber(price);

  return (
    <ButtonGroup className="w-full">
      <Select value={currency ?? undefined} onValueChange={onCurrencyChange} disabled={disabled}>
        <SelectTrigger className="font-mono w-20">
          <SelectValue placeholder="ARS">{selectedCurrency?.symbol ?? currency}</SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-40">
          {CURRENCIES.map((curr) => (
            <SelectItem key={curr.value} value={curr.value}>
              <span className="font-mono">{curr.symbol}</span>{' '}
              <span className="text-muted-foreground">{curr.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder={placeholder}
        type={isFocused ? 'number' : 'text'}
        step="0.01"
        min="0"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className="flex-1"
      />
    </ButtonGroup>
  );
}
