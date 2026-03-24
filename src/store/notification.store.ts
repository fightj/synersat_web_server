import { create } from "zustand";

interface NotificationStore {
  hasNew: boolean;
  setHasNew: (value: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  hasNew: false,
  setHasNew: (value) => set({ hasNew: value }),
}));