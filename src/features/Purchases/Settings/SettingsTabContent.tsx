import { getSupplierCategories } from '../actions/categories.server';
import { NoPermission } from '../fallback/NoPermission';
import { SupplierCategoriesSection } from './components/SupplierCategoriesSection';

/** Configuracion de Compras: por ahora, los rubros de proveedor. */
export default async function SettingsTabContent({ permissions }: { permissions: Record<string, boolean> }) {
  if (permissions['compras:config-compras:view'] !== true) return <NoPermission />;
  const categories = await getSupplierCategories();
  return (
    <div className="max-w-2xl">
      <SupplierCategoriesSection
        categories={categories}
        canUpdate={permissions['compras:config-compras:update'] === true}
      />
    </div>
  );
}
