import { HandshakeIcon } from '@/components/Icons';
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';

const sizeIcons = 24;

export type NavigationLink = {
  name: string;
  href: string;
  icon: JSX.Element;
  position: number;
};

export const navigationLinks: NavigationLink[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={sizeIcons} />,
    position: 1,
  },
  {
    name: 'Empresa',
    href: '/dashboard/company/actualCompany',
    icon: <Building2 size={sizeIcons} />,
    position: 2,
  },
  {
    name: 'Empleados',
    href: '/dashboard/employee',
    icon: <Users size={sizeIcons} />,
    position: 3,
  },
  {
    name: 'Equipos',
    href: '/dashboard/equipment',
    icon: <Truck size={sizeIcons} />,
    position: 4,
  },
  {
    name: 'Comercial',
    href: '/dashboard/comercial',
    icon: <HandshakeIcon />,
    position: 5,
  },
  {
    name: 'Documentación',
    href: '/dashboard/document',
    icon: <FileText size={sizeIcons} />,
    position: 5,
  },
  {
    name: 'Operaciones',
    href: '/dashboard/operations',
    icon: <Calendar size={sizeIcons} />,
    position: 8,
  },
  {
    name: 'Mantenimiento',
    href: '/dashboard/maintenance',
    icon: <Wrench size={sizeIcons} />,
    position: 6,
  },
  {
    name: 'Formularios',
    href: '/dashboard/forms',
    icon: <ClipboardList size={sizeIcons} />,
    position: 7,
  },
  {
    name: 'Ayuda',
    href: '/dashboard/help',
    icon: <HelpCircle size={sizeIcons} />,
    position: 10,
  },
];

export function filterNavigationLinks(role: string, userModules?: string[]) {
  let filteredLinks = [...navigationLinks];

  if (role === 'owner') {
    return filteredLinks;
  }

  if (role === 'Invitado') {
    return filteredLinks.filter(
      (link) => !['empresa', 'operaciones', 'mantenimiento', 'documentación'].includes(link.name.toLowerCase())
    );
  }

  // Si el usuario tiene módulos específicos
  if (userModules?.length) {
    return filteredLinks.filter((link) => userModules.some((mod) => mod.toLowerCase() === link.name.toLowerCase()));
  }

  return filteredLinks;
}

export function sortNavigationLinks(links: NavigationLink[]) {
  return [...links].sort((a, b) => a.position - b.position);
}
