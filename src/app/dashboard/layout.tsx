// import { AlertComponent } from '@/components/AlertComponent'
// import SideBarContainer from '@/components/SideBarContainer';
import { FilterCleanupInitializer } from '@/components/FilterCleanupInitializer';
import { PasswordChangeAlertWrapper } from '@/components/PasswordChangeAlertWrapper';
import NavbarFeat from '@/features/Layout/navbar/NavbarFeat';
import SidebarFeat from '@/features/Layout/sidebar/SidebarFeat';
import { Inter } from 'next/font/google';
import '../globals.css';
import TanstackQueryInicializador from './TanstackQueryInicializador';
const font = Inter({ subsets: ['latin'] });

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`grid grid-rows-[auto,1fr] grid-cols-[auto,1fr] h-screen `} suppressHydrationWarning>
      <FilterCleanupInitializer />
      <div className="row-span-2 ">
        <SidebarFeat />
      </div>
      <div className="border-r border-b border-muted/50 dark:bg-slate-950 mb-2">
        {/* <NavBar /> */}
        <NavbarFeat />
      </div>
      <TanstackQueryInicializador>
        <PasswordChangeAlertWrapper />
        {children}
      </TanstackQueryInicializador>
    </div>
  );
}
