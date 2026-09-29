/**
 * PDFs de la demo: una hoja con membrete de la empresa, el tipo de documento, el recurso al
 * que pertenece y sus fechas, y la leyenda de que es un documento de demostracion.
 *
 * pdf-lib con Helvetica estandar: sin fuentes externas ni React, y Helvetica cubre Latin-1
 * (tildes y enie). Cada PDF pesa unos pocos KB.
 */
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from 'pdf-lib';

export interface DocSheet {
  companyName: string;
  companyCuit: string;
  title: string;
  /** Pares etiqueta/valor del cuerpo del documento. */
  fields: Array<[string, string]>;
  /** Texto libre debajo de los campos. */
  body?: string;
  /** Codigo que se imprime al pie (numero de documento, poliza, etc.). */
  reference: string;
}

const BRAND = rgb(0.07, 0.29, 0.45);
const MUTED = rgb(0.42, 0.45, 0.5);

/** Helvetica estandar solo codifica WinAnsi: se descarta lo que no entra (emojis, etc.). */
function safe(text: string): string {
  return text.replace(/[^ -ÿ]/g, '');
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of safe(text).split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function header(page: PDFPage, bold: PDFFont, regular: PDFFont, sheet: DocSheet): void {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: BRAND });
  page.drawText(safe(sheet.companyName), { x: 40, y: height - 48, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText(safe(`CUIT ${sheet.companyCuit}  ·  Neuquén, Argentina`), {
    x: 40,
    y: height - 70,
    size: 10,
    font: regular,
    color: rgb(0.85, 0.9, 0.95),
  });
}

export async function renderDocSheet(sheet: DocSheet): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`${sheet.title} - ${sheet.companyName}`));
  pdf.setProducer('Demo');
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  header(page, bold, regular, sheet);

  page.drawText(safe(sheet.title.toUpperCase()), { x: 40, y: height - 140, size: 16, font: bold, color: BRAND });
  page.drawLine({ start: { x: 40, y: height - 150 }, end: { x: width - 40, y: height - 150 }, thickness: 1, color: BRAND });

  let y = height - 185;
  for (const [label, value] of sheet.fields) {
    page.drawText(safe(label), { x: 40, y, size: 10, font: bold, color: MUTED });
    page.drawText(safe(value), { x: 200, y, size: 11, font: regular });
    y -= 24;
  }

  if (sheet.body) {
    y -= 12;
    for (const line of wrap(sheet.body, regular, 10.5, width - 80)) {
      page.drawText(line, { x: 40, y, size: 10.5, font: regular, lineHeight: 14 });
      y -= 15;
    }
  }

  // Firma y sello
  page.drawLine({ start: { x: width - 230, y: 180 }, end: { x: width - 40, y: 180 }, thickness: 0.8, color: MUTED });
  page.drawText('Firma y sello', { x: width - 170, y: 166, size: 9, font: regular, color: MUTED });
  page.drawCircle({ x: 130, y: 190, size: 42, borderColor: BRAND, borderWidth: 1.5, opacity: 0 });
  page.drawText('VERIFICADO', { x: 99, y: 187, size: 10, font: bold, color: BRAND });

  // Marca de agua de demo
  page.drawText('DOCUMENTO DE DEMOSTRACIÓN', {
    x: 95,
    y: 330,
    size: 34,
    font: bold,
    color: rgb(0.85, 0.2, 0.2),
    opacity: 0.12,
    rotate: degrees(35),
  });

  page.drawText(safe(`Ref. ${sheet.reference}  ·  Documento de demostración sin validez legal`), {
    x: 40,
    y: 40,
    size: 8.5,
    font: regular,
    color: MUTED,
  });

  return pdf.save({ useObjectStreams: true });
}
