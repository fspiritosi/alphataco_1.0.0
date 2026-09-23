import { afterAll, describe, expect, it } from 'vitest';

/**
 * Integración real contra el MinIO del compose. Corre sólo con `S3_ENDPOINT` definido:
 *
 *   docker compose --env-file .env.docker up -d minio minio-init
 *   set -a; source .env.docker; set +a
 *   S3_ENDPOINT=http://127.0.0.1:${MINIO_PORT} npx vitest run src/shared/lib/storage.integration.test.ts
 *
 * Los tests unitarios no alcanzan para esta capa: lo que puede fallar contra MinIO son
 * justo las cosas que un mock da por buenas —la firma SigV4 con `forcePathStyle`, los
 * checksums que el SDK agrega en `PutObject`, el `CopySource` URL-encodeado del move y que
 * una URL firmada se pueda descargar de verdad por HTTP—.
 *
 * El import es dinámico porque `s3.ts` exige las variables de entorno al construir el cliente.
 */
const BUCKET = 'document-files';
const PREFIX = `__integration__/${Date.now()}`;

describe.skipIf(!process.env.S3_ENDPOINT)('storage (integración contra MinIO)', () => {
  const key = `${PREFIX}/informe (v1).pdf`;
  const movedKey = `${PREFIX}/movido/informe final.pdf`;

  afterAll(async () => {
    if (!process.env.S3_ENDPOINT) return;
    const { storageRemove } = await import('./storage');
    await storageRemove(BUCKET, [key, movedKey, `${PREFIX}/otro.txt`]);
  });

  it('sube un archivo y lo devuelve al descargarlo, con su content-type', async () => {
    const { storageDownload, storageUpload } = await import('./storage');
    const file = new File([new TextEncoder().encode('contenido de prueba')], 'informe.pdf', {
      type: 'application/pdf',
    });

    const uploaded = await storageUpload(BUCKET, key, file);
    expect(uploaded).toEqual({ ok: true, data: { path: key } });

    const downloaded = await storageDownload(BUCKET, key);
    expect(downloaded.ok).toBe(true);
    if (!downloaded.ok) return;
    expect(await downloaded.data.text()).toBe('contenido de prueba');
    expect(downloaded.data.type).toBe('application/pdf');
  });

  it('con `upsert: false` rechaza pisar un archivo existente', async () => {
    const { storageUpload } = await import('./storage');
    const file = new File([new TextEncoder().encode('otro')], 'informe.pdf', { type: 'application/pdf' });
    const result = await storageUpload(BUCKET, key, file);
    expect(result).toEqual({ ok: false, error: 'The resource already exists' });
  });

  it('con `upsert: true` pisa el archivo', async () => {
    const { storageDownload, storageUpload } = await import('./storage');
    const file = new File([new TextEncoder().encode('contenido pisado')], 'informe.pdf', {
      type: 'application/pdf',
    });
    expect((await storageUpload(BUCKET, key, file, { upsert: true })).ok).toBe(true);

    const downloaded = await storageDownload(BUCKET, key);
    expect(downloaded.ok && (await downloaded.data.text())).toBe('contenido pisado');
  });

  it('lista los hijos inmediatos del prefijo, por nombre y sin recursión', async () => {
    const { storageList, storageUpload } = await import('./storage');
    const otro = new File([new TextEncoder().encode('x')], 'otro.txt', { type: 'text/plain' });
    await storageUpload(BUCKET, `${PREFIX}/otro.txt`, otro, { upsert: true });
    await storageUpload(BUCKET, `${PREFIX}/sub/anidado.txt`, otro, { upsert: true });

    const listed = await storageList(BUCKET, PREFIX);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    const names = listed.data.map((entry) => entry.name).sort();
    // `sub/anidado.txt` no aparece: el delimitador corta en el primer nivel.
    expect(names).toEqual(['informe (v1).pdf', 'otro.txt']);

    await (await import('./storage')).storageRemove(BUCKET, [`${PREFIX}/sub/anidado.txt`]);
  });

  it('firma una URL que se puede descargar por HTTP', async () => {
    const { storageSignedUrls } = await import('./storage');
    const signed = await storageSignedUrls(BUCKET, [key], 60);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const response = await fetch(signed.data[0].url);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('contenido pisado');
  });

  it('el bucket es privado: sin firma, MinIO rechaza el objeto', async () => {
    const endpoint = (process.env.S3_ENDPOINT as string).replace(/\/$/, '');
    const response = await fetch(`${endpoint}/${BUCKET}/${encodeURI(key)}`);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('no firma un archivo que no existe', async () => {
    const { storageSignedUrls } = await import('./storage');
    const signed = await storageSignedUrls(BUCKET, [`${PREFIX}/no-existe.pdf`], 60);
    expect(signed).toEqual({ ok: false, error: 'Alguno de los archivos no existe en el storage' });
  });

  it('mueve el archivo (copia + borra) conservando el contenido', async () => {
    const { storageDownload, storageMove } = await import('./storage');
    const moved = await storageMove(BUCKET, key, movedKey);
    expect(moved).toEqual({ ok: true, data: { path: movedKey } });

    const atDestination = await storageDownload(BUCKET, movedKey);
    expect(atDestination.ok && (await atDestination.data.text())).toBe('contenido pisado');
    expect((await storageDownload(BUCKET, key)).ok).toBe(false);
  });

  it('el move no pisa el destino salvo que se lo pidan', async () => {
    const { storageMove, storageUpload } = await import('./storage');
    const file = new File([new TextEncoder().encode('origen')], 'a.txt', { type: 'text/plain' });
    await storageUpload(BUCKET, key, file, { upsert: true });

    expect(await storageMove(BUCKET, key, movedKey)).toEqual({ ok: false, error: 'The resource already exists' });
    expect(await storageMove(BUCKET, key, movedKey, { overwrite: true })).toEqual({
      ok: true,
      data: { path: movedKey },
    });
  });

  it('borra los archivos y borrar algo inexistente no falla', async () => {
    const { storageDownload, storageRemove } = await import('./storage');
    expect(await storageRemove(BUCKET, [movedKey, `${PREFIX}/otro.txt`])).toEqual({ ok: true, data: null });
    expect((await storageDownload(BUCKET, movedKey)).ok).toBe(false);
    expect(await storageRemove(BUCKET, [`${PREFIX}/nunca-existio.pdf`])).toEqual({ ok: true, data: null });
  });
});
