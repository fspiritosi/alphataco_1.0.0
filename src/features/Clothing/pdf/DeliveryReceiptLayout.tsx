'use client';

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import moment from 'moment';
import type { DeliveryPdfData } from '../actions/actionsServer';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_ROWS = 15;
const LOGO_URL = 'https://vvrckjjyrwqzpbaatemz.supabase.co/storage/v1/object/public/logo/30709694363.png';

// ============================================================================
// HELPERS
// ============================================================================

/** Format CUIT with dashes: 30709694363 → 30-70969436-3 */
function formatCuit(cuit: string): string {
  const clean = cuit.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  }
  return cuit;
}

// ============================================================================
// STYLES
// ============================================================================

const border = '0.75pt solid #000';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  // ── Header row 1: Logo | empty | Meta ─────────────────────────────────────
  headerRow1: {
    flexDirection: 'row',
    borderTop: border,
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    minHeight: 42,
  },
  logoCell: {
    width: '18%',
    borderRight: border,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 75,
    height: 38,
    objectFit: 'contain',
  },
  headerMiddle: {
    width: '62%',
    borderRight: border,
  },
  metaCell: {
    width: '20%',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 8,
    textAlign: 'right',
    marginBottom: 1,
  },
  // ── Header row 2: Full-width title ────────────────────────────────────────
  titleRow: {
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  // ── Info rows (company, worker, etc.) ─────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    minHeight: 16,
  },
  infoCell: {
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCellBorder: {
    borderRight: border,
  },
  labelBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  labelNormal: {
    fontSize: 8,
  },
  labelBoldValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  // ── Table ─────────────────────────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fce4b5',
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    minHeight: 28,
  },
  tableDataRow: {
    flexDirection: 'row',
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    minHeight: 16,
  },
  // Column widths — MUST total 100%
  // 3.5 + 13 + 16 + 5 + 7 + 9 + 3 + 3 + 4 + 10 + 18 + 4 + 4.5 = 100
  colNum: { width: '3.5%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colProducto: { width: '13%', borderRight: border, padding: 2, justifyContent: 'center', alignItems: 'center' },
  colTipoModelo: { width: '16%', borderRight: border, padding: 2, justifyContent: 'center', alignItems: 'center' },
  colTalle: { width: '5%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colCodigo: { width: '7%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colMarca: { width: '9%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colCertSi: { width: '3%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colCertNo: { width: '3%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colCant: { width: '4%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colFecha: { width: '10%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colFirma: { width: '18%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colRepSi: { width: '4%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  colRepNo: { width: '4.5%', borderRight: border, padding: 1, justifyContent: 'center', alignItems: 'center' },
  // Cert + Rep grouped headers (must match sub-column sums)
  colCertHeader: {
    width: '6%', // 3% + 3%
    borderRight: border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colRepHeader: {
    width: '8.5%', // 4% + 4.5%
    borderRight: border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderTop: border,
    marginTop: 1,
    paddingTop: 1,
  },
  // ── Text styles ───────────────────────────────────────────────────────────
  cellText: {
    fontSize: 7,
    textAlign: 'center',
  },
  cellTextBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  headerCellText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  // ── Footer / Legal ────────────────────────────────────────────────────────
  legalSection: {
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    padding: 4,
  },
  legalTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
  },
  legalText: {
    fontSize: 6.5,
    fontStyle: 'italic',
    lineHeight: 1.4,
    marginBottom: 1,
  },
  observationRow: {
    flexDirection: 'row',
    borderLeft: border,
    borderRight: border,
    borderBottom: border,
    padding: 3,
  },
  observationText: {
    fontSize: 6,
    lineHeight: 1.3,
    textDecoration: 'underline',
  },
  legalFooterText: {
    fontSize: 6,
    lineHeight: 1.3,
  },
  quedoNotificado: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    backgroundColor: '#ffff00',
    padding: 2,
  },
  signatureImage: {
    width: 55,
    height: 22,
    objectFit: 'contain',
  },
});

// ============================================================================
// PROPS
// ============================================================================

interface DeliveryReceiptLayoutProps {
  data: DeliveryPdfData;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeliveryReceiptLayout({ data }: DeliveryReceiptLayoutProps) {
  const employee = data.employees_clothing_deliveries_employee_idToemployees;
  const comp = data.company;
  const items = data.clothing_delivery_items;
  const isReplacement = data.delivery_type === 'REPLACEMENT';
  const deliveredAtFormatted = moment(data.delivered_at).format('DD/MM/YYYY');

  // Build 15 rows (empty rows for unfilled space)
  const rows = Array.from({ length: TOTAL_ROWS }, (_, i) => {
    const item = items[i];
    if (!item) return null;
    return {
      producto: item.clothing_items?.name ?? '',
      tipoModelo: item.clothing_items?.description ?? '',
      talle: item.clothing_sizes?.name ?? '',
      codigo: item.clothing_items?.code ?? '',
      marca: item.clothing_brands?.name ?? '',
      cantidad: item.quantity,
      hasCertificate: item.has_certificate ?? false,
    };
  });

  const cuitFormatted = comp?.company_cuit ? formatCuit(comp.company_cuit) : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── HEADER ROW 1: Logo | (empty) | Meta ────────────────── */}
        <View style={styles.headerRow1}>
          <View style={styles.logoCell}>
            <Image style={styles.logo} src={comp?.company_logo || LOGO_URL} />
          </View>
          <View style={styles.headerMiddle} />
          <View style={styles.metaCell}>
            <Text style={styles.metaText}>RG 12-4</Text>
            <Text style={styles.metaText}>{moment().format('DD/MM/YYYY')}</Text>
            <Text style={styles.metaText}>Rev. 4</Text>
          </View>
        </View>

        {/* ── HEADER ROW 2: Full-width title ─────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>
            CONSTANCIA DE ENTREGA DE ROPA DE TRABAJO Y ELEMENTOS DE PROTECCION PERSONAL
          </Text>
        </View>

        {/* ── COMPANY INFO ROW 1: Razon Social | CUIT ────────────── */}
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '65%' }]}>
            <Text>
              <Text style={styles.labelBold}>Razon Social: </Text>
              <Text style={styles.labelBoldValue}>{comp?.company_name ?? ''}</Text>
            </Text>
          </View>
          <View style={[styles.infoCell, { width: '35%' }]}>
            <Text>
              <Text style={styles.labelBold}>CUIT: </Text>
              <Text style={styles.labelBoldValue}>{cuitFormatted}</Text>
            </Text>
          </View>
        </View>

        {/* ── COMPANY INFO ROW 2: Direccion | Localidad | CP | Prov ── */}
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '35%' }]}>
            <Text>
              <Text style={styles.labelBold}>Direccion: </Text>
              <Text style={styles.labelBoldValue}>{comp?.address ?? ''}</Text>
            </Text>
          </View>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '25%' }]}>
            <Text>
              <Text style={styles.labelBold}>Localidad: </Text>
              <Text style={styles.labelBoldValue}>{comp?.cities?.name?.toUpperCase() ?? ''}</Text>
            </Text>
          </View>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '12%' }]}>
            <Text>
              <Text style={styles.labelBold}>CP:</Text>
              <Text style={styles.labelNormal}>{employee?.postal_code ?? ''}</Text>
            </Text>
          </View>
          <View style={[styles.infoCell, { width: '28%' }]}>
            <Text>
              <Text style={styles.labelBold}>Provincia: </Text>
              <Text style={styles.labelBoldValue}>{comp?.provinces?.name?.toUpperCase() ?? ''}</Text>
            </Text>
          </View>
        </View>

        {/* ── WORKER: Name | DNI | Legajo ────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '55%' }]}>
            <Text>
              <Text style={styles.labelBold}>Nombre y Apellido del Trabajador: </Text>
              <Text style={styles.labelNormal}>{employee ? `${employee.lastname} ${employee.firstname}` : ''}</Text>
            </Text>
          </View>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '25%' }]}>
            <Text>
              <Text style={styles.labelBold}>DNI: </Text>
              <Text style={styles.labelNormal}>{employee?.document_number ?? ''}</Text>
            </Text>
          </View>
          <View style={[styles.infoCell, { width: '20%' }]}>
            <Text>
              <Text style={styles.labelBold}>LEGAJO: </Text>
              <Text style={styles.labelNormal}>{employee?.file ?? ''}</Text>
            </Text>
          </View>
        </View>

        {/* ── PUESTO ─────────────────────────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, { width: '100%' }]}>
            <Text>
              <Text style={styles.labelBold}>Puesto que desempena:</Text>
              <Text style={styles.labelNormal}> {employee?.company_positions?.name ?? ''}</Text>
            </Text>
          </View>
        </View>

        {/* ── EPP NECESARIOS ─────────────────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, styles.infoCellBorder, { width: '40%' }]}>
            <Text style={styles.labelBold}>EPP Necesarios para el trabajador segun puesto de trabajo</Text>
          </View>
          <View style={[styles.infoCell, { width: '60%' }]}>
            <Text style={styles.labelNormal}>
              {items
                .map((i) => i.clothing_items?.name ?? '')
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
        </View>

        {/* ── TABLE HEADER ───────────────────────────────────────── */}
        <View style={styles.tableHeaderRow}>
          <View style={styles.colNum}>
            <Text style={styles.headerCellText}> </Text>
          </View>
          <View style={styles.colProducto}>
            <Text style={styles.headerCellText}>Producto</Text>
          </View>
          <View style={styles.colTipoModelo}>
            <Text style={styles.headerCellText}>Tipo / Modelo</Text>
          </View>
          <View style={styles.colTalle}>
            <Text style={styles.headerCellText}>Talle</Text>
          </View>
          <View style={styles.colCodigo}>
            <Text style={[styles.headerCellText, { fontSize: 6 }]}>Codigo</Text>
          </View>
          <View style={styles.colMarca}>
            <Text style={styles.headerCellText}>Marca</Text>
          </View>
          {/* Posee Certificado */}
          <View style={styles.colCertHeader}>
            <Text style={[styles.headerCellText, { fontSize: 5.5 }]}>Posee{'\n'}Certificado</Text>
            <View style={styles.subHeaderRow}>
              <Text style={[styles.headerCellText, { fontSize: 6 }]}>SI</Text>
              <Text style={[styles.headerCellText, { fontSize: 6 }]}>NO</Text>
            </View>
          </View>
          <View style={styles.colCant}>
            <Text style={styles.headerCellText}>Cant</Text>
          </View>
          <View style={styles.colFecha}>
            <Text style={[styles.headerCellText, { fontSize: 6 }]}>Fecha de{'\n'}Entrega</Text>
          </View>
          <View style={styles.colFirma}>
            <Text style={[styles.headerCellText, { fontSize: 6 }]}>Firma del{'\n'}Trabajador</Text>
          </View>
          {/* Reposicion */}
          <View style={styles.colRepHeader}>
            <Text style={[styles.headerCellText, { fontSize: 5.5 }]}>Reposicion</Text>
            <View style={styles.subHeaderRow}>
              <Text style={[styles.headerCellText, { fontSize: 6 }]}>SI</Text>
              <Text style={[styles.headerCellText, { fontSize: 6 }]}>NO</Text>
            </View>
          </View>
        </View>

        {/* ── TABLE DATA ROWS ────────────────────────────────────── */}
        {rows.map((row, i) => (
          <View key={i} style={styles.tableDataRow}>
            <View style={styles.colNum}>
              <Text style={styles.cellTextBold}>{i + 1}</Text>
            </View>
            <View style={styles.colProducto}>
              <Text style={styles.cellText}>{row?.producto ?? ''}</Text>
            </View>
            <View style={styles.colTipoModelo}>
              <Text style={styles.cellText}>{row?.tipoModelo ?? ''}</Text>
            </View>
            <View style={styles.colTalle}>
              <Text style={styles.cellText}>{row?.talle ?? ''}</Text>
            </View>
            <View style={styles.colCodigo}>
              <Text style={styles.cellText}>{row?.codigo ?? ''}</Text>
            </View>
            <View style={styles.colMarca}>
              <Text style={styles.cellText}>{row?.marca ?? ''}</Text>
            </View>
            {/* Certificado */}
            <View style={styles.colCertSi}>
              <Text style={styles.cellText}>{row?.hasCertificate ? 'X' : ''}</Text>
            </View>
            <View style={styles.colCertNo}>
              <Text style={styles.cellText}>{row && !row.hasCertificate ? 'X' : ''}</Text>
            </View>
            <View style={styles.colCant}>
              <Text style={styles.cellText}>{row ? row.cantidad : ''}</Text>
            </View>
            <View style={styles.colFecha}>
              <Text style={styles.cellText}>{row ? deliveredAtFormatted : ''}</Text>
            </View>
            <View style={styles.colFirma}>
              {row && data.signature_url ? <Image style={styles.signatureImage} src={data.signature_url} /> : null}
            </View>
            {/* Reposicion */}
            <View style={styles.colRepSi}>
              <Text style={styles.cellText}>{row && isReplacement ? 'X' : ''}</Text>
            </View>
            <View style={styles.colRepNo}>
              <Text style={styles.cellText}>{row && !isReplacement ? 'X' : ''}</Text>
            </View>
          </View>
        ))}

        {/* ── LEGAL / INFO ADICIONAL ─────────────────────────────── */}
        <View style={styles.legalSection}>
          <Text style={styles.legalTitle}>
            {'Informacion adicional: '}
            <Text style={styles.legalText}>
              Me comprometo a usar los elementos recibidos en forma obligatoria durante todo el horario de trabajo y
              exclusivamente dentro de la empresa.
            </Text>
          </Text>
          <Text style={styles.legalText}>
            El no uso de los mismos permitira se me apliquen las sanciones disciplinarias correspondientes por no
            cumplir con las normas de seguridad
          </Text>
          <Text style={styles.legalText}>
            Asimismo me comprometo a extremar las medidas necesarias para conservar y mantener en buen estado esos
            elementos. Informando a la supervision en forma inmediata cualquier anormalidad o extravio
          </Text>
        </View>

        {/* ── OBSERVATION + LEGAL FOOTER ──────────────────────────── */}
        <View style={styles.observationRow}>
          <View style={{ width: '65%' }}>
            <Text style={styles.observationText}>
              Observacion: el &quot;codigo&quot; solicitado en la planilla es aplicable para la ropa de trabajo
            </Text>
            <Text style={styles.legalFooterText}>
              Segun Resolucion 299/11 de la Superintendencia de Riesgo de Trabajo este formulario sera de utilizacion
              obligatoria por parte de los empleadores, donde se registraran las respectivas entregas de ropa de trabajo
              y Elementos de Proteccion Personal.
            </Text>
          </View>
          <View style={{ width: '35%', alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={styles.quedoNotificado}>Quedo notificado:</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
