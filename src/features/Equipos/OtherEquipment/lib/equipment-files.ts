import { parseStorageFileUrl } from '@/shared/lib/storage-url';

/**
 * Reglas puras de los archivos de un equipamiento en el storage (fotos, planos y
 * certificaciones). Los paths tienen la forma `other-equipment-<tipo>/<equipoId>/<ts>_<nombre>`;
 * las server actions arman el path acá (nunca lo reciben del cliente) y validan con
 * `isOtherEquipmentFilePath` que un archivo a borrar pertenezca a ese equipo.
 */

export type OtherEquipmentFileKind = 'pictures' | 'blueprints' | 'certifications';

export const OTHER_EQUIPMENT_FILE_KINDS: readonly OtherEquipmentFileKind[] = ['pictures', 'blueprints', 'certifications'];

export function isOtherEquipmentFileKind(value: unknown): value is OtherEquipmentFileKind {
  return typeof value === 'string' && (OTHER_EQUIPMENT_FILE_KINDS as readonly string[]).includes(value);
}

const FOLDER_BY_KIND: Record<OtherEquipmentFileKind, string> = {
  pictures: 'other-equipment-pictures',
  blueprints: 'other-equipment-blueprints',
  certifications: 'other-equipment-certifications',
};

export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, '_');
}

export function buildOtherEquipmentFilePath(
  kind: OtherEquipmentFileKind,
  equipmentId: string,
  fileName: string,
  timestamp: number
): string {
  return `${FOLDER_BY_KIND[kind]}/${equipmentId}/${timestamp}_${sanitizeFileName(fileName)}`;
}

/** Path relativo del storage a partir de la URL guardada, o null si no es de ese bucket. */
export function extractStoragePath(fileUrl: string, bucket: string): string | null {
  const parsed = parseStorageFileUrl(fileUrl);
  if (!parsed || parsed.bucket !== bucket) return null;
  return parsed.path;
}

/** `true` si `path` es un archivo dentro de la carpeta `<tipo>/<equipoId>/` (sin `..`, sin `/` inicial). */
export function isOtherEquipmentFilePath(path: string, kind: OtherEquipmentFileKind, equipmentId: string): boolean {
  const prefix = `${FOLDER_BY_KIND[kind]}/${equipmentId}/`;
  if (!path.startsWith(prefix) || path.length <= prefix.length) return false;
  if (path.startsWith('/') || path.includes('\\')) return false;
  return !path.split('/').some((segment) => segment === '..' || segment === '.' || segment === '');
}

export function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(lower);
}

/** Nombre legible del archivo (sin el prefijo `<timestamp>_`). */
export function getFileNameFromUrl(url: string): string {
  try {
    const decoded = decodeURIComponent(url);
    const last = decoded.split('/').pop() ?? decoded;
    return last.replace(/^\d+_/, '');
  } catch {
    return url;
  }
}
