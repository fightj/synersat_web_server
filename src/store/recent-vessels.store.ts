import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentVesselEntry {
  imo: number;
  name: string;
  lastTab: string;
  hasNotification: boolean;
}

const MAX_RECENT = 15;

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
          const existingIndex = state.recents.findIndex((r) => r.imo === v.imo);
          if (existingIndex !== -1) {
            // 이미 존재: 제자리에서 name만 갱신, 위치 이동 없음
            const updated = state.recents.map((r) =>
              r.imo === v.imo ? { ...r, name: v.name } : r
            );
            return { recents: updated };
          }
          // 신규 선박: 오른쪽 끝에 추가, 꽉 차면 가장 왼쪽(오래된 것) 제거
          const entry: RecentVesselEntry = {
            imo: v.imo,
            name: v.name,
            lastTab: "detail",
            hasNotification: false,
          };
          return { recents: [...state.recents, entry].slice(-MAX_RECENT) };
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
