/**
 * Sidebar Feature - Exports centralizados
 */

// Componentes
export { default as SidebarFeat } from './SidebarFeat';
export { Sidebar } from './components/Sidebar';

// Hooks
export { useActiveLink } from './hooks/useActiveLink';
export { useSidebarLinks } from './hooks/useSidebarLinks';

// Constants
export { navigationLinks } from './constants/navigation';
export type { NavigationLink } from './constants/navigation';

// Types
export type { AccessibleModule, SidebarProps } from './types/types';

// Utils
export { createLinkRegex, findBestMatch } from './utils/sidebar.utils';
export { cleanPath } from './utils/utils.sidebar';
