// Re-exportar tipos de las acciones
export type {
  AvailableDocument,
  AvailableRemito,
  RemitDocument,
  Remito,
  RemitoWithDocuments,
} from '../actions/actionsClient';

// Tipos adicionales para el frontend
export interface RemitosManagerProps {
  dailyReportRowId: string;
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface RemitTabProps {
  remito: any; // RemitoWithDocuments
  isActive: boolean;
  onActivate: () => void;
  customerName?: string;
  dailyReportRowId: string;
}

export interface AddRemitDialogProps {
  dailyReportRowId: string;
  isOpen: boolean;
  onClose: () => void;
  existingNumbers: string[];
  onRemitoCreated?: (remitoId: string) => void;
}

export interface DocumentUploadAreaProps {
  remitId: string;
  dailyReportRowId: string;
  customerName?: string;
}

export interface DocumentViewerProps {
  document: any; // RemitDocument
  dailyReportRowId: string;
  customerName?: string;
}

// Constantes
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
