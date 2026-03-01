import { ModeToggle } from '@/components/ui/ToogleDarkButton';
import { Button } from '@/components/ui/button';
import { NavbarClientProps } from '../types/navbar.types';
import { _CompanySelector } from './modals/_CompanySelector';
import { _NotificationsModal } from './modals/_NotificationsModal';
import { _SidebarToggle } from './ui/_SidebarToggle';
import { _UserMenu } from './ui/_UserMenu';

export function Navbar({ user, notifications, companies }: NavbarClientProps) {
  return (
    <nav className="flex flex-shrink items-center justify-end sm:justify-between dark:bg-slate-950 bg-gh text-foreground pr-4 py-4 px-7 pl-0">
      <div className="items-center flex gap-6">
        <_SidebarToggle />
        <_CompanySelector
          sharedCompanies={companies.sharedCompanies}
          allCompanies={companies.allCompanies}
          currentCompany={companies.currentCompany ?? []}
        />
      </div>

      <div className="flex gap-8 items-center">
        {user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Developer' ? (
          <Button variant="default" asChild>
            <a href="/admin/panel">Panel</a>
          </Button>
        ) : null}

        <_NotificationsModal notifications={notifications} />
        <ModeToggle />
        <_UserMenu user={user} />
      </div>
    </nav>
  );
}
