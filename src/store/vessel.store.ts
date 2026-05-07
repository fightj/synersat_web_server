import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Vessel } from "@/types/vessel";
import { getVessels } from "@/api/vessel";

type SelectedVessel = Pick<Vessel, "id" | "imo" | "name" | "vpnIp">;

type VesselStore = {
  vessels: Vessel[];
  loading: boolean;
  error: string | null;

  selectedVessel: SelectedVessel | null;
  searchTrigger: number;
  setSelectedVessel: (v: SelectedVessel | null) => void;
  clearSelectedVessel: () => void;

  fetchVessels: () => Promise<void>;
  refreshVessels: () => Promise<void>;
};

export const useVesselStore = create<VesselStore>()(
  persist(
    (set, get) => ({
      vessels: [],
      loading: false,
      error: null,

      selectedVessel: null,
      searchTrigger: 0,
      setSelectedVessel: (v) => set((state) => ({ selectedVessel: v, searchTrigger: state.searchTrigger + 1 })),
      clearSelectedVessel: () => set({ selectedVessel: null }),

      fetchVessels: async () => {
        if (get().loading) return;

        const hasCached = get().vessels.length > 0;

        // 캐시 없으면 로딩 표시, 있으면 백그라운드에서 조용히 패치 후 바로 덮어씀
        if (!hasCached) {
          set({ loading: true, error: null });
        }

        try {
          const fresh = await getVessels();
          set({ vessels: fresh });

          const sel = get().selectedVessel;
          if (sel && !fresh.some((v) => String(v.id) === String(sel.id))) {
            set({ selectedVessel: null });
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
        set({ vessels: [] });
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
