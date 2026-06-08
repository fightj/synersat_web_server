import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentSearchEntry {
  imo: number;
  name: string;
}

const MAX_RECENT_SEARCH = 6;

interface RecentSearchStore {
  recents: RecentSearchEntry[];
  addRecent: (v: RecentSearchEntry) => void;
  removeRecent: (imo: number) => void;
  clearAll: () => void;
}

export const useRecentSearchStore = create<RecentSearchStore>()(
  persist(
    (set) => ({
      recents: [],
      addRecent: (v) =>
        set((state) => {
          const filtered = state.recents.filter((r) => r.imo !== v.imo);
          return { recents: [v, ...filtered].slice(0, MAX_RECENT_SEARCH) };
        }),
      removeRecent: (imo) =>
        set((state) => ({
          recents: state.recents.filter((r) => r.imo !== imo),
        })),
      clearAll: () => set({ recents: [] }),
    }),
    { name: "synersat_recent_search" },
  ),
);
