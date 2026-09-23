import { describe, expect, it } from 'vitest';
import { buildStorageFileUrl, isSafeStorageKey, parseStorageFileUrl } from './storage-url';

const COMPANY = '11111111-2222-3333-4444-555555555555';

describe('buildStorageFileUrl', () => {
  it('arma una URL relativa: la URL queda guardada y no puede atarse a un dominio', () => {
    expect(buildStorageFileUrl('logo', `${COMPANY}/logo/logo.png`)).toBe(`/api/files/logo/${COMPANY}/logo/logo.png`);
  });

  it('codifica cada segmento sin escapar las barras de la key', () => {
    expect(buildStorageFileUrl('document-files', 'empresa (30-1)/foto 1.jpg')).toBe(
      '/api/files/document-files/empresa%20(30-1)/foto%201.jpg'
    );
  });

  it('ignora las barras iniciales de la key', () => {
    expect(buildStorageFileUrl('logo', '/a/b.png')).toBe('/api/files/logo/a/b.png');
  });
});

describe('parseStorageFileUrl', () => {
  it('vuelve al bucket y al path decodificados', () => {
    expect(parseStorageFileUrl('/api/files/document-files/empresa%20(30-1)/foto%201.jpg')).toEqual({
      bucket: 'document-files',
      path: 'empresa (30-1)/foto 1.jpg',
    });
  });

  it('ignora el querystring que rompe la caché del navegador', () => {
    expect(parseStorageFileUrl(`/api/files/logo/${COMPANY}/logo/logo.png?v=1758585600000`)).toEqual({
      bucket: 'logo',
      path: `${COMPANY}/logo/logo.png`,
    });
  });

  it('tolera la forma absoluta, por si alguna URL quedó guardada con dominio', () => {
    expect(parseStorageFileUrl('https://app.example.com/api/files/logo/a/b.png')).toEqual({
      bucket: 'logo',
      path: 'a/b.png',
    });
  });

  it('es la inversa de buildStorageFileUrl', () => {
    const path = `${COMPANY}/año 2026/informe (v1).pdf`;
    expect(parseStorageFileUrl(buildStorageFileUrl('document-files', path))).toEqual({
      bucket: 'document-files',
      path,
    });
  });

  it('null para lo que no es una URL de archivos de la app', () => {
    expect(parseStorageFileUrl('')).toBeNull();
    expect(parseStorageFileUrl('https://example.com/a.jpg')).toBeNull();
    expect(parseStorageFileUrl('https://x.supabase.co/storage/v1/object/public/logo/a.png')).toBeNull();
    expect(parseStorageFileUrl('/api/files/logo')).toBeNull();
    expect(parseStorageFileUrl('/api/files/logo/')).toBeNull();
  });
});

describe('isSafeStorageKey', () => {
  it('acepta una key relativa normal', () => {
    expect(isSafeStorageKey(`${COMPANY}/logo/logo.png`)).toBe(true);
    expect(isSafeStorageKey('archivo.pdf')).toBe(true);
  });

  it('rechaza el escape de carpeta y las rutas absolutas', () => {
    expect(isSafeStorageKey('../otra-empresa/logo.png')).toBe(false);
    expect(isSafeStorageKey(`${COMPANY}/../otra/logo.png`)).toBe(false);
    expect(isSafeStorageKey('/etc/passwd')).toBe(false);
    expect(isSafeStorageKey('a/./b.png')).toBe(false);
    expect(isSafeStorageKey('a//b.png')).toBe(false);
    expect(isSafeStorageKey('a\\b.png')).toBe(false);
    expect(isSafeStorageKey('')).toBe(false);
  });
});
