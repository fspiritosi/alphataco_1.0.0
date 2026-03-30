export interface DailyReportRowHistoryRecord {
  id: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LINK' | 'UNLINK';
  created_at: string;
  changed_by: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  } | null;
  changed_fields?: Record<string, { old: any; new: any }>;
  related_table: string;
  related_id: string;
  changed_data?: any;
  reassignment_reason?: string | null;
}

// También definimos un tipo para el historial procesado que retornamos
export interface ProcessedHistoryEntry {
  id: string;
  preparte: {
    id: string;
    numero_pedido: string | null;
  } | null;
  actionType: string;
  timestamp: string;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  changes: Array<any>;
  relatedTable: string;
  relatedId: string;
  message: string;
  reassignment_reason: string | null | undefined;
  displayTime: string;
}
