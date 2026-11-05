import { create } from "zustand";

type SelectionState = {
  /** Selected thread ids; a non-empty set turns the list into selection mode. */
  ids: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
  selectAll: (ids: string[]) => void;
};

/** Multi-select of the thread list (long press or avatar tap, as in the Gmail app). */
export const useSelection = create<SelectionState>()((set) => ({
  ids: new Set(),
  toggle: (id) =>
    set(({ ids }) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id);
      return { ids: next };
    }),
  clear: () => set({ ids: new Set() }),
  selectAll: (ids) => set({ ids: new Set(ids) }),
}));
