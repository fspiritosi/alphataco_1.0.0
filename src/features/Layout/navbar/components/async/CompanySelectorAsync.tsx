import { fetchCurrentCompany, fetchUserCompanies } from '@/shared/actions/company.actions';
import { _CompanySelector } from '../modals/_CompanySelector';

/**
 * Async Server Component — carga datos de empresas y renderiza el selector.
 * Se envuelve en Suspense desde NavbarFeat para streaming independiente.
 */
export async function CompanySelectorAsync() {
  const [currentCompany, { sharedCompanies, allCompanies }] = await Promise.all([
    fetchCurrentCompany(),
    fetchUserCompanies(),
  ]);

  return (
    <_CompanySelector
      sharedCompanies={sharedCompanies}
      allCompanies={allCompanies}
      currentCompany={currentCompany ?? []}
    />
  );
}
