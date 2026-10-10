import 'server-only';
import type { Styles } from '@react-pdf/renderer';
import type { PdfLogo, ReactPdf } from './PurchasePdfDocuments';
import type { PaymentPdfData } from './payment-pdf-data';

/**
 * PDF de la orden de pago y, a continuacion, un certificado por cada retencion numerada (spec
 * Compras etapa 5 §4). Mismo criterio que los PDF de Compras: monocromo, Helvetica, montos a la
 * derecha; react-pdf llega por parametro.
 */

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
  logo: { width: 90, height: 36, objectFit: 'contain', marginRight: 10 },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headerRight: { width: 190, alignItems: 'flex-end' },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: C.muted },
  box: { borderWidth: 1, borderColor: C.rule, padding: 6, marginBottom: 10 },
  boxTitle: { fontSize: 7, color: C.muted, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  bold: { fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 6, marginBottom: 3 },
  tableHead: { flexDirection: 'row', backgroundColor: C.band, borderBottomWidth: 1, borderBottomColor: C.ink, paddingVertical: 3 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingVertical: 3 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 7, paddingHorizontal: 3 },
  td: { paddingHorizontal: 3 },
  colMain: { flex: 1 },
  colMid: { width: 120 },
  colAmount: { width: 90, textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: 240, marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.ink, paddingTop: 3, marginTop: 2 },
  kv: { flexDirection: 'row', marginBottom: 3 },
  kvLabel: { width: 130, color: C.muted },
  kvValue: { flex: 1 },
  signature: { marginTop: 50, alignSelf: 'flex-end', width: 200, borderTopWidth: 0.5, borderTopColor: C.ink, paddingTop: 3, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, textAlign: 'center', fontSize: 7, color: C.muted },
} satisfies Styles;

function Header(rp: ReactPdf, data: PaymentPdfData, logo: PdfLogo, title: string, number: string) {
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
        <Text style={s.title}>{title}</Text>
        <Text style={s.bold}>N° {number}</Text>
        <Text>Fecha: {data.date}</Text>
      </View>
    </View>
  );
}

function Kv(rp: ReactPdf, label: string, value: string) {
  const { View, Text } = rp;
  return (
    <View style={s.kv}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue}>{value}</Text>
    </View>
  );
}

export function PaymentOrderPdfDocument(rp: ReactPdf, data: PaymentPdfData, logo: PdfLogo) {
  const { Document, Page, View, Text } = rp;
  return (
    <Document title={data.number}>
      <Page size="A4" style={s.page}>
        {data.watermark ? (
          <Text style={s.watermark} fixed>
            {data.watermark}
          </Text>
        ) : null}
        {Header(rp, data, logo, data.title, data.number)}
        <View style={s.box}>
          <Text style={s.boxTitle}>PROVEEDOR</Text>
          <Text style={s.bold}>{data.supplier.name}</Text>
          <Text>
            CUIT {data.supplier.cuit}
            {data.supplier.vatCondition ? ` · ${data.supplier.vatCondition}` : ''}
          </Text>
          {data.supplier.address ? <Text style={s.muted}>{data.supplier.address}</Text> : null}
        </View>

        <Text style={s.sectionTitle}>Qué se paga</Text>
        <View style={s.tableHead}>
          <Text style={[s.th, s.colMain]}>Concepto</Text>
          <Text style={[s.th, s.colAmount]}>Importe</Text>
        </View>
        {data.lines.map((line, i) => (
          <View key={i} style={s.tableRow} wrap={false}>
            <Text style={[s.td, s.colMain]}>{line.concept}</Text>
            <Text style={[s.td, s.colAmount]}>{line.amount}</Text>
          </View>
        ))}

        {data.withholdings.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Retenciones</Text>
            <View style={s.tableHead}>
              <Text style={[s.th, s.colMain]}>Impuesto</Text>
              <Text style={[s.th, s.colMid]}>Certificado</Text>
              <Text style={[s.th, s.colAmount]}>Importe</Text>
            </View>
            {data.withholdings.map((w, i) => (
              <View key={i} style={s.tableRow} wrap={false}>
                <Text style={[s.td, s.colMain]}>{w.tax}</Text>
                <Text style={[s.td, s.colMid]}>{w.certificate}</Text>
                <Text style={[s.td, s.colAmount]}>{w.amount}</Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Comprobantes</Text>
            <Text>{data.totals.invoices}</Text>
          </View>
          {data.totals.hasAdvance ? (
            <View style={s.totalRow}>
              <Text>Anticipo</Text>
              <Text>{data.totals.advance}</Text>
            </View>
          ) : null}
          {data.totals.hasCredits ? (
            <View style={s.totalRow}>
              <Text>Notas de crédito y anticipos aplicados</Text>
              <Text>-{data.totals.credits}</Text>
            </View>
          ) : null}
          <View style={s.totalRow}>
            <Text>Retenciones</Text>
            <Text>-{data.totals.withholdings}</Text>
          </View>
          <View style={s.grandTotal}>
            <Text style={s.bold}>Neto pagado</Text>
            <Text style={s.bold}>{data.totals.net}</Text>
          </View>
        </View>

        {data.payments.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Medios de pago</Text>
            {data.payments.map((p, i) => (
              <View key={i} style={s.tableRow} wrap={false}>
                <Text style={[s.td, s.colMid]}>{p.method}</Text>
                <Text style={[s.td, s.colMain]}>{p.detail}</Text>
                <Text style={[s.td, s.colAmount]}>{p.amount}</Text>
              </View>
            ))}
          </>
        ) : null}

        {data.notes ? (
          <View style={[s.box, { marginTop: 10 }]}>
            <Text style={s.boxTitle}>OBSERVACIONES</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${data.number} · Página ${pageNumber} de ${totalPages}`} />
      </Page>

      {data.certificates.map((c) => (
        <Page key={c.number} size="A4" style={s.page}>
          {c.cancelled ? (
            <Text style={s.watermark} fixed>
              ANULADO
            </Text>
          ) : null}
          {Header(rp, data, logo, 'CERTIFICADO DE RETENCIÓN', c.number)}
          <View style={s.box}>
            <Text style={s.boxTitle}>AGENTE DE RETENCIÓN</Text>
            <Text style={s.bold}>{c.agent.name}</Text>
            <Text>CUIT {c.agent.cuit}</Text>
            {c.agent.grossIncomeNumber ? <Text>Ingresos Brutos N° {c.agent.grossIncomeNumber}</Text> : null}
            {c.agent.address ? <Text style={s.muted}>{c.agent.address}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.boxTitle}>SUJETO RETENIDO</Text>
            <Text style={s.bold}>{c.subject.name}</Text>
            <Text>
              CUIT {c.subject.cuit}
              {c.subject.vatCondition ? ` · ${c.subject.vatCondition}` : ''}
            </Text>
            {c.subject.address ? <Text style={s.muted}>{c.subject.address}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.boxTitle}>RETENCIÓN</Text>
            {Kv(rp, 'Impuesto', c.tax)}
            {Kv(rp, 'Régimen', c.regime)}
            {Kv(rp, 'Fecha', c.date)}
            {Kv(rp, 'Orden de pago', c.orderNumber)}
            {Kv(rp, 'Base de cálculo', c.base)}
            {Kv(rp, 'Alícuota', c.rate)}
            {Kv(rp, 'Importe retenido', c.amount)}
          </View>
          <Text style={s.signature}>Firma y aclaración del agente de retención</Text>
          <Text style={s.footer} fixed>
            {c.number} · {data.number}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
