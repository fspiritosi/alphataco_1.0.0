export { default as PermanentEquipmentDocuments } from './PermanentDocuments';
export { default as PermanentEquipmentDocumentsWrapper } from './PermanentDocumentsWrapper';
export { default as PermanentEquipmentDocumentsTableServer } from './components/PermanentEquipmentDocumentsTableServer';
export {
  fetchAllPermanentEquipmentDocumentsData,
  fetchPermanentEquipmentDocumentsData,
} from './components/lib/actions/actions';
export { columnsPermanentEquipmentDocumentServer } from './components/table-columns';
export type { PermanentEquipmentDocumentData } from './components/table-columns';
