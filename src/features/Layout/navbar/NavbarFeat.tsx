import { fetchCurrentCompany, fetchUserCompanies } from '@/shared/actions/company.actions';
import { getCurrentUserProfile, getUserNotifications } from './actions/actions.navbar';
import { Navbar } from './components/Navbar';

async function NavbarFeat() {
  // Ejecutar todas las consultas en paralelo
  const [user, notifications, currentCompany] = await Promise.all([
    getCurrentUserProfile(),
    getUserNotifications(),
    fetchCurrentCompany(),
  ]);

  // Una vez tenemos el usuario, obtenemos sus compañías
  // (esta consulta depende del ID de usuario, por eso no la ponemos en el Promise.all inicial)
  const { sharedCompanies, allCompanies } = await fetchUserCompanies(user?.id || '');
  return (
    <Navbar
      user={user}
      notifications={notifications}
      companies={{
        sharedCompanies,
        allCompanies,
        currentCompany,
      }}
    />
  );
}

export default NavbarFeat;
