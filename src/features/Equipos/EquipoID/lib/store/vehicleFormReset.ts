import { create } from 'zustand';

interface VehicleFormResetState {
  resetTrigger: number;
  triggerReset: () => void;
}

/**
 * Store para manejar el reset del formulario de vehículos
 * Utiliza un contador para triggear el reset desde cualquier componente
 */
export const useVehicleFormReset = create<VehicleFormResetState>((set, get) => ({
  resetTrigger: 0,
  triggerReset: () => {
    set({ resetTrigger: get().resetTrigger + 1 });
  },
}));
