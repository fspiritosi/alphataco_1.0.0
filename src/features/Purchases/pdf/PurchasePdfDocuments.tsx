import 'server-only';
import type { Styles } from '@react-pdf/renderer';
import type { OrderPdfData, QuotePdfData } from './purchase-pdf-data';

/**
 * PDF del pedido de cotizacion y de la orden de compra. Mismo criterio que el PDF fiscal
 * (`InvoicePdfDocument.tsx`): react-pdf se carga fuera del bundle y sus componentes llegan por
 * parametro; monocromo y Helvetica, montos a la derecha.
 */
export type ReactPdf = Pick<typeof import('@react-pdf/renderer'), 'Document' | 'Page' | 'Text' | 'View' | 'Image' | 'renderToBuffer'>;

/** Logo ya leido de MinIO. Sin logo, el membrete va solo con texto. */
export type PdfLogo = { data: Buffer; format: 'png' | 'jpg' } | null;

const C = { ink: '#111111', muted: '#555555', rule: '#999999', band: '#EEEEEE' };

const s = {
  page: { paddingTop: 28, paddingBottom: 44, paddingHorizontal: 32, fontFamily: 'Helvetica', fontSize: 8, color: C.ink },
  watermark: {
    position: 'absolute',
    top: 380,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 40,
    color: '#DDDDDD',
    fontFamily: 'Helvetica-Bold',
    transform: 'rotate(-30deg)',
  },
  header: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.ink, paddingBottom: 8, marginBottom: 10 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  // Ancho y alto fijos en puntos: con porcentajes react-pdf estira la imagen.
  logo: { width: 90, height: 36, objectFit: 'contain', marginRight: 10 },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headerRight: { width: 170, alignItems: 'flex-end' },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: C.muted },
  box: { borderWidth: 1, borderColor: C.rule, padding: 6, marginBottom: 10 },
  boxTitle: { fontSize: 7, color: C.muted, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  bold: { fontFamily: 'Helvetica-Bold' },
  paragraph: { marginBottom: 6 },
  tableHead: { flexDirection: 'row', backgroundColor: C.band, borderBottomWidth: 1, borderBottomColor: C.ink, paddingVertical: 3 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingVertical: 3 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 7, paddingHorizontal: 3 },
  td: { paddingHorizontal: 3 },
  colPos: { width: 22 },
  colItem: { flex: 1 },
  colQty: { width: 70, textAlign: 'right' },
  colPrice: { width: 75, textAlign: 'right' },
  colVat: { width: 40, textAlign: 'right' },
  colNet: { width: 80, textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: 220, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 3, marginTop: 2 },
  kv: { flexDirection: 'row', marginBottom: 2 },
  kvLabel: { width: 95, color: C.muted },
  kvValue: { flex: 1 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'center', fontSize: 7, color: C.muted },
} satisfies Styles;

type Header = Pick<QuotePdfData, 'number' | 'date' | 'company' | 'supplier' | 'title'>;

function HeaderBlock(rp: ReactPdf, data: Header, logo: PdfLogo) {
  const { View, Text, Image } = rp;
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        {logo ? <Image style={s.logo} src={logo} /> : null}
        <View>
          <Text style={s.companyName}>{data.company.name}</Text>
          <Text>CUIT {data.company.cuit}</Text>
          {data.company.address ? <Text style={s.muted}>{data.company.address}</Text> : null}
        </View>
      </View>
      <View style={s.headerRight}>
        <Text style={s.title}>{data.title}</Text>
        <Text style={s.bold}>N° {data.number}</Text>
        <Text>Fecha: {data.date}</Text>
      </View>
    </View>
  );
}

function SupplierBlock(rp: ReactPdf, supplier: Header['supplier']) {
  const { View, Text } = rp;
  return (
    <View style={s.box}>
      <Text style={s.boxTitle}>PROVEEDOR</Text>
      <Text style={s.bold}>{supplier.name}</Text>
      <Text>
        CUIT {supplier.cuit}
        {supplier.vatCondition ? ` · ${supplier.vatCondition}` : ''}
      </Text>
      {supplier.address ? <Text style={s.muted}>{supplier.address}</Text> : null}
    </View>
  );
}

