"use client";

import { memo } from "react";
import type { ClickedVessel } from "../hooks/useVesselSelectionZoom";

interface VesselActionBarProps {
  vessel: ClickedVessel;
  measuringMode: boolean;
  onToggleMeasure: () => void;
  onClose: () => void;
  bottomOffset?: number;
}

export default memo(function VesselActionBar({
  vessel,
  measuringMode,
  onToggleMeasure,
  onClose,
  bottomOffset,
}: VesselActionBarProps) {
  const bottom = bottomOffset !== undefined
    ? bottomOffset + 12
    : "calc(10vh + 12px)";

  return (
    <div
      className="absolute left-1/2 z-1000 -translate-x-1/2"
      style={{ bottom }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-gray-900/90 px-3 py-2 shadow-2xl backdrop-blur-sm">
        {/* 선박 색상 도트 + 이름 */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: vessel.color }}
        />
        <span className="max-w-40 truncate text-[13px] font-bold text-white">
          {vessel.name}
        </span>

        <div className="mx-1 h-5 w-px bg-white/10 shrink-0" />

        {/* 거리측정 버튼 */}
        <button
          onClick={onToggleMeasure}
          title={measuringMode ? "Cancel measurement" : "distance"}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${measuringMode
            ? "bg-sky-500 text-white"
            : "bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white"
            }`}
        >
          {measuringMode ? "Click on map…" : "Distance"}
        </button>

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 측정 모드 힌트 */}
      {measuringMode && (
        <p className="mt-1.5 text-center text-[11px] font-semibold text-sky-400 drop-shadow">
          Click a point on the map
        </p>
      )}
    </div>
  );
});
