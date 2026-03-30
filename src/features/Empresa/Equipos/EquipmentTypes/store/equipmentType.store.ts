import { create } from 'zustand';
import type { EquipmentTypeListItem } from '../actions.server';

interface EquipmentTypeState {
  /** El tipo seleccionado para edición (null = modo creación) */
  equipmentType: EquipmentTypeListItem | null;
  setEquipmentType: (item: EquipmentTypeListItem | null) => void;
}

export const useEquipmentTypeStore = create<EquipmentTypeState>((set) => ({
  equipmentType: null,
  setEquipmentType: (item) => set({ equipmentType: item }, false),
}));
