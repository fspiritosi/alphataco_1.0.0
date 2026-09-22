import { describe, expect, it } from 'vitest';
import {
  buildOtherEquipmentFilePath,
  extractStoragePath,
  getFileNameFromUrl,
  isImageUrl,
  isOtherEquipmentFilePath,
  sanitizeFileName,
} from './equipment-files';

const ID = '2f1e0b4c-1d8a-4a2f-9b6f-0f0a1b2c3d4e';

describe('sanitizeFileName', () => {
  it('quita acentos, reemplaza espacios y descarta separadores de ruta', () => {
    expect(sanitizeFileName('Plano  eléctrico ñ.pdf')).toBe('Plano_electrico_n.pdf');
    expect(sanitizeFileName('../../x/y\\z.png')).toBe('.._.._x_y_z.png');
  });
});

describe('buildOtherEquipmentFilePath', () => {
  it('arma <carpeta del tipo>/<equipo>/<timestamp>_<nombre>', () => {
    expect(buildOtherEquipmentFilePath('pictures', ID, 'foto 1.jpg', 1700000000000)).toBe(
      `other-equipment-pictures/${ID}/1700000000000_foto_1.jpg`
    );
    expect(buildOtherEquipmentFilePath('blueprints', ID, 'p.pdf', 1)).toBe(`other-equipment-blueprints/${ID}/1_p.pdf`);
    expect(buildOtherEquipmentFilePath('certifications', ID, 'c.pdf', 1)).toBe(
      `other-equipment-certifications/${ID}/1_c.pdf`
    );
  });
});

describe('extractStoragePath', () => {
  it('extrae el path relativo de una URL pública del bucket (decodificado)', () => {
    const url = `https://x.supabase.co/storage/v1/object/public/document-files/other-equipment-pictures/${ID}/1_foto%201.jpg`;
    expect(extractStoragePath(url, 'document-files')).toBe(`other-equipment-pictures/${ID}/1_foto 1.jpg`);
  });
  it('otra URL o bucket → null', () => {
    expect(extractStoragePath('https://example.com/a.jpg', 'document-files')).toBeNull();
    expect(extractStoragePath('https://x/storage/v1/object/public/otro/a.jpg', 'document-files')).toBeNull();
  });
});

describe('isOtherEquipmentFilePath', () => {
  it('sólo acepta archivos dentro de la carpeta del tipo y del equipo', () => {
    expect(isOtherEquipmentFilePath(`other-equipment-pictures/${ID}/1_a.jpg`, 'pictures', ID)).toBe(true);
    expect(isOtherEquipmentFilePath(`other-equipment-blueprints/${ID}/1_a.pdf`, 'pictures', ID)).toBe(false);
    expect(isOtherEquipmentFilePath(`other-equipment-pictures/otro-id/1_a.jpg`, 'pictures', ID)).toBe(false);
    expect(isOtherEquipmentFilePath(`other-equipment-pictures/${ID}/`, 'pictures', ID)).toBe(false);
    expect(isOtherEquipmentFilePath(`other-equipment-pictures/${ID}/../x.jpg`, 'pictures', ID)).toBe(false);
    expect(isOtherEquipmentFilePath(`/other-equipment-pictures/${ID}/1_a.jpg`, 'pictures', ID)).toBe(false);
  });
});

describe('helpers de UI', () => {
  it('isImageUrl por extensión (ignora query string)', () => {
    expect(isImageUrl('https://x/a.PNG?token=1')).toBe(true);
    expect(isImageUrl('https://x/a.pdf')).toBe(false);
  });
  it('getFileNameFromUrl quita el prefijo de timestamp', () => {
    expect(getFileNameFromUrl(`https://x/other-equipment-pictures/${ID}/1700000000000_foto_1.jpg`)).toBe('foto_1.jpg');
    expect(getFileNameFromUrl('https://x/dir/plano%20a.pdf')).toBe('plano a.pdf');
  });
});
