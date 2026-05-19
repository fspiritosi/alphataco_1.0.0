import { create } from 'zustand';

interface DailyReportDetailFormStore {
  isOpen: boolean;
  editingRowId: string | null;
  open: (rowId?: string) => void;
  close: () => void;
}

export const useDailyReportDetailFormStore = create<DailyReportDetailFormStore>((set) => ({
  isOpen: false,
  editingRowId: null,
  open: (rowId) => set({ isOpen: true, editingRowId: rowId ?? null }),
  close: () => set({ isOpen: false, editingRowId: null }),
}));
