import { create } from 'zustand';
import type { Workshop } from '../../../../actions/workshops.server';

interface TalleresState {
  workshop: Workshop | null;
  setWorkshop: (workshop: Workshop | null) => void;
}

export const useTalleresStore = create<TalleresState>((set) => ({
  workshop: null,
  setWorkshop: (workshop: Workshop | null) => set({ workshop }, false),
}));
