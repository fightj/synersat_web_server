"use client";

import { useEffect, useRef, useState } from "react";
import { FILTER_CATEGORIES, FilterKey, MAP_STYLES } from "../mapUtils";
import AntennaFilterBar from "@/components/common/AntennaFilterBar";

// ── 숫자 카운팅 애니메이션 (No GPS 버튼용) ──────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (prevRef.current === value) return;
    const start = prevRef.current;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{displayed}</>;
}

interface MapBottomBarProps {
  stats: Record<FilterKey, number>;
  activeFilter: FilterKey;
  onFilterChange: (key: FilterKey) => void;
  // showName: boolean;
  // onToggleName: () => void;
  activeStyle: string;
  onStyleChange: (id: string) => void;
  noGpsCount: number;
  offlineCount: number;
  activeListPanel: "online" | "offline" | null;
  onListPanelToggle: (mode: "online" | "offline") => void;
  isRefreshing?: boolean;
}

export default function MapBottomBar({
  stats,
  activeFilter,
  onFilterChange,
  // showName,
  // onToggleName,
  activeStyle,
  onStyleChange,
  noGpsCount,
  offlineCount,
  activeListPanel,
  onListPanelToggle,
  isRefreshing = false,
}: MapBottomBarProps) {
  return (
    <div
      className="relative flex w-full items-center bg-gray-800 px-3"
      style={{ height: "10vh" }}
    >
      {/* ── 데이터 갱신 스캔 라인 ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
        <div className="h-full w-full bg-white/5" />
        {isRefreshing && (
          <div
            className="absolute inset-y-0 w-1/3"
            style={{
              background: "linear-gradient(90deg, transparent, #38bdf8cc, #818cf8cc, #38bdf8cc, transparent)",
              animation: "map-refresh-scan 1.2s cubic-bezier(0.4,0,0.6,1) forwards",
              boxShadow: "0 0 8px 2px #38bdf860",
            }}
          />
        )}
      </div>

      {/* ── 왼쪽: 지도 스타일 선택 ──────────────────────────────── */}
      {/* Names 토글 주석처리
      <div className="flex shrink-0 items-center gap-1.5 pr-3">
        <button onClick={onToggleName} ...>...</button>
        <span>Names</span>
      </div> */}
      <div className="flex shrink-0 items-center gap-2 pr-3">
        {MAP_STYLES.map((style) => {
          const isActive = activeStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className="flex flex-col items-center gap-0.5"
            >
              <div
                className={`overflow-hidden rounded-md transition-all duration-200 ${
                  isActive
                    ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-800"
                    : "opacity-50 hover:opacity-90"
                }`}
                style={{ width: 32, height: 32 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.preview}
                  alt={style.label}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  style={style.tileFilter ? { filter: style.tileFilter } : undefined}
                />
              </div>
              <span className={`text-[9px] font-bold ${isActive ? "text-blue-400" : "text-gray-500"}`}>
                {style.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-2 h-5 w-px shrink-0 bg-white/10" />

      {/* ── 가운데: 카테고리 필터 (가용 공간 차지, 스크롤 허용) ─── */}
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AntennaFilterBar
          categories={FILTER_CATEGORIES}
          stats={stats}
          activeKey={activeFilter}
          onSelect={(key) => onFilterChange(activeFilter === key && key !== "all" ? "all" : key as FilterKey)}
          variant="dark"
          animated
          className="mx-auto w-max py-1"
        />
      </div>

      <div className="mx-2 h-5 w-px shrink-0 bg-white/10" />

      {/* ── 오른쪽: No GPS 그룹 ──────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5 pl-1">
        <span className="hidden whitespace-nowrap text-[9px] font-bold tracking-wider text-yellow-500 uppercase xl:block">
          No GPS
        </span>
        <button
          onClick={() => onListPanelToggle("online")}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all duration-150 ${
            activeListPanel === "online"
              ? "border-green-500/60 bg-green-500/20 text-green-200"
              : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
          <span className="hidden sm:inline">Online</span>
          <span
            className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold tabular-nums ${
              activeListPanel === "online" ? "bg-white/20 text-white" : "bg-white/10 text-gray-300"
            }`}
          >
            <AnimatedNumber value={noGpsCount} />
          </span>
        </button>
        <button
          onClick={() => onListPanelToggle("offline")}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-all duration-150 ${
            activeListPanel === "offline"
              ? "border-red-500/60 bg-red-500/20 text-red-300"
              : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
          <span className="hidden sm:inline">Offline</span>
          <span
            className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold tabular-nums ${
              activeListPanel === "offline" ? "bg-white/20 text-white" : "bg-white/10 text-gray-300"
            }`}
          >
            <AnimatedNumber value={offlineCount} />
          </span>
        </button>
      </div>
    </div>
  );
}
