import type { CostCenterListItem } from '../../../CostCenter/actions.server';
import { create } from 'zustand';

interface CostCenterState {
  costCenter: CostCenterListItem | null;
  setCostCenter: (costCenter: CostCenterListItem | null) => void;
}

export const useCostCenterStore = create<CostCenterState>((set) => ({
  costCenter: null,
  setCostCenter: (costCenter: CostCenterListItem | null) => set({ costCenter }, false),
}));
