import { create } from 'zustand';
import type { HierarchyListItem } from '../actions.server';

interface HierarchyState {
  hierarchy: HierarchyListItem | null;
  setHierarchy: (hierarchy: HierarchyListItem | null) => void;
}

export const useHierarchyStore = create<HierarchyState>((set) => ({
  hierarchy: null,
  setHierarchy: (hierarchy: HierarchyListItem | null) => set({ hierarchy }, false),
}));
