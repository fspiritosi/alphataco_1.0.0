export interface AccessibleModule {
  module_id: string;
  module_slug: string;
  module_name: string;
  module_icon: string;
}

export interface SidebarProps {
  accessibleModules: AccessibleModule[];
}
