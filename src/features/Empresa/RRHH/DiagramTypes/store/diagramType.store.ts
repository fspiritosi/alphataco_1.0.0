import { create } from 'zustand';
import type { DiagramTypeListItem } from '../actions.server';

interface DiagramTypeState {
  diagramType: DiagramTypeListItem | null;
  setDiagramType: (diagramType: DiagramTypeListItem | null) => void;
}

export const useDiagramTypeStore = create<DiagramTypeState>((set) => ({
  diagramType: null,
  setDiagramType: (diagramType: DiagramTypeListItem | null) => set({ diagramType }, false),
}));
