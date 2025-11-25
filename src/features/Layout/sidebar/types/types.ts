export interface AccessibleModule {
  module_id: string;
  module_slug: string;
  module_name: string;
  module_icon: string;
}

export interface SidebarProps {
  /**
   * Pathname inicial obtenido del servidor (SSR)
   * Se usa como fallback si usePathname() no está disponible
   */
  initialPathname: string;
  accessibleModules: AccessibleModule[];
  isActive: string | undefined;
}
