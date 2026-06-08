import { create } from 'zustand';

/**
 * Modo de apertura del formulario de fila del parte diario.
 * - 'full': edición/creación completa de la fila.
 * - 'resources': solo asignación de personal y equipos (resto de campos bloqueado).
 */
export type DailyReportRowFormMode = 'full' | 'resources';

interface DailyReportDetailFormStore {
  isOpen: boolean;
  editingRowId: string | null;
  mode: DailyReportRowFormMode;
  open: (rowId?: string, mode?: DailyReportRowFormMode) => void;
  close: () => void;
}

export const useDailyReportDetailFormStore = create<DailyReportDetailFormStore>((set) => ({
  isOpen: false,
  editingRowId: null,
  mode: 'full',
  open: (rowId, mode = 'full') => set({ isOpen: true, editingRowId: rowId ?? null, mode }),
  close: () => set({ isOpen: false, editingRowId: null, mode: 'full' }),
}));
