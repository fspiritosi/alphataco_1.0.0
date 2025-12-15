import { create } from 'zustand';
import { KPI } from '../types';

interface KpiState {
  kpi: KPI | null;
  setKpi: (kpi: KPI | null) => void;
}

export const useKpiStore = create<KpiState>((set) => ({
  kpi: null,
  setKpi: (kpi: KPI | null) => set({ kpi }, false),
}));
