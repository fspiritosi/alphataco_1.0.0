import { OrdenesTrabajoTableClient } from './components/OrdenesTrabajoTableClient';

/**
 * Server Component para la tab de Órdenes de Trabajo
 * Renderiza el cliente que maneja la lógica de las subtabs
 */
export async function OrdenesTrabajoTabContent() {
  return <OrdenesTrabajoTableClient />;
}
