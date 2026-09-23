import { describe, expect, it } from 'vitest';
import { MAX_FILE_NAME_LENGTH, extensionOf, toFileName } from './storage-file-name';

/**
 * `toFileName` es lo único que separa un nombre elegido por el navegador de una key del
 * storage: si dejara pasar una ruta, `uploadToStorage` escribiría fuera de la carpeta de la
 * empresa. Por eso tiene test propio.
 */
describe('toFileName', () => {
  it('deja pasar un nombre normal', () => {
    expect(toFileName('informe.pdf')).toBe('informe.pdf');
    expect(toFileName('foto-2026_01.jpg')).toBe('foto-2026_01.jpg');
  });

  it('descarta la ruta y se queda con el archivo', () => {
    expect(toFileName('a/b/c.pdf')).toBe('c.pdf');
    expect(toFileName('C:\\temp\\c.pdf')).toBe('c.pdf');
    expect(toFileName('/etc/passwd')).toBe('passwd');
  });

  it('neutraliza el escape de carpeta', () => {
    expect(toFileName('../')).not.toContain('..');
    expect(toFileName('../')).not.toContain('/');
    expect(toFileName('..')).not.toContain('..');
    expect(toFileName('../../etc/passwd')).toBe('passwd');
    expect(toFileName('..%2F..%2Fx.png')).not.toContain('/');
  });

  it('ningún resultado puede contener un separador ni empezar con punto', () => {
    for (const input of ['../', '..', 'a\\b', '/', '//', './x', '...', 'a/../b']) {
      const result = toFileName(input);
      expect(result).not.toContain('/');
      expect(result).not.toContain('\\');
      expect(result.startsWith('.')).toBe(false);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('nunca devuelve vacío: genera un nombre si no queda nada', () => {
    expect(toFileName('')).toMatch(/^archivo-\d+$/);
    expect(toFileName('...')).toMatch(/^archivo-\d+$/);
    expect(toFileName('/')).toMatch(/^archivo-\d+$/);
  });

  it('saca tildes y reemplaza lo que no sea [A-Za-z0-9._-]', () => {
    expect(toFileName('informe año 2026.pdf')).toBe('informe_ano_2026.pdf');
    expect(toFileName('a b;c*d?.txt')).toBe('a_b_c_d_.txt');
  });

  it('acota el largo conservando la extensión', () => {
    const long = `${'a'.repeat(500)}.pdf`;
    const result = toFileName(long);
    expect(result.length).toBeLessThanOrEqual(MAX_FILE_NAME_LENGTH);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('acota también un nombre larguísimo sin extensión', () => {
    expect(toFileName('b'.repeat(500)).length).toBeLessThanOrEqual(MAX_FILE_NAME_LENGTH);
  });
});

describe('extensionOf', () => {
  it('devuelve la extensión en minúsculas', () => {
    expect(extensionOf('foto.JPG')).toBe('jpg');
    expect(extensionOf('a/b/informe.pdf')).toBe('pdf');
  });

  it('cae a jpg sin extensión utilizable', () => {
    expect(extensionOf('sinextension')).toBe('jpg');
    expect(extensionOf('')).toBe('jpg');
    expect(extensionOf('.oculto')).toBe('jpg');
    // Una "extensión" larguísima no es una extensión.
    expect(extensionOf(`a.${'x'.repeat(30)}`)).toBe('jpg');
  });

  it('no puede devolver un separador', () => {
    for (const input of ['../', 'a/b', 'a\\b.']) {
      expect(extensionOf(input)).not.toContain('/');
      expect(extensionOf(input)).not.toContain('\\');
    }
  });
});
