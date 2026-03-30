import { create } from 'zustand';
import type { ContractTypeListItem } from '../actions.server';

interface ContractTypeState {
  contractType: ContractTypeListItem | null;
  setContractType: (contractType: ContractTypeListItem | null) => void;
}

export const useContractTypeStore = create<ContractTypeState>((set) => ({
  contractType: null,
  setContractType: (contractType: ContractTypeListItem | null) => set({ contractType }, false),
}));
