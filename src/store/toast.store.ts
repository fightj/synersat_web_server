import { create } from "zustand";
import { useRecentVesselsStore } from "./recent-vessels.store";

export interface ToastItem {
  id: string;
  type: "COMMAND" | "VESSEL_DISCONNECTED"; // ✅ 타입 추가
  vesselName: string;
  imo?: number;
  // COMMAND용
  commandType?: string;
  status?: "SUCCESS" | "FAILED";
  // VESSEL_DISCONNECTED용
  lastConnectAt?: string;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    // 해당 선박이 최근 탭에 있으면 orange dot 표시
    if (toast.imo) {
      const { recents, setNotification } = useRecentVesselsStore.getState();
      if (recents.some((r) => r.imo === toast.imo)) {
        setNotification(toast.imo, true);
      }
    }
    set((state) => ({
      toasts: [
        ...state.toasts.slice(-2),
        { ...toast, id: crypto.randomUUID() },
      ],
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));