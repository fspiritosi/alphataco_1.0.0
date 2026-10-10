/** Bucket de los archivos de proveedores: documentos y presupuestos recibidos. */
export const SUPPLIER_FILES_BUCKET = 'supplier-documents';

/** Nombre de archivo seguro para la key (sin barras ni caracteres raros). */
export function safeFileName(name: string): string {
  const cleaned = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_');
  return cleaned.slice(-120) || 'documento';
}
