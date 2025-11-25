/**
 * Limpia y normaliza una URL para obtener solo el pathname
 *
 * @param url - URL completa o pathname a limpiar
 * @returns Pathname limpio sin query params ni hash
 *
 * @example
 * cleanPath('https://example.com/dashboard/comercial?tab=clientes#section')
 * // Returns: '/dashboard/comercial'
 *
 * cleanPath('/dashboard/comercial?tab=clientes')
 * // Returns: '/dashboard/comercial'
 *
 * cleanPath('/')
 * // Returns: '/dashboard'
 */
export function cleanPath(url: string): string {
  try {
    // Si la URL está vacía, devolver dashboard
    if (!url || url === '') {
      return '/dashboard';
    }

    // Si solo tenemos una barra, devolver dashboard
    if (url === '/') {
      return '/dashboard';
    }

    let pathname: string;

    // Si la URL ya tiene el formato correcto (empieza por /)
    if (url.startsWith('/')) {
      pathname = url;
    } else {
      // Crear un objeto URL para parsear URLs completas
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
    }

    // Limpiar query params y hash
    pathname = pathname.split('?')[0].split('#')[0];

    // Si el pathname es vacío o /, devolver dashboard
    if (!pathname || pathname === '/' || pathname === '') {
      return '/dashboard';
    }

    return pathname;
  } catch (error) {
    // Si la URL no es válida, registrar el error y devolver dashboard
    console.error('Error procesando URL en cleanPath:', error);
    console.error('URL problemática:', url);
    return '/dashboard';
  }
}
