"use client";

import { useEffect, useRef, useState } from "react";
import { FILTER_CATEGORIES, FilterKey, MAP_STYLES } from "../mapUtils";

// ── 숫자 카운팅 애니메이션 컴포넌트 ────────────────────────────────
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
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
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
  showName: boolean;
  onToggleName: () => void;
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
  showName,
  onToggleName,
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
      className="relative flex w-full items-center justify-between gap-4 bg-gray-800 px-5"
      style={{ height: "10vh" }}
    >
      {/* ── 데이터 갱신 스캔 라인 ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
        {/* 기본 경계선 */}
        <div className="h-full w-full bg-white/5" />
        {/* 스캔 애니메이션 */}
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

      {/* 가운데: 카테고리 필터 (절대 중앙 배치) */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
        {FILTER_CATEGORIES.map(({ key, label, color }) => {
          const count = stats[key];
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onFilterChange(isActive && key !== "all" ? "all" : key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? "border-transparent text-white"
                  : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}
              style={
                isActive
                  ? { background: color + "33", borderColor: color + "66", color: "#fff" }
                  : {}
              }
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
              {label}
              <span
                className={`rounded px-1 py-0.5 text-[10px] leading-none font-bold tabular-nums ${
                  isActive ? "bg-white/20 text-white" : "bg-white/10 text-gray-300"
                }`}
              >
                <AnimatedNumber value={count} />
              </span>
            </button>
          );
        })}
      </div>

      {/* 왼쪽: 선박명 토글 + 지도 스타일 */}
      <div className="flex shrink-0 items-center gap-4">
        {/* 선박명 토글 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleName}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              showName ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                showName ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-gray-400">Names</span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* 지도 스타일 */}
        <div className="flex items-center gap-2">
          {MAP_STYLES.map((style) => {
            const isActive = activeStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`overflow-hidden rounded-lg transition-all duration-200 ${
                    isActive
                      ? "scale-105 ring-2 ring-blue-400 ring-offset-1 ring-offset-blue-950"
                      : "opacity-50 hover:scale-105 hover:opacity-90"
                  }`}
                  style={{ width: 40, height: 40 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={style.preview}
                    alt={style.label}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span
                  className={`text-[9px] font-bold ${isActive ? "text-blue-400" : "text-gray-600"}`}
                >
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 오른쪽: No GPS 그룹 */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold tracking-wider text-yellow-500 uppercase">
          No GPS
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onListPanelToggle("online")}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
              activeListPanel === "online"
                ? "border-green-500/60 bg-green-500/20 text-green-200"
                : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
            }`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
            Online
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
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
              activeListPanel === "offline"
                ? "border-red-500/60 bg-red-500/20 text-red-300"
                : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
            }`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            Offline
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
    </div>
  );
}
