/**
 * Colores y hoja de estilos del PDF del checklist normalizado.
 *
 * Vive aparte del layout porque es data pura (~460 líneas de `StyleSheet.create`) y su peso
 * dejaba el componente por encima del límite de tamaño del repo.
 */

import { StyleSheet } from '@react-pdf/renderer';

// Colores
export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  headerBg: '#E8E8E8',
  sectionHeaderBg: '#D9D9D9',
  // Colores para estados B/M (sutiles)
  goodBg: '#d4edda', // Verde claro para B (Bien)
  badBg: '#f8d7da', // Rojo claro para M (Mal)
  // Colores para fechas según vencimiento
  expiredBg: '#f8d7da', // Rojo claro - fecha vencida
  warningBg: '#fff3cd', // Amarillo claro - próxima a vencer (≤30 días)
  validBg: '#d4edda', // Verde claro - vigente (>30 días)
};

/** Alto del dibujo de partes: la leyenda de al lado lo iguala, como en el papel. */
export const PARTS_DIAGRAM_HEIGHT = 185;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 15,
    paddingRight: 15,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  // Header principal
  headerContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.black,
  },
  logoContainer: {
    width: '15%',
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: 28,
    objectFit: 'contain',
  },
  titleContainer: {
    width: '55%',
    borderRightWidth: 1,
    borderRightColor: colors.black,
  },
  titleMain: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
  },
  titleSubRow: {
    flexDirection: 'row',
    minHeight: 16,
  },
  titleSubCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start', // Alineado a la izquierda (centrado vertical)
    borderRightWidth: 1,
    borderRightColor: colors.black,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  titleSubCellLast: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start', // Alineado a la izquierda (centrado vertical)
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  titleSubLabel: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
  },
  titleSubValue: {
    fontSize: 5.5,
    marginTop: 1,
  },
  headerInfoContainer: {
    width: '30%',
    flexDirection: 'row',
  },
  headerInfoCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.black,
  },
  headerInfoCellLast: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
  // Referencias
  referencesRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.black,
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: colors.headerBg,
  },
  referencesText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    flex: 1,
  },
  // Tabla principal
  mainTable: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.black,
  },
  mainTableSingleColumn: {
    flexDirection: 'column',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.black,
  },
  column: {
    flex: 1,
  },
  columnLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.black,
  },
  columnFull: {
    width: '100%',
  },
  // Header de sección
  sectionHeader: {
    flexDirection: 'row',
    backgroundColor: colors.sectionHeaderBg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
  },
  sectionHeaderNumber: {
    width: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: colors.black,
    paddingVertical: 1,
  },
  sectionHeaderTitle: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 3,
    paddingVertical: 1,
  },
  sectionHeaderTitleText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  sectionHeaderEstado: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
    paddingVertical: 1,
  },
  sectionHeaderEstadoText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  // Header de estado dividido (IZQ/DER)
  sectionHeaderEstadoSplit: {
    width: 28,
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
  },
  sectionHeaderEstadoSplitTop: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
    paddingVertical: 0.5,
  },
  sectionHeaderEstadoSplitBottom: {
    flexDirection: 'row',
  },
  sectionHeaderEstadoSplitCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0.5,
  },
  sectionHeaderEstadoSplitCellLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0.5,
    borderRightWidth: 0.5,
    borderRightColor: colors.black,
  },
  sectionHeaderEstadoSplitText: {
    fontSize: 5,
    fontFamily: 'Helvetica-Bold',
  },
  // Filas de items
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
    minHeight: 10,
  },
  itemNumber: {
    width: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: colors.black,
    fontSize: 5,
  },
  itemLabel: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 2,
    paddingVertical: 0.5,
  },
  itemLabelText: {
    fontSize: 5.5,
  },
  itemEstado: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
  },
  itemEstadoText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
  },
  // Celda de estado dividida (IZQ/DER)
  itemEstadoSplit: {
    width: 28,
    flexDirection: 'row',
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
  },
  itemEstadoSplitCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemEstadoSplitCellLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: colors.black,
  },
  // Columna OBSERVACIONES por item (solo en plantillas que la usan)
  itemObservacion: {
    width: 110,
    justifyContent: 'center',
    paddingLeft: 2,
    paddingRight: 2,
    paddingVertical: 0.5,
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
  },
  itemObservacionText: {
    fontSize: 5,
  },
  sectionHeaderObservacion: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
  },
  // Items de texto libre: la celda de Estado mide 28 y les corta el valor, así
  // que ocupan también el espacio de Observaciones (que no aplica a un dato).
  itemValorLibre: {
    justifyContent: 'center',
    paddingLeft: 3,
    paddingRight: 3,
    paddingVertical: 0.5,
    borderLeftWidth: 0.5,
    borderLeftColor: colors.black,
  },
  itemValorLibreText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
  },
  // Observaciones
  // Diagrama de partes (replica la hoja de referencia del formulario en papel)
  partesContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.black,
  },
  partesHeader: {
    backgroundColor: colors.sectionHeaderBg,
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
  },
  partesHeaderText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  partesBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  // Medidas fijas en puntos: con anchos porcentuales react-pdf estira la imagen
  // para llenar la fila y deforma el dibujo. 350 x 185 respeta el 1392x736 del JPG.
  partesImage: {
    width: 350,
    height: PARTS_DIAGRAM_HEIGHT,
    objectFit: 'contain',
    borderWidth: 0.5,
    borderColor: colors.black,
  },
  partesLegend: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 6,
  },
  // La leyenda toma la misma altura que el dibujo (como en el papel): las filas
  // se reparten el alto en partes iguales en vez de quedar apiladas arriba.
  partesLegendColumn: {
    flex: 1,
    height: PARTS_DIAGRAM_HEIGHT,
    borderWidth: 0.5,
    borderColor: colors.black,
    borderBottomWidth: 0,
  },
  partesLegendRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
  },
  partesLegendNumber: {
    width: 16,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: colors.headerBg,
    borderRightWidth: 0.5,
    borderRightColor: colors.black,
  },
  partesLegendNumberText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  partesLegendLabel: {
    flex: 1,
    paddingHorizontal: 3,
    fontSize: 6,
  },
  observacionesContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.black,
  },
  observacionesHeader: {
    backgroundColor: colors.sectionHeaderBg,
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
  },
  observacionesHeaderText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  observacionesContent: {
    minHeight: 25,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  observacionesText: {
    fontSize: 6,
  },
  // Nota de elementos críticos
  criticalNote: {
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
  },
  criticalNoteText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  // Fecha
  fechaRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
  },
  fechaLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    marginRight: 4,
  },
  fechaValue: {
    fontSize: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
    minWidth: 60,
    paddingLeft: 3,
  },
  // Firmas
  firmasContainer: {
    flexDirection: 'row',
    paddingTop: 15,
    paddingBottom: 5,
    paddingHorizontal: 15,
  },
  firmaSection: {
    flex: 1,
    alignItems: 'center',
  },
  firmaLine: {
    borderTopWidth: 0.5,
    borderTopColor: colors.black,
    width: '80%',
    marginBottom: 2,
  },
  firmaText: {
    fontSize: 6,
    textAlign: 'center',
  },
  // Nombre del chofer (TODO: reemplazar por imagen de firma cuando esté disponible)
  firmaChoferName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.black,
    paddingBottom: 2,
    width: '80%',
  },
});
