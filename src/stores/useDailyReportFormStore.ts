import { create } from 'zustand';

interface DailyReportFormState {
  isOpen: boolean;
  selectedRow: any | null;
  isCreating: boolean;

  // Acciones
  openForCreate: () => void;
  openForEdit: (row: any) => void;
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
