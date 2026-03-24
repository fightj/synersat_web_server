import { create } from "zustand";

export interface CommandEvent {
  commandType: string;
  imo: number;
  status: "SUCCESS" | "FAILED";
  timestamp: number;
}

// NAT 관련 커맨드 타입
export const NAT_COMMAND_TYPES = [
  "UPDATE_NAT",
  "REGISTER_NAT",
  "REMOVE_NAT",
  "UPDATE_VESSEL_FIRE_WALL",
];

interface CommandEventStore {
  lastEvent: CommandEvent | null;
  setLastEvent: (event: CommandEvent) => void;
  clearLastEvent: () => void;
}

export const useCommandEventStore = create<CommandEventStore>((set) => ({
  lastEvent: null,
  setLastEvent: (event) => set({ lastEvent: event }),
  clearLastEvent: () => set({ lastEvent: null }),
}));