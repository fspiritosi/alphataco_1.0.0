import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cliente S3 contra MinIO (P3). Módulo server-only: las credenciales nunca salen del servidor.
 *
 * Hay DOS clientes porque el endpoint de MinIO no es el mismo desde adentro y desde afuera
 * del compose:
 *
 * - `s3Client()` firma y ejecuta las operaciones del servidor contra `S3_ENDPOINT`
 *   (`http://minio:9000` dentro de la red de Docker).
 * - `s3PresignClient()` sólo se usa para FIRMAR URLs que va a abrir el navegador, contra
 *   `S3_PUBLIC_ENDPOINT` (`https://<dominio>/s3` o `http://localhost:29000` en dev). La
 *   firma de SigV4 incluye el host: una URL firmada para `minio:9000` da `SignatureDoesNotMatch`
 *   al pedirla desde afuera, así que no alcanza con reescribir el host después de firmar.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/** Endpoint interno (el que usa la app). */
export function s3Endpoint(): string {
  return requireEnv('S3_ENDPOINT');
}

/** Endpoint accesible desde el navegador. Sin `S3_PUBLIC_ENDPOINT` cae al interno (dev local). */
export function s3PublicEndpoint(): string {
  return process.env.S3_PUBLIC_ENDPOINT || s3Endpoint();
}

function buildClient(endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: process.env.S3_REGION || 'us-east-1',
    // MinIO no resuelve buckets por subdominio: el bucket va en el path.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY'),
      secretAccessKey: requireEnv('S3_SECRET_KEY'),
    },
  });
}

let internalClient: S3Client | null = null;
let presignClient: S3Client | null = null;

/** Cliente para las operaciones del servidor (subir, bajar, listar, copiar, borrar). */
export function s3Client(): S3Client {
  internalClient ??= buildClient(s3Endpoint());
  return internalClient;
}

/** Cliente para firmar URLs que abre el navegador. Ver el comentario de arriba. */
export function s3PresignClient(): S3Client {
  const publicEndpoint = s3PublicEndpoint();
  if (publicEndpoint === s3Endpoint()) return s3Client();
  presignClient ??= buildClient(publicEndpoint);
  return presignClient;
}

/** Reinicia los clientes memoizados. Sólo para los tests. */
export function resetS3Clients(): void {
  internalClient = null;
  presignClient = null;
}
