import { fetchCurrentCompany, fetchUserCompanies } from '@/shared/actions/company.actions';
import { getCachedSession } from '@/shared/lib/cached-session';
import { getCurrentUserProfile } from './actions/actions.navbar';
import { Navbar } from './components/Navbar';

async function NavbarFeat() {
  // Get userId from cached session (0 network calls — reads JWT cookie)
  const session = await getCachedSession();
  const userId = session?.user?.id || '';

  // Run ALL queries in parallel — no waterfall
  const [user, currentCompany, { sharedCompanies, allCompanies }] = await Promise.all([
    getCurrentUserProfile(),
    fetchCurrentCompany(),
    fetchUserCompanies(userId),
  ]);

  return (
    <Navbar
      user={user}
      companies={{
        sharedCompanies,
        allCompanies,
        currentCompany,
      }}
    />
  );
}

export default NavbarFeat;