export function PurchaseQuotePdfDocument(rp: ReactPdf, data: QuotePdfData, logo: PdfLogo) {
  const { Document, Page, View, Text } = rp;
  return (
    <Document title={data.number}>
      <Page size="A4" style={s.page}>
        {HeaderBlock(rp, data, logo)}
        {SupplierBlock(rp, data.supplier)}
        <Text style={s.paragraph}>{data.intro}</Text>
        <View style={s.tableHead}>
          <Text style={[s.th, s.colPos]}>#</Text>
          <Text style={[s.th, s.colItem]}>Ítem</Text>
          <Text style={[s.th, s.colQty]}>Cantidad</Text>
        </View>
        {data.lines.map((line) => (
          <View key={line.position} style={s.tableRow} wrap={false}>
            <Text style={[s.td, s.colPos]}>{line.position}</Text>
            <Text style={[s.td, s.colItem]}>{line.item}</Text>
            <Text style={[s.td, s.colQty]}>{line.quantity}</Text>
          </View>
        ))}
        <Text style={[s.paragraph, { marginTop: 10 }]}>{data.request}</Text>
        {data.notes ? (
          <View style={s.box}>
            <Text style={s.boxTitle}>OBSERVACIONES</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${data.number} · Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function PurchaseOrderPdfDocument(rp: ReactPdf, data: OrderPdfData, logo: PdfLogo) {
  const { Document, Page, View, Text } = rp;
  return (
    <Document title={data.number}>
      <Page size="A4" style={s.page}>
        {data.watermark ? (
          <Text style={s.watermark} fixed>
            {data.watermark}
          </Text>
        ) : null}
        {HeaderBlock(rp, data, logo)}
        {SupplierBlock(rp, data.supplier)}
        <View style={s.tableHead}>
          <Text style={[s.th, s.colPos]}>#</Text>
          <Text style={[s.th, s.colItem]}>Ítem</Text>
          <Text style={[s.th, s.colQty]}>Cantidad</Text>
          <Text style={[s.th, s.colPrice]}>Unitario neto</Text>
          <Text style={[s.th, s.colVat]}>IVA</Text>
          <Text style={[s.th, s.colNet]}>Neto</Text>
        </View>
        {data.lines.map((line) => (
          <View key={line.position} style={s.tableRow} wrap={false}>
            <Text style={[s.td, s.colPos]}>{line.position}</Text>
            <Text style={[s.td, s.colItem]}>{line.item}</Text>
            <Text style={[s.td, s.colQty]}>{line.quantity}</Text>
            <Text style={[s.td, s.colPrice]}>{line.unitPrice}</Text>
            <Text style={[s.td, s.colVat]}>{line.vatRate}</Text>
            <Text style={[s.td, s.colNet]}>{line.netTotal}</Text>
          </View>
        ))}
        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Subtotal neto</Text>
            <Text>{data.totals.subtotal}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>IVA</Text>
            <Text>{data.totals.vatTotal}</Text>
          </View>
          <View style={s.grandTotal}>
            <Text style={s.bold}>Total</Text>
            <Text style={s.bold}>{data.totals.total}</Text>
          </View>
        </View>
        {data.conditions.length > 0 ? (
          <View style={[s.box, { marginTop: 10 }]} wrap={false}>
            <Text style={s.boxTitle}>CONDICIONES</Text>
            {data.conditions.map((condition) => (
              <View key={condition.label} style={s.kv}>
                <Text style={s.kvLabel}>{condition.label}</Text>
                <Text style={s.kvValue}>{condition.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {data.notes ? (
          <View style={s.box} wrap={false}>
            <Text style={s.boxTitle}>OBSERVACIONES</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${data.number} · Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}
