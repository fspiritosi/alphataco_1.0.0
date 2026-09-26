import { cookies } from 'next/headers';
import { fetchAllWorkshops } from '../../actions/workshops.server';
import { TalleresTabClient } from './talleres/TalleresTabClient';

/**
 * Sección Talleres, montable por sí sola.
 *
 * Antes venía empaquetada con Sectores dentro de `MantenimientoTab`, que tenía su propio
 * `TabsManagerClient` con `paramName="mantenimiento-subtab"`. Al unificar las 4 subtabs de
 * configuración de mantenimiento en una sola fila, ese manager intermedio dejó de tener
 * sentido: habría dado dos filas de pestañas anidadas.
 *
 * La promesa de `fetchAllWorkshops()` se pasa SIN await a propósito: el cliente la consume
 * con `use()`, así el componente no bloquea el render de la sección.
 */
async function TalleresTab() {
  const cookiesStore = await cookies();
  const workshops = fetchAllWorkshops();

  const savedVisibility = cookiesStore.get('talleres-table')?.value;
  const savedFilter = cookiesStore.get('talleres-table-filters')?.value;

  return (
    <TalleresTabClient
      workshops={workshops}
      savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
      savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
    />
  );
}

export default TalleresTab;
