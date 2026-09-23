/**
 * URLs estables de archivos: `/api/files/<bucket>/<key>`.
 *
 * Módulo PURO (sin `server-only`): lo usan la costura de storage, la ruta proxy y los
 * componentes que necesitan volver de la URL guardada al path del objeto.
 *
 * Por qué una ruta de la app y no una URL firmada ni un bucket público:
 * estas URLs se GUARDAN en la base (logo de empresa, fotos y certificaciones de
 * equipamiento, imágenes de reparación, foto de descarte de cubierta, firma de ropa,
 * imagen del preparte, avatar del perfil). Una URL firmada vence y deja el registro
 * apuntando a un enlace muerto; un bucket público deja los archivos de todas las empresas
 * legibles por quien adivine la ruta, que es justo el perímetro que se cerró en P2.
 * La ruta proxy es estable, revocable y valida la empresa en cada lectura.
 */

/** Prefijo de las URLs estables de archivos. */
export const STORAGE_FILES_PREFIX = '/api/files';

/** Cada segmento se codifica por separado para no escapar las barras de la key. */
function encodeKey(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * URL estable de `bucket/path`. Relativa a propósito: es la que queda persistida, y una
 * URL absoluta ataría las filas al dominio con el que se subió el archivo.
 */
export function buildStorageFileUrl(bucket: string, path: string): string {
  const key = path.replace(/^\/+/, '');
  return `${STORAGE_FILES_PREFIX}/${encodeURIComponent(bucket)}/${encodeKey(key)}`;
}

/**
 * Vuelve de una URL guardada al `{ bucket, path }` del objeto, o `null` si no es una URL de
 * archivos de la app. Tolera el querystring (`?v=...` del logo, `?timestamp=...`) y la forma
 * absoluta, por si alguna URL quedó guardada con dominio.
 */
export function parseStorageFileUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  const withoutQuery = url.split('?')[0].split('#')[0];
  const idx = withoutQuery.indexOf(`${STORAGE_FILES_PREFIX}/`);
  if (idx === -1) return null;
  const rest = withoutQuery.slice(idx + STORAGE_FILES_PREFIX.length + 1);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  try {
    const bucket = decodeURIComponent(rest.slice(0, slash));
    const path = decodeURIComponent(rest.slice(slash + 1));
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

/**
 * `true` si `path` es una key aceptable: relativa, sin `..`, sin segmentos vacíos y sin
 * barras invertidas. Todo lo que llega de afuera (la ruta proxy, un path reconstruido desde
 * una URL guardada) pasa por acá antes de tocar el storage.
 */
export function isSafeStorageKey(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) return false;
  return !path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
}
