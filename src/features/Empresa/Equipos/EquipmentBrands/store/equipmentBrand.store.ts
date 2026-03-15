import { create } from 'zustand';
import type { EquipmentBrandListItem } from '../actions.server';

interface EquipmentBrandState {
  equipmentBrand: EquipmentBrandListItem | null;
  setEquipmentBrand: (item: EquipmentBrandListItem | null) => void;
}

export const useEquipmentBrandStore = create<EquipmentBrandState>((set) => ({
  equipmentBrand: null,
  setEquipmentBrand: (item: EquipmentBrandListItem | null) => set({ equipmentBrand: item }, false),
}));
