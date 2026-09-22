'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface VerActivosButtonProps<T> {
  data: T[];
  filterKey: keyof T;
  onFilteredChange: (filtered: T[]) => void;
}

/**
 * Alterna entre los registros activos y los inactivos de una lista en memoria.
 * El filtrado se avisa al padre en el propio click (nada de `useEffect` reaccionando
 * a un estado que este mismo componente cambia).
 */
export function VerActivosButton<T extends object>({
  data,
  filterKey,
  onFilteredChange,
}: VerActivosButtonProps<T>) {
  const [showActive, setShowActive] = useState(true);

  const toggle = () => {
    const next = !showActive;
    setShowActive(next);
    onFilteredChange(data?.filter((item) => Boolean(item[filterKey]) === next) ?? []);
  };

  return (
    <Button variant="gh_orange" onClick={toggle}>
      {showActive ? 'Ver inactivos' : 'Ver activos'}
    </Button>
  );
}
