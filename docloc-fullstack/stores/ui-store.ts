import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  viewMode: 'grid' | 'list';
  toggleSidebar: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  viewMode: 'grid',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
