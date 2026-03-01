'use client';

import { create } from 'zustand';

type NavbarStore = {
  toggleSidebar: () => void;
  isActiveSidebar: boolean;
};

export const useNavbarStore = create<NavbarStore>((set, get) => ({
  isActiveSidebar: false,
  toggleSidebar: () => {
    set({ isActiveSidebar: !get().isActiveSidebar });
  },
}));
