import { create } from "zustand";
import type { Vessel } from "@/types/vessel";
import { getVessels } from "@/api/vessel";

type VesselStore = {
  vessels: Vessel[];
  loading: boolean;
  error: string | null;

  fetchVessels: () => Promise<void>;
  refreshVessels: () => Promise<void>; // 의미상 동일(선택)
  setVessels: (vessels: Vessel[]) => void;
};

export const useVesselStore = create<VesselStore>((set, get) => ({
  vessels: [],
  loading: false,
  error: null,

  setVessels: (vessels) => set({ vessels }),

  fetchVessels: async () => {
    // 중복 호출 방지
    if (get().loading) return;

    set({ loading: true, error: null });

    try {
      const vessels = await getVessels();

      // ✅ 무조건 최신 데이터로 덮어쓰기
      set({ vessels, loading: false });
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
}));
