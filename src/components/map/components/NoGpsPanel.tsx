"use client";

import { useState } from "react";
import type { DashboardVesselPosition } from "@/types/vessel";

interface NoGpsPanelProps {
  mode: "online" | "offline";
  vessels: DashboardVesselPosition[];
  onClose: () => void;
  onViewDetail: (imo: number) => void;
}

export default function NoGpsPanel({ mode, vessels, onClose, onViewDetail }: NoGpsPanelProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? vessels.filter((v) =>
        v.vesselName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : vessels;

  return (
    <div className="absolute right-14 bottom-[calc(10vh+8px)] z-1000 flex w-68 max-h-96 flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/70 shadow-2xl backdrop-blur-md">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <span className="flex items-baseline gap-1 font-bold text-white">
          <span className="text-xs">{mode === "online" ? "Online" : "Offline"}</span>
          <span className="text-[10px] font-semibold text-gray-400">· No GPS</span>
          <span className="text-[11px] font-normal text-orange-400">({filtered.length})</span>
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 transition-colors hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 검색바 */}
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vessel..."
            className="w-full bg-transparent text-xs text-white placeholder-gray-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="shrink-0 text-gray-500 hover:text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 목록 */}
      <ul className="custom-scrollbar flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="flex items-center justify-center py-8 text-xs text-gray-500">
            No vessels found
          </li>
        ) : (
          filtered.map((v) => (
            <li
              key={v.imo}
              className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 hover:bg-white/5"
            >
              <span className="min-w-0 truncate text-xs font-semibold text-gray-200">
                {v.vesselName}
              </span>
              <button
                onClick={() => onViewDetail(v.imo)}
                className="flex shrink-0 items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold text-white transition-all hover:bg-orange-400 active:scale-95"
              >
                View Detail
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
