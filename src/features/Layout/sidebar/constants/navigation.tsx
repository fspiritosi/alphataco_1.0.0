import { HandshakeIcon } from '@/components/Icons';
import type { LucideIcon } from 'lucide-react';
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

export type SidebarIcon = LucideIcon | React.ComponentType<{ className?: string }>;

export type NavigationLink = {
  name: string;
  moduleSlug: string;
  href: string;
  icon: SidebarIcon;
  position: number;
};

export const navigationLinks: NavigationLink[] = [
  {
    name: 'Dashboard',
    moduleSlug: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    position: 1,
  },
  {
    name: 'Empresa',
    moduleSlug: 'empresa',
    href: '/dashboard/company/actualCompany',
    icon: Building2,
    position: 2,
  },
  {
    name: 'Empleados',
    moduleSlug: 'empleados',
    href: '/dashboard/employee',
    icon: Users,
    position: 3,
  },
  {
    name: 'Equipos',
    moduleSlug: 'equipos',
    href: '/dashboard/equipment',
    icon: Truck,
    position: 4,
  },
  {
    name: 'Comercial',
    moduleSlug: 'comercial',
    href: '/dashboard/comercial',
    icon: HandshakeIcon,
    position: 5,
  },
  {
    name: 'Documentación',
    moduleSlug: 'documentacion',
    href: '/dashboard/document',
    icon: FileText,
    position: 6,
  },
  {
    name: 'Operaciones',
    moduleSlug: 'operaciones',
    href: '/dashboard/operations',
    icon: Calendar,
    position: 7,
  },
  {
    name: 'Mantenimiento',
    moduleSlug: 'mantenimiento',
    href: '/dashboard/maintenance',
    icon: Wrench,
    position: 8,
  },
  {
    name: 'Formularios',
    moduleSlug: 'formularios',
    href: '/dashboard/forms',
    icon: ClipboardList,
    position: 9,
  },
  {
    name: 'Ayuda',
    moduleSlug: 'ayuda',
    href: '/dashboard/help',
    icon: HelpCircle,
    position: 10,
  },
];
