import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Vessel } from "@/types/vessel";
import { getVessels } from "@/api/vessel";

type SelectedVessel = Pick<Vessel, "id" | "imo" | "name" | "vpnIp">;

type VesselStore = {
  vessels: Vessel[];
  loading: boolean;
  error: string | null;
  vesselDataUpdated: boolean;

  selectedVessel: SelectedVessel | null;
  searchTrigger: number;
  setSelectedVessel: (v: SelectedVessel | null) => void;
  clearSelectedVessel: () => void;
  clearVesselDataUpdated: () => void;

  fetchVessels: () => Promise<void>;
  refreshVessels: () => Promise<void>;
};

export const useVesselStore = create<VesselStore>()(
  persist(
    (set, get) => ({
      vessels: [],
      loading: false,
      error: null,
      vesselDataUpdated: false,

      selectedVessel: null,
      searchTrigger: 0,
      setSelectedVessel: (v) => set((state) => ({ selectedVessel: v, searchTrigger: state.searchTrigger + 1 })),
      clearSelectedVessel: () => set({ selectedVessel: null }),
      clearVesselDataUpdated: () => set({ vesselDataUpdated: false }),

      fetchVessels: async () => {
        if (get().loading) return;

        const hasCached = get().vessels.length > 0;

        // 캐시가 없으면 로딩 표시, 있으면 백그라운드 조용히 패치
        if (!hasCached) {
          set({ loading: true, error: null });
        }

        try {
          const fresh = await getVessels();

          if (hasCached) {
            // 자주 바뀌는 실시간 필드는 제외하고 비교
            const toComparable = (vessels: Vessel[]) =>
              vessels.map((v) => ({
                ...v,
                imo: undefined,
                status: v.status
                  ? { ...v.status, lastConnectedAt: undefined, satSignal: undefined, satId: undefined }
                  : v.status,
              }));

            const isDifferent =
              JSON.stringify(toComparable(fresh)) !== JSON.stringify(toComparable(get().vessels));

            if (isDifferent) {
              set({ vessels: fresh, vesselDataUpdated: true });

              const sel = get().selectedVessel;
              if (sel && !fresh.some((v) => String(v.id) === String(sel.id))) {
                set({ selectedVessel: null });
              }
            }
          } else {
            set({ vessels: fresh });

            const sel = get().selectedVessel;
            if (sel && !fresh.some((v) => String(v.id) === String(sel.id))) {
              set({ selectedVessel: null });
            }
          }
        } catch (e) {
          if (!hasCached) {
            set({ error: e instanceof Error ? e.message : "Failed to load vessels" });
          }
        } finally {
          if (!hasCached) {
            set({ loading: false });
          }
        }
      },

      refreshVessels: async () => {
        // 강제 재패치: 캐시를 무시하고 항상 로딩 표시 후 갱신
        set({ vessels: [], vesselDataUpdated: false });
        await get().fetchVessels();
      },
    }),
    {
      name: "vessel-store",
      partialize: (state) => ({
        selectedVessel: state.selectedVessel,
        vessels: state.vessels,
      }),
    },
  ),
);
