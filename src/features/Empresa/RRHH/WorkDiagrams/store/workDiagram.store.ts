import { create } from 'zustand';
import type { WorkDiagramListItem } from '../actions.server';

interface WorkDiagramState {
  workDiagram: WorkDiagramListItem | null;
  setWorkDiagram: (workDiagram: WorkDiagramListItem | null) => void;
}

export const useWorkDiagramStore = create<WorkDiagramState>((set) => ({
  workDiagram: null,
  setWorkDiagram: (workDiagram: WorkDiagramListItem | null) => set({ workDiagram }, false),
}));
