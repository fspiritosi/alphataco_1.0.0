import { create } from 'zustand';
import type { AptitudTecnicaListItem } from '../actions.server';

interface AptitudesState {
  aptitud: AptitudTecnicaListItem | null;
  setAptitud: (aptitud: AptitudTecnicaListItem | null) => void;
}

export const useAptitudesStore = create<AptitudesState>((set) => ({
  aptitud: null,
  setAptitud: (aptitud: AptitudTecnicaListItem | null) => set({ aptitud }, false),
}));
