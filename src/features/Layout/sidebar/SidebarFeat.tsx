import { getUserAccessibleModulesServer } from '@/features/Permissions';
import { Sidebar } from './components/Sidebar';

async function SidebarFeat() {
  const accessibleModules = await getUserAccessibleModulesServer();
  return <Sidebar accessibleModules={accessibleModules} />;
}

export default SidebarFeat;
