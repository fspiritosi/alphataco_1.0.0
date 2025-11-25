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
  moduleSlug: string;
  href: string;
  icon: JSX.Element;
  position: number;
};

export const navigationLinks: NavigationLink[] = [
  {
    name: 'Dashboard',
    moduleSlug: 'dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={sizeIcons} />,
    position: 1,
  },
  {
    name: 'Empresa',
    moduleSlug: 'empresa',
    href: '/dashboard/company/actualCompany',
    icon: <Building2 size={sizeIcons} />,
    position: 2,
  },
  {
    name: 'Empleados',
    moduleSlug: 'empleados',
    href: '/dashboard/employee',
    icon: <Users size={sizeIcons} />,
    position: 3,
  },
  {
    name: 'Equipos',
    moduleSlug: 'equipos',
    href: '/dashboard/equipment',
    icon: <Truck size={sizeIcons} />,
    position: 4,
  },
  {
    name: 'Comercial',
    moduleSlug: 'comercial',
    href: '/dashboard/comercial',
    icon: <HandshakeIcon />,
    position: 5,
  },
  {
    name: 'Documentación',
    moduleSlug: 'documentacion',
    href: '/dashboard/document',
    icon: <FileText size={sizeIcons} />,
    position: 6,
  },
  {
    name: 'Operaciones',
    moduleSlug: 'operaciones',
    href: '/dashboard/operations',
    icon: <Calendar size={sizeIcons} />,
    position: 7,
  },
  {
    name: 'Mantenimiento',
    moduleSlug: 'mantenimiento',
    href: '/dashboard/maintenance',
    icon: <Wrench size={sizeIcons} />,
    position: 8,
  },
  {
    name: 'Formularios',
    moduleSlug: 'formularios',
    href: '/dashboard/forms',
    icon: <ClipboardList size={sizeIcons} />,
    position: 9,
  },
  {
    name: 'Ayuda',
    moduleSlug: 'ayuda',
    href: '/dashboard/help',
    icon: <HelpCircle size={sizeIcons} />,
    position: 10,
  },
];
