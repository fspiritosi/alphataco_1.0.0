import { create } from 'zustand';

/** Fila del parte diario que abre el formulario en modo edición (shape mínimo que lee el form). */
export interface DailyReportFormRow {
  id?: string;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  working_day?: string | null;
  status?: string;
  remit_number?: string | null;
  description?: string | null;
  completed_day?: boolean | null;
  completed_night?: boolean | null;
  data_to_clone?: {
    customer_id?: string | null;
    service_id?: string | null;
    item_id?: string;
    sector_service_id?: string | null;
    areas_service_id?: string | null;
    type_service?: 'mensual' | 'adicional' | 'adicional_permanente';
  };
  employees_references?: Array<{ id?: string | null }> | null;
  equipment_references?: Array<{ id?: string | null }> | null;
  customer_equipment?: Array<{ id?: string | null }> | null;
}

interface DailyReportFormState {
  isOpen: boolean;
  selectedRow: DailyReportFormRow | null;
  isCreating: boolean;

  // Acciones
  openForCreate: () => void;
  openForEdit: (row: DailyReportFormRow) => void;
  close: () => void;
  reset: () => void;
}

export const useDailyReportFormStore = create<DailyReportFormState>((set) => ({
  isOpen: false,
  selectedRow: null,
  isCreating: false,

  openForCreate: () => set({ isOpen: true, isCreating: true, selectedRow: null }),

  openForEdit: (row) => set({ isOpen: true, isCreating: false, selectedRow: row }),

  close: () => set({ isOpen: false }),

  reset: () => set({ isOpen: false, selectedRow: null, isCreating: false }),
}));
