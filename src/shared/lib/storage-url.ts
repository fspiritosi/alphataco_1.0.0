/**
 * URLs estables de archivos: `/api/files/<bucket>/<key>`.
 *
 * Módulo PURO (sin `server-only`): lo usan la costura de storage, la ruta proxy y los
 * componentes que necesitan volver de la URL guardada al path del objeto.
 *
 * DEUDA CONOCIDA: lo que debería quedar en la base es la KEY (`bucket/path`), no la URL.
 * `extractStoragePath()` ya hacía URL→path para poder borrar el archivo, así que la URL
 * nunca fue más que una key con ceremonia. Normalizar las ~10 columnas que hoy guardan la
 * URL (`company.company_logo`, `other_equipment.pictures`/`.blueprints`,
 * `other_equipment_certifications.file_url`, `maintenance_order_items.images`,
 * `maintenance_request_items.images`, `tires.discard_photo`,
 * `clothing_deliveries.signature_url`, `preparte.preparteImage`, `profile.avatar`)
 * permitiría elegir en cada lugar entre servir por la ruta o por una URL firmada, y sacar
 * el proxy del camino caliente. No se hace acá porque es una migración con backfill y P3
 * ya toca bastante; hasta entonces la URL persistida tiene que ser estable, que es
 * exactamente lo que esta función garantiza.
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

/** Parámetro que hace que la ruta responda con `Content-Disposition: attachment`. */
export const DOWNLOAD_PARAM = 'download';

/** Igual que `buildStorageFileUrl` pero el navegador la baja como archivo en vez de mostrarla. */
export function buildStorageDownloadUrl(bucket: string, path: string): string {
  return `${buildStorageFileUrl(bucket, path)}?${DOWNLOAD_PARAM}=1`;
}

/**
 * Vuelve de una URL guardada al `{ bucket, path }` del objeto, o `null` si no es una URL de
 * archivos de la app. Tolera el querystring (`?v=...` del logo, `?timestamp=...`) y la forma
 * absoluta, por si alguna URL quedó guardada con dominio.
 *
 * El prefijo se ANCLA (no se busca en cualquier posición): si no, una URL como
 * `https://otro-host/redirect?to=/api/files/logo/x.png` se leería como propia.
 */
export function parseStorageFileUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  const withoutQuery = url.split('?')[0].split('#')[0];
  const pathname = withoutQuery.startsWith('/')
    ? withoutQuery
    : (() => {
        try {
          return new URL(withoutQuery).pathname;
        } catch {
          return null;
        }
      })();
  if (!pathname?.startsWith(`${STORAGE_FILES_PREFIX}/`)) return null;
  const rest = pathname.slice(STORAGE_FILES_PREFIX.length + 1);
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
