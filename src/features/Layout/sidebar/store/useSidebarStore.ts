'use client';

import { useNavbarStore } from '@/features/Layout/navbar/store/navbarStore';
import { create } from 'zustand';

type SidebarStore = {
  isActiveSidebar: boolean;
  setIsActiveSidebar: (newState: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>((set) => {
  useNavbarStore.subscribe((state) => {
    set({
      isActiveSidebar: state.isActiveSidebar,
    });
  });

  return {
    isActiveSidebar: useNavbarStore.getState().isActiveSidebar,
    setIsActiveSidebar: (newState: boolean) => {
      set({
        isActiveSidebar: newState,
      });
    },
  };
});
