'use server';

/**
 * PermissionsProvider - Componente servidor que simplemente renderiza children
 *
 * NOTA: En Next.js App Router, no podemos pasar props directamente desde layout a páginas.
 * Los permisos deben obtenerse en el layout y pasarse explícitamente como prop
 * a cada componente que los necesite (como TabsManagerServer).
 *
 * Este componente es solo un wrapper que renderiza children sin modificar nada.
 * Los permisos se pasan explícitamente como prop desde el layout a los componentes.
 *
 * @example
 * ```tsx
 * // En layout.tsx
 * const permissions = await getUserPermissionsMapServer();
 * <PermissionsProvider>
 *   {children}
 * </PermissionsProvider>
 *
 * // En las páginas/componentes, pasar permisos explícitamente:
 * <TabsManagerServer permissions={permissions} ... />
 * ```
 */
export async function PermissionsProvider({ children }: { children: React.ReactNode }) {
  // Este componente solo renderiza children
  // Los permisos se pasan explícitamente como prop a cada componente que los necesite
  return <>{children}</>;
}
