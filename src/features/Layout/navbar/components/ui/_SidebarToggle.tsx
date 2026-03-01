'use client';

import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useNavbarStore } from '../../store/navbarStore';

export function _SidebarToggle() {
  // const [isOpen, setIsOpen] = useState(true);
  const isActiveSidebar = useNavbarStore((state) => state.isActiveSidebar);
  const toggleSidebar = useNavbarStore((state) => state.toggleSidebar);

  const handleToggle = () => {
    toggleSidebar();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="relative hover:bg-accent hover:text-accent-foreground ml-7"
    >
      <Menu className="size-8" />
      <span className="sr-only">{isActiveSidebar ? 'Cerrar sidebar' : 'Abrir sidebar'}</span>
    </Button>
  );
}
