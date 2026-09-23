import { Logger } from '@/lib/logger';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import moment from 'moment';
import { getDeliveriesForPdfBulk, type DeliveryPdfData } from '../actions/pdf.server';
import { DeliveryReceiptLayout } from './DeliveryReceiptLayout';

const logger = new Logger('Clothing/bulkDownload');

const RENDER_CONCURRENCY = 4;

export interface BulkDownloadProgress {
  done: number;
  total: number;
  stage: 'fetching' | 'rendering' | 'zipping' | 'done';
}

export type BulkDownloadProgressHandler = (progress: BulkDownloadProgress) => void;

/**
 * Builds the same filename DeliveryReceiptButton uses for individual downloads.
 */
function buildFileName(delivery: DeliveryPdfData): string {
  const emp = delivery.employees_clothing_deliveries_employee_idToemployees;
  const empName = emp ? `${emp.lastname}_${emp.firstname}` : 'empleado';
  const date = delivery.delivered_at
    ? moment(delivery.delivered_at).format('YYYY-MM-DD')
    : moment().format('YYYY-MM-DD');
  return `Constancia_EPP_${empName}_${date}.pdf`;
}

/**
 * Avoids filename collisions in the ZIP (multiple deliveries for the same person on the same day).
 */
function dedupeFileNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dotIdx = name.lastIndexOf('.');
    const base = dotIdx === -1 ? name : name.slice(0, dotIdx);
    const ext = dotIdx === -1 ? '' : name.slice(dotIdx);
    return `${base}_(${count + 1})${ext}`;
  });
}

/**
 * Renders an array of PDF documents with a concurrency cap to keep the
 * browser responsive (each render is CPU-heavy via @react-pdf/renderer).
 */
async function renderPdfsConcurrently(
  deliveries: DeliveryPdfData[],
  onProgress: BulkDownloadProgressHandler | undefined
): Promise<Blob[]> {
  const blobs: Blob[] = new Array(deliveries.length);
  let completed = 0;
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= deliveries.length) return;

      const doc = <DeliveryReceiptLayout data={deliveries[idx]} />;
      blobs[idx] = await pdf(doc).toBlob();

      completed += 1;
      onProgress?.({ done: completed, total: deliveries.length, stage: 'rendering' });
    }
  };

  const workers = Array.from({ length: Math.min(RENDER_CONCURRENCY, deliveries.length) }, () => worker());
  await Promise.all(workers);
  return blobs;
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads multiple delivery receipts as a single ZIP file.
 * - One server call fetches all delivery data.
 * - PDFs render in parallel (capped) to avoid freezing the tab.
 * - Each PDF is added to the ZIP under its individual filename.
 */
export async function downloadDeliveriesAsZip(
  deliveryIds: string[],
  onProgress?: BulkDownloadProgressHandler
): Promise<void> {
  if (deliveryIds.length === 0) return;

  logger.info('Starting bulk PDF download', { data: { count: deliveryIds.length } });

  onProgress?.({ done: 0, total: deliveryIds.length, stage: 'fetching' });
  const deliveries = await getDeliveriesForPdfBulk(deliveryIds);

  if (deliveries.length === 0) {
    throw new Error('No se encontraron entregas para descargar');
  }

  const blobs = await renderPdfsConcurrently(deliveries, onProgress);

  onProgress?.({ done: deliveries.length, total: deliveries.length, stage: 'zipping' });
  const zip = new JSZip();
  const rawNames = deliveries.map(buildFileName);
  const uniqueNames = dedupeFileNames(rawNames);
  uniqueNames.forEach((name, i) => zip.file(name, blobs[i]));

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  const zipName = `Constancias_EPP_${moment().format('YYYY-MM-DD_HHmm')}.zip`;
  triggerBrowserDownload(zipBlob, zipName);

  onProgress?.({ done: deliveries.length, total: deliveries.length, stage: 'done' });
  logger.info('Bulk PDF download finished', { data: { count: deliveries.length, fileName: zipName } });
}
