import { create } from "zustand"
import { persist } from "zustand/middleware"

interface RecentVessel {
  imo: number;
  name: string;
}

interface RecentVesselsStore {
  recents: RecentVessel[];
  addRecent: (v: RecentVessel) => void;
}

export const useRecentVesselsStore = create<RecentVesselsStore>()(
  persist(
    (set) => ({
      recents: [],
      addRecent: (v) =>
        set((state) => {
          const filtered = state.recents.filter((r) => r.imo !== v.imo);
          return { recents: [v, ...filtered].slice(0, 6) };
        }),
    }),
    { name: "recent-vessels" }
  )
)
