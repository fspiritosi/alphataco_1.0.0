// 'use client';
// import { cn } from '@/lib/utils';
// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import { useSidebarStore } from '../store/useSidebarStore';
// import { SidebarProps } from '../types/types';
// import { filterNavigationLinks, sortNavigationLinks } from '../utils/sidebar.utils';

// export function Sidebar({ role, userModules }: SidebarProps) {
//   const pathName = usePathname();
//   const filteredLinks = sortNavigationLinks(filterNavigationLinks(role, userModules));
//   const isActiveSidebar = useSidebarStore((state) => state.isActiveSidebar);

//   // Create links with regex patterns for accurate active link detection
//   const linksWithRegex = filteredLinks.map((link) => {
//     // Convert link href to regex pattern
//     const href = link.href.toString();
//     const regexPattern = new RegExp(`^${href.replace(/\//g, '\\/')}(\/|$)`);

//     return {
//       ...link,
//       regex: regexPattern,
//     };
//   });

//   // Use the reduce method to find the best match (most specific)
//   const activeLink =
//     linksWithRegex?.reduce(
//       (bestMatch: { link: any; matchLength: number }, link: any) => {
//         const match = pathName.match(link.regex);
//         const matchLength = match ? match[0]?.length : 0;
//         return matchLength > bestMatch.matchLength ? { link, matchLength } : bestMatch;
//       },
//       { link: null, matchLength: 0 }
//     ).link?.name || '';

//   return (
//     <div
//       className={`relative top-0 left-0 h-full bg-gh dark:bg-slate-950 dark:text-white transition-width duration-500 ${isActiveSidebar ? 'w-16' : 'w-60'} sticky top-0 h-screen`}
//     >
//       <div className={cn('flex items-center p-2 justify-center')}>
//         <span className="text-white text-xl flex items-center gap-2 relative overflow-hidden">
//           <img src="/gh_logo.png" alt="codeControl logo" className=" relative block" />
//           {/* <CardTitle className="relative block text-black dark:text-white">Grupo Horizonte</CardTitle> */}
//         </span>
//       </div>
//       <ul className="mt-[27px]">
//         {filteredLinks.map((link) => (
//           <Link
//             key={link.name}
//             href={link.href}
//             className={cn(
//               'flex items-center p-4 cursor-pointer transition-all duration-500 rounded-s-full lisidebar relative',
//               link.name === activeLink
//                 ? 'dark:bg-slate-900 bg-gh_contrast activesidebar before:shadow-custom-white after:shadow-custom-white-inverted'
//                 : 'hover:bg-gh-contrast dark:hover:bg-slate-800',
//               isActiveSidebar ? 'ml-0' : 'ml-4'
//             )}
//           >
//             <div className="flex items-center overflow-hidden">
//               <span className="relative">{link.icon}</span>
//               <span className="ml-6 text-black dark:text-white  relative block">{link.name}</span>
//             </div>
//           </Link>
//         ))}
//       </ul>
//     </div>
//   );
// }

'use client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useSidebarStore } from '../store/useSidebarStore';
import { SidebarProps } from '../types/types';
import { filterNavigationLinks, sortNavigationLinks } from '../utils/sidebar.utils';

export function Sidebar({ role, userModules }: SidebarProps) {
  const pathName = usePathname();
  const isActiveSidebar = useSidebarStore((state) => state.isActiveSidebar);

  // Memoizar los enlaces filtrados para evitar recálculos en cada renderizado
  const filteredLinks = useMemo(
    () => sortNavigationLinks(filterNavigationLinks(role, userModules)),
    [role, userModules]
  );

  // Memoizar la creación de expresiones regulares
  const linksWithRegex = useMemo(
    () =>
      filteredLinks.map((link) => {
        const href = link.href.toString();
        const regexPattern = new RegExp(`^${href.replace(/\//g, '\\/')}(\/|$)`);
        return { ...link, regex: regexPattern };
      }),
    [filteredLinks]
  );

  // Memoizar el cálculo del enlace activo
  const activeLink = useMemo(
    () =>
      linksWithRegex.reduce(
        (bestMatch: { link: any; matchLength: number }, link: any) => {
          const match = pathName.match(link.regex);
          const matchLength = match ? match[0]?.length : 0;
          return matchLength > bestMatch.matchLength ? { link, matchLength } : bestMatch;
        },
        { link: null, matchLength: 0 }
      ).link?.name || '',
    [linksWithRegex, pathName]
  );

  return (
    <div
      className={`relative top-0 left-0 h-full bg-gh dark:bg-slate-950 dark:text-white transition-width duration-500 ${isActiveSidebar ? 'w-16' : 'w-60'} sticky top-0 h-screen`}
    >
      <div className={cn('flex items-center p-2 justify-center')}>
        <span className="text-white text-xl flex items-center gap-2 relative overflow-hidden">
          <img src="/gh_logo.png" alt="codeControl logo" className=" relative block" />
          {/* <CardTitle className="relative block text-black dark:text-white">Grupo Horizonte</CardTitle> */}
        </span>
      </div>
      <ul className="mt-[27px]">
        {filteredLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className={cn(
              'flex items-center p-4 cursor-pointer transition-all duration-500 rounded-s-full lisidebar relative',
              link.name === activeLink
                ? 'bg-gh_contrast  dark:bg-slate-900 activesidebar before:shadow-custom-white after:shadow-custom-white-inverted dark:before:bg-slate-950 dark:after:bg-slate-950'
                : 'hover:bg-gh_contrast/80 hover:activesidebar',
              isActiveSidebar ? 'ml-0' : 'ml-4'
            )}
          >
            <div className="flex items-center overflow-hidden">
              <span className="relative">{link.icon}</span>
              <span className="ml-6 text-black dark:text-white  relative block">{link.name}</span>
            </div>
          </Link>
        ))}
      </ul>
    </div>
  );
}
