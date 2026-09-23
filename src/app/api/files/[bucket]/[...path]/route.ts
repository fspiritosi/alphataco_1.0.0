import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from '@/lib/logger';
import { s3Client } from '@/shared/lib/s3';
import { isStorageBucket } from '@/shared/lib/storage-buckets';
import { resolveStorageObjectCompany } from '@/shared/lib/storage-perimeter';
import { isSafeStorageKey } from '@/shared/lib/storage-url';
import { canUseAsActiveCompany } from '@/shared/lib/tenant';
import { NextResponse } from 'next/server';

/**
 * Sirve un archivo del storage: `GET /api/files/<bucket>/<key>`.
 *
 * Es el destino de las URLs que `storagePublicUrl()` guarda en la base. Los buckets de
 * MinIO son todos privados, así que esta ruta es el único camino de lectura por URL, y por
 * eso valida el perímetro en cada request:
 *
 * 1. El bucket tiene que estar en la lista conocida.
 * 2. La key tiene que ser relativa y sin `..` (no se sirve nada fuera del bucket).
 * 3. Se resuelve la empresa DUEÑA del archivo (por el prefijo de la key o por la fila que
 *    lo referencia) y se exige que la sesión pueda usar esa empresa como empresa activa
 *    —el mismo predicado que `getActiveCompanyId()`, así que también pasan el operario de
 *    indumentaria y el del QR de mantenimiento, que no son miembros del dashboard—.
 *
 * Todo lo que no se puede probar responde 404, nunca 403: un 403 confirmaría que el archivo
 * existe.
 */
const logger = new Logger('app/api/files');

/** Sin caché compartida: la respuesta depende de la sesión. */
const PRIVATE_CACHE = 'private, max-age=300, must-revalidate';

function notFound(): NextResponse {
  return new NextResponse('No encontrado', { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
): Promise<NextResponse> {
  const { bucket, path: segments } = await params;

  if (!isStorageBucket(bucket)) return notFound();

  let key: string;
  try {
    key = segments.map((segment) => decodeURIComponent(segment)).join('/');
  } catch {
    return notFound();
  }
  if (!isSafeStorageKey(key)) return notFound();

  const companyId = await resolveStorageObjectCompany(bucket, key);
  if (!companyId) {
    logger.warn('Archivo sin empresa resoluble: no se sirve', { data: { bucket, key } });
    return notFound();
  }

  if (!(await canUseAsActiveCompany(companyId))) {
    logger.warn('Intento de leer un archivo de otra empresa', { data: { bucket, key, companyId } });
    return notFound();
  }

  try {
    const object = await s3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body) return notFound();
    const bytes = await object.Body.transformToByteArray();
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': object.ContentType ?? 'application/octet-stream',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': PRIVATE_CACHE,
        // El archivo lo subió un usuario: que el navegador no lo interprete como HTML/JS.
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name !== 'NoSuchKey' && name !== 'NotFound') {
      logger.error('Error al leer el archivo del storage', { data: { bucket, key, error } });
    }
    return notFound();
  }
}
