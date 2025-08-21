import { create } from 'zustand';

interface EmployeeFormResetState {
  resetTrigger: number;
  triggerReset: () => void;
}

/**
 * Store para manejar el reset del formulario de empleados
 * Utiliza un contador para triggear el reset desde cualquier componente
 */
export const useEmployeeFormReset = create<EmployeeFormResetState>((set, get) => ({
  resetTrigger: 0,
  triggerReset: () => {
    set({ resetTrigger: get().resetTrigger + 1 });
  },
}));
