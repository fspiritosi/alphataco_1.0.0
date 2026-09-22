import { create } from 'zustand';
import type { WorkshopSector } from '../../../../actions/workshops.server';

interface SectoresState {
  sector: WorkshopSector | null;
  setSector: (sector: WorkshopSector | null) => void;
}

export const useSectoresStore = create<SectoresState>((set) => ({
  sector: null,
  setSector: (sector: WorkshopSector | null) => set({ sector }, false),
}));
