import { fetchCurrentCompany, fetchUserCompanies } from '@/shared/actions/company.actions';
import { getCachedSession } from '@/shared/lib/session';
import { _CompanySelector } from '../modals/_CompanySelector';

/**
 * Async Server Component — carga datos de empresas y renderiza el selector.
 * Se envuelve en Suspense desde NavbarFeat para streaming independiente.
 */
export async function CompanySelectorAsync() {
  const session = await getCachedSession();
  const userId = session?.user?.id || '';

  const [currentCompany, { sharedCompanies, allCompanies }] = await Promise.all([
    fetchCurrentCompany(),
    fetchUserCompanies(userId),
  ]);

  return (
    <_CompanySelector
      sharedCompanies={sharedCompanies}
      allCompanies={allCompanies}
      currentCompany={currentCompany ?? []}
    />
  );
}
