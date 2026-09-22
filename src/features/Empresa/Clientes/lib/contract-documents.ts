/**
 * Helpers puros de los documentos de contrato (`documents_contracts` + bucket
 * `contract-documents`). La subida/borrado real vive en `actions/services.server.ts`.
 */
export type ContractDocumentType = 'pdf' | 'image' | 'spreadsheet' | 'document' | 'otro';

export const CONTRACT_DOCUMENTS_BUCKET = 'contract-documents';

/** Nombre apto para carpeta/archivo: minúsculas, `_` por espacios, sin símbolos. */
export function safeFolderName(name: string): string {
  const cleaned = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return cleaned || 'default';
}

export function classifyDocumentType(mimeType: string, fileName: string): ContractDocumentType {
  const mime = (mimeType ?? '').toLowerCase();
  const name = (fileName ?? '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('spreadsheet') || mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return 'spreadsheet';
  }
  if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'document';
  return 'otro';
}

interface ContractDocumentPathInput {
  companyId: string;
  customerId: string;
  contractId: string;
  fileName: string;
  now?: number;
}

/**
 * `<companyId>/<customerId>/<contractId>/<timestamp>_<archivo>`. El path sólo ordena el bucket
 * por empresa; la pertenencia la verifican las actions sobre el contrato (`documents_contracts.
 * contract_id → customer_services → customers.company_id`) antes de subir, firmar o borrar.
 */
export function buildContractDocumentPath({
  companyId,
  customerId,
  contractId,
  fileName,
  now = Date.now(),
}: ContractDocumentPathInput): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const safeBase = safeFolderName(base);
  return `${companyId}/${customerId}/${contractId}/${now}_${safeBase}${ext ? `.${ext}` : ''}`;
}
