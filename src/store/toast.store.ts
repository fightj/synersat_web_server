import { create } from "zustand";

export interface ToastItem {
  id: string;
  vesselName: string;
  commandType: string;
  status: "SUCCESS" | "FAILED";
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
      // ✅ 최대 3개만 유지
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