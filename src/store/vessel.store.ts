import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Vessel } from "@/types/vessel";
import { getVessels } from "@/api/vessel";

type SelectedVessel = Pick<Vessel, "id" | "imo"| "name" | "vpnIp">;

type VesselStore = {
  vessels: Vessel[];
  loading: boolean;
  error: string | null;

  selectedVessel: SelectedVessel | null;
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
      setSelectedVessel: (v) => set({ selectedVessel: v }),
      clearSelectedVessel: () => set({ selectedVessel: null }),

      fetchVessels: async () => {
        if (get().loading) return;
        set({ loading: true, error: null });

        try {
          const vessels = await getVessels();
          set({ vessels, loading: false });

          // ✅ 선택된 선박이 새 데이터에 없으면 선택 해제 (선택사항)
          const sel = get().selectedVessel;
          if (sel && !vessels.some((v) => String(v.id) === String(sel.id))) {
            set({ selectedVessel: null });
          }
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load vessels",
          });
        }
      },

      refreshVessels: async () => {
        await get().fetchVessels();
      },
    }),
    {
      name: "vessel-store",
      // ✅ selectedVessel만 저장하고 vessels는 저장하지 않음
      partialize: (state) => ({ selectedVessel: state.selectedVessel }),
    },
  ),
);
