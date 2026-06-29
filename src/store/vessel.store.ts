import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Vessel } from "@/types/vessel";
import { getVessels } from "@/api/vessel";

type SelectedVessel = Pick<Vessel, "id" | "imo" | "name" | "vpnIp"> & { prepaidEnabled?: boolean };

type VesselListFilter = {
  searchTerm: string;
  categoryFilter: string | null;
  companyFilter: string;
};

type VesselStore = {
  vessels: Vessel[];
  loading: boolean;
  error: string | null;

  selectedVessel: SelectedVessel | null;
  searchTrigger: number;
  setSelectedVessel: (v: SelectedVessel | null) => void;
  clearSelectedVessel: () => void;
  updateVesselPrepaid: (imo: number, enabled: boolean) => void;

  vesselListFilter: VesselListFilter;
  setVesselListFilter: (filter: Partial<VesselListFilter>) => void;
  resetVesselListFilter: () => void;

  fetchVessels: () => Promise<void>;
  refreshVessels: () => Promise<void>;
};

function hasVesselDataChanged(fresh: Vessel[], cached: Vessel[]): boolean {
  // 1. 선박 수 다르면 변경
  if (fresh.length !== cached.length) return true;

  // 2. 각 선박의 status 비교
  return fresh.some((v) => {
    const c = cached.find((c) => c.id === v.id);
    if (!c) return true;
    return (
      c.status?.available !== v.status?.available ||
      c.status?.antennaServiceDisplayName !== v.status?.antennaServiceDisplayName ||
      c.prepaidEnabled !== v.prepaidEnabled ||
      c.betaVersionEnabled !== v.betaVersionEnabled ||
      c.name !== v.name
    );
  });
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

      vesselListFilter: { searchTerm: "", categoryFilter: null, companyFilter: "" },
      setVesselListFilter: (filter) =>
        set((state) => ({ vesselListFilter: { ...state.vesselListFilter, ...filter } })),
      resetVesselListFilter: () =>
        set({ vesselListFilter: { searchTerm: "", categoryFilter: null, companyFilter: "" } }),

      updateVesselPrepaid: (imo, enabled) =>
        set((state) => ({
          vessels: state.vessels.map((v) =>
            v.imo === imo ? { ...v, prepaidEnabled: enabled } : v
          ),
          selectedVessel:
            state.selectedVessel?.imo === imo
              ? { ...state.selectedVessel, prepaidEnabled: enabled }
              : state.selectedVessel,
        })),

      fetchVessels: async () => {
        if (get().loading) return;

        const cached = get().vessels;
        const hasCached = cached.length > 0;

        // 캐시 없으면 로딩 표시, 있으면 로컬스토리지 데이터로 먼저 렌더링 후 백그라운드 갱신
        if (!hasCached) {
          set({ loading: true, error: null });
        }

        try {
          const fresh = await getVessels();

          // 선박 수 또는 status가 달라진 경우에만 업데이트
          if (hasVesselDataChanged(fresh, cached)) {
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
