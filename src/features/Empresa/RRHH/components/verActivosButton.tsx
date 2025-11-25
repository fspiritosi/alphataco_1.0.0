'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface VerActivosButtonProps<T> {
  data: T[];
  filterKey: keyof T;
  onFilteredChange: (filtered: T[]) => void;
}

export function VerActivosButton<T extends Record<string, any>>({
  data,
  filterKey,
  onFilteredChange,
}: VerActivosButtonProps<T>) {
  const [showActive, setShowActive] = useState(true);

  useEffect(() => {
    const filtered = data?.filter((item) => Boolean(item[filterKey]) === showActive);
    onFilteredChange(filtered);
  }, [showActive, data, filterKey]);

  return (
    <Button variant="gh_orange" onClick={() => setShowActive((prev) => !prev)}>
      {showActive ? 'Ver inactivos' : 'Ver activos'}
    </Button>
  );
}
