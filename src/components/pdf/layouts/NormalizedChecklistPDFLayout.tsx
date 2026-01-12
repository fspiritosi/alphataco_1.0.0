'use client';

import { Document, Image, Page, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { format } from 'date-fns';

interface ChecklistSection {
  id: string;
  code: string;
  name: string;
  order_index: number;
  checklist_template_items: Array<{
    id: string;
    code: string;
    label: string;
    order_index: number;
    is_critical?: boolean;
  }>;
}

interface NormalizedChecklistPDFLayoutProps {
  templateName: string;
  templateCode: string;
  logoUrl?: string;
  sections: ChecklistSection[];
  date?: string;
  revision?: string;
  isEmpty?: boolean;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 12.5,
    paddingBottom: 12.5,
    paddingLeft: 25,
    paddingRight: 25,
    fontSize: 9,
    fontFamily: 'Helvetica',
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 12.5,
    left: 25,
    right: 25,
    bottom: 12.5,
    border: '2pt solid black',
  },
  contentWrapper: {
    position: 'relative',
    height: '100%',
    padding: 0,
  },
});

export const NormalizedChecklistPDFLayout = ({
  templateName,
  templateCode,
  logoUrl,
  sections,
  date,
  revision = 'Rev.:3',
  isEmpty = true,
}: NormalizedChecklistPDFLayoutProps) => {
  const currentDate = date || format(new Date(), 'dd/MM/yyyy');
  const formattedCode = `RO ${templateCode}`;

  // Ordenar secciones por order_index - COMENTADO (no se usa por ahora)
  // const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  // Obtener todos los items críticos - COMENTADO (no se usa por ahora)
  // const criticalItems: Array<{ section: string; item: string; isCritical: boolean }> = [];
  // sortedSections.forEach((section) => {
  //   const sortedItems = [...(section.checklist_template_items || [])].sort(
  //     (a, b) => a.order_index - b.order_index
  //   );
  //   sortedItems.forEach((item) => {
  //     if (item.is_critical) {
  //       criticalItems.push({
  //         section: section.name,
  //         item: item.label,
  //         isCritical: true,
  //       });
  //     }
  //   });
  // });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.border} fixed />
        <View
          style={{ height: 50, width: '100%', display: 'flex', flexDirection: 'row', borderBottom: '2pt solid black' }}
        >
          {/* Primera columna */}
          <View style={{ height: '100%', width: '25%', padding: 2 }}>
            <Image style={{ width: '100%', height: '100%', objectFit: 'contain' }} src={logoUrl} />
          </View>
          {/* Segunda columna */}
          <View style={{ height: '100%', width: '50%', border: '2pt solid black', borderBottom: 0 }}>
            <View style={{ height: '100%', width: '100%' }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: 3,
                }}
              >
                {templateName}
              </Text>
            </View>
            <View
              style={{
                borderTop: '2pt solid black',
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
              }}
            >
              <View style={{ borderRight: '1pt solid black', height: '100%', width: '100%' }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 3,
                  }}
                >
                  Dominio:
                </Text>
              </View>
              <View
                style={{
                  borderLeft: '1pt solid black',
                  display: 'flex',
                  flexDirection: 'row',
                  height: '100%',
                  width: '100%',
                }}
              >
                <View style={{ height: '100%', width: '100%' }}>
                  <View style={{ flexDirection: 'row', paddingTop: 3, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', paddingLeft: 4, marginRight: 4 }}>Simple</Text>
                    <Svg viewBox="0 0 100 100" width="16" height="16">
                      <Rect x="1" y="1" width="98" height="98" fill="none" stroke="black" strokeWidth="3" />
                    </Svg>
                  </View>
                </View>
                <View style={{ height: '100%', width: '100%' }}>
                  <View style={{ flexDirection: 'row', paddingTop: 3, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', paddingLeft: 4, marginRight: 4 }}>Doble</Text>
                    <Svg viewBox="0 0 100 100" width="16" height="16">
                      <Rect x="1" y="1" width="98" height="98" fill="none" stroke="black" strokeWidth="3" />
                    </Svg>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* Tercera columna */}
          <View style={{ height: '100%', width: '25%', borderTop: '2pt solid black', borderRight: '2pt solid black' }}>
            <View style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'row' }}>
              <View style={{ borderRight: '1pt solid black', paddingTop: 3, height: '100%', width: '33.5%' }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 3,
                  }}
                >
                  RO 01-10
                </Text>
              </View>
              <View style={{ paddingTop: 3, borderRight: '1pt solid black', height: '100%', width: '43.5%' }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 3,
                  }}
                >
                  {`${new Date().toLocaleDateString()}`}
                </Text>
              </View>
              <View style={{ height: '100%', width: '25%', paddingTop: 3 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 3,
                  }}
                >
                  Rev.:3
                </Text>
              </View>
            </View>
            <View style={{ borderTop: '2pt solid black', height: '100%', width: '100%' }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: 3,
                }}
              >
                Fluido / material Transportable:
              </Text>
            </View>
          </View>
        </View>
        {/* Seccion de KM  */}
        <View
          style={{ height: 28, borderBottom: '2pt solid black', width: '100%', display: 'flex', flexDirection: 'row' }}
        >
          <View style={{ height: '100%', width: '50%', borderRight: '1pt solid black' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', paddingTop: 6, paddingLeft: 4 }}>KM ACTUAL:</Text>
          </View>
          <View style={{ height: '100%', width: '50%', borderLeft: '1pt solid black' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', paddingTop: 6, paddingLeft: 4 }}>KM PROXIMO SERVICE:</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
