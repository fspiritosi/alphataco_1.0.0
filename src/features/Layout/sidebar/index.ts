/**
 * Sidebar Feature - Exports centralizados
 */

// Componentes
export { AppSidebar } from './AppSidebar';
export { DashboardBreadcrumb } from './components/DashboardBreadcrumb';
export { NavMain } from './components/NavMain';

// Constants
export { navigationLinks, SUB_ITEM_ICONS } from './constants/navigation';
export type { NavigationLink, NavigationSubLink } from './constants/navigation';

// Types
export type { AccessibleModule, CompanyRow } from './types/types';

// Utils
export { buildSidebarItems, createLinkRegex, findBestMatch, resolveActiveTab } from './utils/sidebar.utils';
export { resolveVisibleTabs } from './utils/tabs-visibility';
