"use client";

import React from "react";
import VesselFiltering from "../vessel/VesselFiltering";
import { useVesselStore } from "@/store/vessel.store";
import { CommandType, CommandStatus, GetCommandsParams } from "@/types/command";

interface CommandFilterContainerProps {
  onFilterChange: (newFilters: Partial<GetCommandsParams>) => void;
  currentFilters: GetCommandsParams;
}

const COMMAND_TYPES: CommandType[] = [
  "UPDATE_VESSEL_FIRE_WALL",
  "UPDATE_VESSEL_VSAT",
  "UPDATE_VESSEL_FBB",
  "UPDATE_VESSEL_VLAN",
  "GET_SETTING",
  "RESET_CORE",
  "RESET_ALL_AUTO_ID",
  "RESET_ALL_FX_CREW_ID",
  "RUN_UPDATE",
  "RUN_RSYNC",
  "UPDATE_CREW_ACCOUNT",
  "CREATE_CREW_ACCOUNT",
  "REGISTER_NAT",
  "UPDATE_NAT",
  "REMOVE_NAT",
];

const COMMAND_STATUSES: CommandStatus[] = [
  "READY",
  "RUNNING",
  "FAILED",
  "SUCCESS",
];

export default function CommandFilterContainer({
  onFilterChange,
  currentFilters,
}: CommandFilterContainerProps) {
  const vessels = useVesselStore((s) => s.vessels);

  const handleVesselSelect = (vesselName: string) => {
    if (!vesselName) {
      onFilterChange({ imo: undefined });
      return;
    }
    const targetVessel = vessels.find((v) => v.name === vesselName);
    if (targetVessel) {
      onFilterChange({ imo: targetVessel.imo });
    }
  };

  return (
    <div className="sticky top-20 z-1 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* justify-between을 제거하고 justify-start + gap-x를 활용하여 
        요소들 사이의 거리를 일정한 간격(8 = 2rem)으로 조절했습니다.
      */}
      <div className="flex flex-wrap items-center justify-start gap-x-8 gap-y-4 px-6 py-4">
        {/* 1. Vessel Filter */}
        <div className="mr-3 flex items-center gap-3">
          <label className="shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
            Vessel
          </label>
          <VesselFiltering
            onFilter={handleVesselSelect}
            className="w-[220px]"
          />
        </div>

        {/* 2. Type Filter */}
        <div className="mr-3 flex items-center gap-3">
          <label className="shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
            Type
          </label>
          <select
            value={currentFilters.commandType || ""}
            onChange={(e) =>
              onFilterChange({
                commandType: (e.target.value as CommandType) || undefined,
              })
            }
            className="focus:border-brand-500 h-10 w-[180px] rounded-lg border border-gray-200 bg-transparent px-3 text-sm transition-colors outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            {COMMAND_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Status Filter */}
        <div className="flex items-center gap-3">
          <label className="shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={currentFilters.commandStatus || ""}
            onChange={(e) =>
              onFilterChange({
                commandStatus: (e.target.value as CommandStatus) || undefined,
              })
            }
            className="focus:border-brand-500 h-10 w-[110px] rounded-lg border border-gray-200 bg-transparent px-3 text-sm transition-colors outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            <option value="">All</option>
            {COMMAND_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Reset Button (오른쪽 끝으로 밀기) */}
        <div className="ml-auto flex items-center border-l border-gray-100 pl-6 dark:border-gray-800">
          <button
            onClick={() =>
              onFilterChange({
                commandType: undefined,
                commandStatus: undefined,
                imo: undefined,
              })
            }
            className="group flex items-center gap-1.5 text-sm font-semibold text-gray-400 transition-colors hover:text-red-500"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:rotate-[-45deg]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
