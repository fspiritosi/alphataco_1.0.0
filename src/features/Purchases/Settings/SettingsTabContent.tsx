import { getSupplierCategories } from '../actions/categories.server';
import { getExpenseCategories } from '../actions/expense-categories.server';
import { getTreasuryAccounts } from '../actions/treasury-accounts.server';
import { getWithholdingRegimes } from '../actions/withholding-regimes.server';
import { NoPermission } from '../fallback/NoPermission';
import { ExpenseCategoriesSection } from './components/ExpenseCategoriesSection';
import { SupplierCategoriesSection } from './components/SupplierCategoriesSection';
import { TreasuryAccountsSection } from './components/TreasuryAccountsSection';
import { WithholdingRegimesSection } from './components/WithholdingRegimesSection';

/** Configuracion de Compras: rubros, conceptos de gasto, cuentas y cajas, y regimenes de retencion. */
export default async function SettingsTabContent({ permissions }: { permissions: Record<string, boolean> }) {
  if (permissions['compras:config-compras:view'] !== true) return <NoPermission />;
  const [categories, expenseCategories, accounts, regimes] = await Promise.all([
    getSupplierCategories(),
    getExpenseCategories(),
    getTreasuryAccounts(),
    getWithholdingRegimes(),
  ]);
  const canUpdate = permissions['compras:config-compras:update'] === true;
  return (
    <div className="max-w-2xl space-y-6">
      <SupplierCategoriesSection categories={categories} canUpdate={canUpdate} />
      <ExpenseCategoriesSection categories={expenseCategories} canUpdate={canUpdate} />
      <TreasuryAccountsSection accounts={accounts} canUpdate={canUpdate} />
      <WithholdingRegimesSection regimes={regimes} canUpdate={canUpdate} />
    </div>
  );
}
