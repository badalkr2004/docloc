import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;
  isSelecting: boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  startSelecting: () => void;
  stopSelecting: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: new Set<string>(),
  isSelecting: false,
  toggle: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clear: () => set({ selectedIds: new Set() }),
  startSelecting: () => set({ isSelecting: true }),
  stopSelecting: () => set({ isSelecting: false, selectedIds: new Set() }),
}));
