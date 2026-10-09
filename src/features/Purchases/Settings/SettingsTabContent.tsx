import { getSupplierCategories } from '../actions/categories.server';
import { getExpenseCategories } from '../actions/expense-categories.server';
import { NoPermission } from '../fallback/NoPermission';
import { ExpenseCategoriesSection } from './components/ExpenseCategoriesSection';
import { SupplierCategoriesSection } from './components/SupplierCategoriesSection';

/** Configuracion de Compras: rubros de proveedor y conceptos de gasto. */
export default async function SettingsTabContent({ permissions }: { permissions: Record<string, boolean> }) {
  if (permissions['compras:config-compras:view'] !== true) return <NoPermission />;
  const [categories, expenseCategories] = await Promise.all([getSupplierCategories(), getExpenseCategories()]);
  const canUpdate = permissions['compras:config-compras:update'] === true;
  return (
    <div className="max-w-2xl space-y-6">
      <SupplierCategoriesSection categories={categories} canUpdate={canUpdate} />
      <ExpenseCategoriesSection categories={expenseCategories} canUpdate={canUpdate} />
    </div>
  );
}
