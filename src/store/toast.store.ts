import { create } from "zustand";

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
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts.slice(-2),
        { ...toast, id: crypto.randomUUID() },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));