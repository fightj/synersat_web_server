"use client";

import React from "react";
import VesselFiltering from "../vessel/VesselFiltering";
import { useVesselStore } from "@/store/vessel.store";
import { CommandType, CommandStatus, GetCommandsParams } from "@/types/command";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";

interface CommandFilterContainerProps {
  onFilterChange: (newFilters: Partial<GetCommandsParams>) => void;
  currentFilters: GetCommandsParams;
  stats: Record<CommandStatus, number>;
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
  stats,
}: CommandFilterContainerProps) {
  const vessels = useVesselStore((s) => s.vessels);

  const handleVesselSelect = (vesselName: string) => {
    const targetVessel = vessels.find((v) => v.name === vesselName);
    onFilterChange({ imo: targetVessel?.imo });
  };

  const selectBaseClass =
    "appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-10 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm font-medium transition-all outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 cursor-pointer hover:border-gray-300";

  return (
    <div className="space-y-4">
      {/* 1. 상단 상태 요약 배지 */}
      <div className="flex flex-wrap items-center gap-2">
        {COMMAND_STATUSES.map((status) => (
          <div
            key={status}
            className="group flex items-center gap-2.5 rounded-full border border-gray-100 bg-white px-3.5 py-1.5 transition-all hover:shadow-sm dark:border-white/5 dark:bg-white/[0.03]"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "SUCCESS"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  : status === "FAILED"
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    : status === "RUNNING"
                      ? "animate-pulse bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      : "bg-gray-400"
              }`}
            />
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              {status}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {stats[status] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* 2. 메인 필터 카드 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-end gap-6">
          {/* Vessel 필터 */}
          <div className="flex flex-col gap-2">
            <label className="ml-1 text-xs font-bold tracking-tight text-gray-400 uppercase">
              Vessel
            </label>
            <VesselFiltering
              onFilter={handleVesselSelect}
              className="w-[220px]"
            />
          </div>

          {/* Type 필터 */}
          <div className="flex flex-col gap-2">
            <label className="ml-1 text-xs font-bold tracking-tight text-gray-400 uppercase">
              Command Type
            </label>
            <NativeSelectWithIcon
              value={currentFilters.commandType || ""}
              onChange={(e) =>
                onFilterChange({
                  commandType: (e.target.value as CommandType) || undefined,
                })
              }
              className={`w-[200px] ${selectBaseClass}`}
            >
              <option value="">All Types</option>
              {COMMAND_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </NativeSelectWithIcon>
          </div>

          {/* Status 필터 */}
          <div className="flex flex-col gap-2">
            <label className="ml-1 text-xs font-bold tracking-tight text-gray-400 uppercase">
              Status
            </label>
            <NativeSelectWithIcon
              value={currentFilters.commandStatus || ""}
              onChange={(e) =>
                onFilterChange({
                  commandStatus: (e.target.value as CommandStatus) || undefined,
                })
              }
              className={`w-[130px] ${selectBaseClass}`}
            >
              <option value="">All Status</option>
              {COMMAND_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelectWithIcon>
          </div>

          {/* 리셋 버튼 */}
          <button
            onClick={() =>
              onFilterChange({
                commandType: undefined,
                commandStatus: undefined,
                imo: undefined,
              })
            }
            className="mb-1 ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
