import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentVesselEntry {
  imo: number;
  name: string;
  lastTab: string;
  hasNotification: boolean;
}

const MAX_RECENT = 10;

interface RecentVesselsStore {
  recents: RecentVesselEntry[];
  addRecent: (v: Pick<RecentVesselEntry, "imo" | "name">) => void;
  updateLastTab: (imo: number, tab: string) => void;
  removeRecent: (imo: number) => void;
  setNotification: (imo: number, val: boolean) => void;
}

export const useRecentVesselsStore = create<RecentVesselsStore>()(
  persist(
    (set) => ({
      recents: [],
      addRecent: (v) =>
        set((state) => {
          const existing = state.recents.find((r) => r.imo === v.imo);
          const filtered = state.recents.filter((r) => r.imo !== v.imo);
          const entry: RecentVesselEntry = {
            imo: v.imo,
            name: v.name,
            lastTab: existing?.lastTab ?? "detail",
            hasNotification: existing?.hasNotification ?? false,
          };
          return { recents: [entry, ...filtered].slice(0, MAX_RECENT) };
        }),
      updateLastTab: (imo, tab) =>
        set((state) => ({
          recents: state.recents.map((r) =>
            r.imo === imo ? { ...r, lastTab: tab } : r,
          ),
        })),
      removeRecent: (imo) =>
        set((state) => ({
          recents: state.recents.filter((r) => r.imo !== imo),
        })),
      setNotification: (imo, val) =>
        set((state) => ({
          recents: state.recents.map((r) =>
            r.imo === imo ? { ...r, hasNotification: val } : r,
          ),
        })),
    }),
    { name: "synersat_recent_vessels" },
  ),
);
