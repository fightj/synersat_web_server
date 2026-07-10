"use client";

import { memo, useEffect, useRef, useState } from "react";
import { FILTER_CATEGORIES, FilterKey, MAP_STYLES } from "../mapUtils";
import AntennaFilterBar from "@/components/common/AntennaFilterBar";

const NARROW_BREAKPOINT = 800;
const VERY_NARROW_BREAKPOINT = 450;

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
  offlineNoGpsDiscardFalseCount?: number;
  activeListPanel: "online" | "offline" | null;
  onListPanelToggle: (mode: "online" | "offline") => void;
  isRefreshing?: boolean;
}

export default memo(function MapBottomBar({
  stats,
  activeFilter,
  onFilterChange,
  // showName,
  // onToggleName,
  activeStyle,
  onStyleChange,
  noGpsCount,
  offlineCount,
  offlineNoGpsDiscardFalseCount = 0,
  activeListPanel,
  onListPanelToggle,
  isRefreshing = false,
}: MapBottomBarProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [isVeryNarrow, setIsVeryNarrow] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [stylesPanelOpen, setStylesPanelOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsNarrow(window.innerWidth <= NARROW_BREAKPOINT);
      setIsVeryNarrow(window.innerWidth <= VERY_NARROW_BREAKPOINT);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const activeCategory = FILTER_CATEGORIES.find((c) => c.key === activeFilter);
  const activeMapStyle = MAP_STYLES.find((s) => s.id === activeStyle) ?? MAP_STYLES[0];

  return (
    <div
      className="relative flex w-full flex-wrap items-center justify-between bg-gray-800 px-[clamp(0.75rem,3vw,3.5rem)] py-2"
      style={{ minHeight: "10vh" }}
    >
      {/* ── 스타일 패널 (매우 좁은 화면) ────────────────────────────── */}
      {isVeryNarrow && stylesPanelOpen && (
        <div className="absolute bottom-full left-[clamp(0.75rem,3vw,3.5rem)] z-1100 mb-2 rounded-xl border border-white/10 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="flex gap-3">
            {MAP_STYLES.map((style) => {
              const isActive = activeStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => { onStyleChange(style.id); setStylesPanelOpen(false); }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`overflow-hidden rounded-md transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900"
                        : "opacity-50 hover:opacity-90"
                    }`}
                    style={{ width: 44, height: 44 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.preview}
                      alt={style.label}
                      width={44}
                      height={44}
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
        </div>
      )}

      {/* ── 필터 패널 (좁은 화면, 바 전체 기준 가운데 정렬) ──────── */}
      {isNarrow && filterPanelOpen && (
        <div className="absolute bottom-full left-1/2 z-1100 mb-2 w-[min(360px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-white/10 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-sm">
          <AntennaFilterBar
            categories={FILTER_CATEGORIES}
            stats={stats}
            activeKey={activeFilter}
            onSelect={(key) => {
              onFilterChange(activeFilter === key && key !== "all" ? "all" : key as FilterKey);
              setFilterPanelOpen(false);
            }}
            variant="dark"
            animated
            className="flex-wrap"
          />
        </div>
      )}

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
      {isVeryNarrow ? (
        /* 매우 좁은 화면: 버튼 하나로 접기 */
        <div className="shrink-0">
          <button
            onClick={() => setStylesPanelOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold transition-all ${
              stylesPanelOpen
                ? "border-blue-500/60 bg-blue-500/20 text-blue-200"
                : "border-white/10 text-gray-300 hover:border-white/20 hover:text-white"
            }`}
          >
            <div
              className="overflow-hidden rounded"
              style={{ width: 18, height: 18 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeMapStyle.preview}
                alt={activeMapStyle.label}
                width={18}
                height={18}
                className="h-full w-full object-cover"
                style={activeMapStyle.tileFilter ? { filter: activeMapStyle.tileFilter } : undefined}
              />
            </div>
            {activeMapStyle.label}
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className={`transition-transform ${stylesPanelOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      ) : (
        /* 일반 화면: 썸네일 인라인 표시 */
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
      )}

      {/* ── 가운데: 카테고리 필터 ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-wrap justify-center px-2">
      {isNarrow ? (
        /* 좁은 화면: 버튼 하나로 접기 */
        <div className="shrink-0">
          <button
            onClick={() => setFilterPanelOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              filterPanelOpen
                ? "border-blue-500/60 bg-blue-500/20 text-blue-200"
                : "border-white/10 text-gray-300 hover:border-white/20 hover:text-white"
            }`}
          >
            {activeCategory ? (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: activeCategory.color }} />
                {activeCategory.label}
                <span className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-bold tabular-nums text-gray-300">
                  {stats[activeFilter] ?? 0}
                </span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                </svg>
                Filter
              </>
            )}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className={`transition-transform ${filterPanelOpen ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      ) : (
        /* 넓은 화면: 인라인 표시 */
        <div className="min-w-0">
          <AntennaFilterBar
            categories={FILTER_CATEGORIES}
            stats={stats}
            activeKey={activeFilter}
            onSelect={(key) => onFilterChange(activeFilter === key && key !== "all" ? "all" : key as FilterKey)}
            variant="dark"
            animated
            className="justify-center py-1"
          />
        </div>
      )}
      </div>

      {/* ── 오른쪽: No GPS 그룹 ──────────────────────────────────── */}
      <div className="flex shrink-0 flex-col items-center gap-1 pl-1">
        <span className="whitespace-nowrap text-[9px] font-bold tracking-wider text-yellow-500 uppercase">
          No GPS
        </span>
        <div className="flex items-center gap-1.5">
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
          {!isVeryNarrow && offlineNoGpsDiscardFalseCount > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-red-500/20 px-1 py-0.5 text-[10px] font-bold text-red-300">
              <svg width="10" height="10" viewBox="0 -5 16 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 -4C9 -2 14 1.5 14 5.5V21C14 22.65 12.65 24 11 24H5C3.35 24 2 22.65 2 21V5.5C2 1.5 7 -2 8 -4Z" fill="#ef444440" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="4" y="5.5" width="8" height="4" rx="1" fill="#ef4444"/>
                <rect x="4" y="11.5" width="8" height="4" rx="1" fill="#ef4444"/>
              </svg>
              {offlineNoGpsDiscardFalseCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
