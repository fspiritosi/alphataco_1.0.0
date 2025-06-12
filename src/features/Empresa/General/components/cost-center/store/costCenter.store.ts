import { create } from 'zustand';

interface CostCenterState {
  costCenter: CostCenter | null;
  setCostCenter: (costCenter: CostCenter | null) => void;
}

export const useCostCenterStore = create<CostCenterState>((set) => ({
  costCenter: null,
  setCostCenter: (costCenter: CostCenter | null) => set({ costCenter }, false),
}));
