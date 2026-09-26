import { fetchCurrentCompany, fetchUserCompanies } from '@/shared/actions/company.actions';
import { CompanySwitcher } from '../CompanySwitcher';

/**
 * Async Server Component — carga datos de empresas y renderiza el selector del header.
 * Se envuelve en Suspense desde `AppSidebar` para streaming independiente.
 */
export async function CompanySwitcherAsync() {
  const [currentCompany, { sharedCompanies, allCompanies }] = await Promise.all([
    fetchCurrentCompany(),
    fetchUserCompanies(),
  ]);

  return (
    <CompanySwitcher
      sharedCompanies={sharedCompanies}
      allCompanies={allCompanies}
      currentCompany={currentCompany ?? []}
    />
  );
}
