import { ModeToggle } from '@/components/ui/ToogleDarkButton';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavbarClientProps } from '../types/navbar.types';
import { _CompanySelector } from './modals/_CompanySelector';
import { _NotificationsModal } from './modals/_NotificationsModal';
import { _UserMenu } from './ui/_UserMenu';

export function Navbar({ user, notifications, companies }: NavbarClientProps) {
  return (
    <nav className="flex shrink-0 items-center justify-end sm:justify-between text-foreground pr-4 py-4 px-7 pl-0">
      <div className="items-center flex gap-6">
        <SidebarTrigger className="ml-7 size-8" />
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
