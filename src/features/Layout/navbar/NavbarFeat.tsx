import { ModeToggle } from '@/components/ui/ToogleDarkButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { _SidebarToggle } from './components/ui/_SidebarToggle';
import { CompanySelectorAsync } from './components/async/CompanySelectorAsync';
import { UserMenuAsync } from './components/async/UserMenuAsync';

/**
 * NavbarFeat — Shell estático + partes dinámicas en Suspense individual.
 *
 * El container, hamburger y theme toggle se renderizan INSTANTÁNEAMENTE.
 * CompanySelector y UserMenu se cargan por streaming independiente.
 */
function NavbarFeat() {
  return (
    <nav className="flex flex-shrink items-center justify-end sm:justify-between dark:bg-slate-950 bg-gh text-foreground pr-4 py-4 px-7 pl-0">
      <div className="items-center flex gap-6">
        <_SidebarToggle />
        <Suspense fallback={<Skeleton className="h-9 w-[220px] rounded-md" />}>
          <CompanySelectorAsync />
        </Suspense>
      </div>

      <div className="flex gap-8 items-center">
        <Suspense fallback={null}>
          <UserMenuAsync />
        </Suspense>
        <ModeToggle />
      </div>
    </nav>
  );
}

export default NavbarFeat;
