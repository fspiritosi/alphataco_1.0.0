'use client';

import { Button } from '@/components/ui/button';

interface VerActivosButtonProps {
  /** `true` = se está mostrando lo activo; `false` = lo inactivo. */
  showActive: boolean;
  onToggle: (showActive: boolean) => void;
}

/**
 * Alterna entre los registros activos y los inactivos de una lista.
 *
 * El botón NO guarda la lista filtrada: es un toggle controlado y el padre **deriva** la lista
 * con `filterByActiveFlag` (de `./active-filter`) en cada render. Cuando guardaba el resultado en un `useState` del
 * padre, un alta seguida de `router.refresh()` traía datos nuevos pero la tabla seguía mostrando
 * el array viejo — el alta parecía no haber pasado, con toast de éxito incluido.
 */
export function VerActivosButton({ showActive, onToggle }: VerActivosButtonProps) {
  return (
    <Button variant="gh_orange" onClick={() => onToggle(!showActive)}>
      {showActive ? 'Ver inactivos' : 'Ver activos'}
    </Button>
  );
}
