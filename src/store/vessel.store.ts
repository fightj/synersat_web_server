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

function vesselSignature(vessels: Vessel[]): string {
  return vessels
    .map((v) => `${v.id}:${v.name}:${v.status?.available ?? ""}:${v.status?.antennaServiceDisplayName ?? ""}`)
    .sort()
    .join("|");
}

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

        const cached = get().vessels;
        const hasCached = cached.length > 0;

        if (!hasCached) {
          set({ loading: true, error: null });
        }

        try {
          const fresh = await getVessels();

          // 데이터가 실제로 변경된 경우에만 store 업데이트
          if (vesselSignature(fresh) !== vesselSignature(cached)) {
            set({ vessels: fresh });
          }

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
