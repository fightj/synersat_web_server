"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { differenceInDays } from "date-fns";
import type { RouteCoordinate } from "@/types/vessel";

// satId → 표시 레이블
const SAT_LABEL: Record<number, string> = {
  83:  "83.8E",
  179: "179.6E",
  55:  "55W",
  56:  "56E",
  11:  "11E",
  33:  "33W",
  62:  "62.6E",
  0.7: "0.7W",
};

// satId → 세그먼트 색상
const SAT_COLOR: Record<number, string> = {
  83:  "#6366f1",
  179: "#f59e0b",
  55:  "#10b981",
  56:  "#3b82f6",
  11:  "#ec4899",
  33:  "#14b8a6",
  62:  "#f97316",
  0.7: "#8b5cf6",
};

const EXTRA_COLORS = ["#06b6d4", "#84cc16", "#d946ef", "#0ea5e9", "#a78bfa", "#fb7185", "#34d399"];
const NA_COLOR = "#64748b";
const NA_LABEL = "Not Available";

function normId(satId: number | null | undefined): number | null {
  if (satId === null || satId === undefined || satId === -255) return null;
  return satId;
}

function getLabel(id: number | null): string {
  if (id === null) return NA_LABEL;
  if (id in SAT_LABEL) return SAT_LABEL[id];
  return id > 0 ? `${id}E` : `${Math.abs(id)}W`;
}

function getColor(id: number | null, dynamicMap: Map<number, string>): string {
  if (id === null) return NA_COLOR;
  if (id in SAT_COLOR) return SAT_COLOR[id];
  return dynamicMap.get(id) ?? NA_COLOR;
}

const SLOT_MS = 5 * 60 * 1000;
const TICK_COUNT = 12;

interface RenderSeg {
  id: number | null;
  from: number;
  to: number;
  widthPct: number;
  isOngoing: boolean;
}

interface TooltipState { seg: RenderSeg; x: number; y: number; }

function fmtTick(ms: number, longTerm: boolean) {
  return longTerm
    ? new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric" }).format(new Date(ms))
    : new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
}

function fmtFull(ms: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(ms));
}

export default function SatTrackingBar({ coordinates, timeRange }: {
  coordinates: RouteCoordinate[];
  timeRange?: { startAt: string; endAt: string };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 스캔 라인
  const [isScanning, setIsScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const prevRef = useRef<RouteCoordinate[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (prevRef.current === coordinates) return;
    prevRef.current = coordinates;
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanKey((k) => k + 1);
    setIsScanning(true);
    timerRef.current = setTimeout(() => setIsScanning(false), 1400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [coordinates]);

  const { segs, rStart, rEnd, longTerm, dynamicColorMap } = useMemo(() => {
    const raw_rStart = timeRange ? new Date(timeRange.startAt + "Z").getTime() : 0;
    const raw_rEnd   = timeRange ? new Date(timeRange.endAt   + "Z").getTime() : 0;

    const rS = Math.floor(raw_rStart / SLOT_MS) * SLOT_MS;
    const rE = Math.ceil(raw_rEnd   / SLOT_MS) * SLOT_MS;
    const totalMs = rE - rS;

    const lt = timeRange
      ? differenceInDays(new Date(timeRange.endAt + "Z"), new Date(timeRange.startAt + "Z")) >= 7
      : false;

    if (totalMs <= 0) return { segs: [], rStart: rS, rEnd: rE, longTerm: lt, dynamicColorMap: new Map() };

    // satId 슬롯 맵 구성
    const idMap = new Map<number, number | null>();
    for (const c of coordinates) {
      const t = Math.floor(new Date(c.timeStamp + "Z").getTime() / SLOT_MS) * SLOT_MS;
      idMap.set(t, normId(c.satId));
    }

    if (idMap.size === 0) return { segs: [], rStart: rS, rEnd: rE, longTerm: lt, dynamicColorMap: new Map() };

    // 알 수 없는 satId → 동적 색상 할당
    const colorMap = new Map<number, string>();
    let colorIdx = 0;
    for (const id of idMap.values()) {
      if (id !== null && !(id in SAT_COLOR) && !colorMap.has(id)) {
        colorMap.set(id, EXTRA_COLORS[colorIdx % EXTRA_COLORS.length]);
        colorIdx++;
      }
    }

    const lastDataSlot = Math.max(...idMap.keys());

    const merged: RenderSeg[] = [];
    let lastKnownId: number | null = null;
    for (let t = rS; t < rE; t += SLOT_MS) {
      const raw = idMap.has(t) ? idMap.get(t)! : undefined;
      if (raw !== undefined) lastKnownId = raw;
      const id = raw !== undefined ? raw : lastKnownId;
      const last = merged[merged.length - 1];

      if (last && last.id === id) {
        last.to = t + SLOT_MS;
        last.widthPct = ((last.to - last.from) / totalMs) * 100;
      } else {
        merged.push({
          id,
          from: t,
          to: t + SLOT_MS,
          widthPct: (SLOT_MS / totalMs) * 100,
          isOngoing: false,
        });
      }
    }

    for (const seg of merged) {
      if (seg.id !== undefined && lastDataSlot >= seg.from && lastDataSlot < seg.to) {
        seg.isOngoing = true;
        const extra = rE - seg.to;
        if (extra > 0) {
          seg.to = rE;
          seg.widthPct = ((seg.to - seg.from) / totalMs) * 100;
        }
        const idx = merged.indexOf(seg);
        merged.splice(idx + 1);
        break;
      }
    }

    const sum = merged.reduce((s, r) => s + r.widthPct, 0);
    if (merged.length > 0 && sum > 0) {
      merged[merged.length - 1].widthPct += 100 - sum;
    }

    return { segs: merged, rStart: rS, rEnd: rE, longTerm: lt, dynamicColorMap: colorMap };
  }, [coordinates, timeRange]);

  if (segs.length === 0) return null;

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) =>
    rStart + ((rEnd - rStart) * i) / (TICK_COUNT - 1),
  );

  const handleMouseMove = (e: React.MouseEvent, seg: RenderSeg) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ seg, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative mt-3 rounded-xl border border-gray-200 bg-(--color-surface-1) p-4 dark:border-white/5">
      {isScanning && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
          <div
            key={scanKey}
            className="absolute inset-y-0 w-1/3"
            style={{
              background: "linear-gradient(90deg, transparent, #38bdf8cc, #818cf8cc, #38bdf8cc, transparent)",
              animation: "map-refresh-scan 1.2s cubic-bezier(0.4,0,0.6,1) forwards",
              boxShadow: "0 0 8px 2px #38bdf860",
            }}
          />
        </div>
      )}

      <h4 className="mb-4 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        SAT Tracking History
      </h4>

      <div
        ref={containerRef}
        className="relative select-none"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* 막대 */}
        <div className="flex h-8 w-full overflow-hidden rounded-sm">
          {segs.map((seg, i) => {
            const color = getColor(seg.id, dynamicColorMap);
            const pxW = containerWidth * seg.widthPct / 100;
            const label = getLabel(seg.id);
            return (
              <div
                key={i}
                style={{
                  width: `${seg.widthPct}%`,
                  backgroundColor: seg.id !== undefined ? color : "transparent",
                }}
                className="group relative flex cursor-pointer items-center justify-center overflow-hidden"
                onMouseMove={(e) => handleMouseMove(e, seg)}
              >
                {/* 배경 오버레이 — 텍스트 영향 없이 밝기만 조절 */}
                <div className="absolute inset-0 transition-colors duration-150 group-hover:bg-black/15 dark:group-hover:bg-white/20" />
                {pxW >= 10 && (
                  <span
                    className="pointer-events-none relative z-10 w-full select-none overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-center font-bold text-white"
                    style={{ fontSize: pxW >= 40 ? 11 : pxW >= 24 ? 9 : 7 }}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* x축 */}
        <div className="relative mt-1 h-4">
          {ticks.map((t, i) => {
            const isFirst = i === 0;
            const isLast  = i === TICK_COUNT - 1;
            return (
              <span
                key={i}
                className="absolute text-[10px] font-bold text-gray-500 dark:text-gray-400"
                style={{
                  left:      isLast  ? undefined : isFirst ? 0 : `${(i / (TICK_COUNT - 1)) * 100}%`,
                  right:     isLast  ? 0 : undefined,
                  transform: isFirst || isLast ? undefined : "translateX(-50%)",
                }}
              >
                {fmtTick(t, longTerm)}
              </span>
            );
          })}
        </div>

        {/* 툴팁 */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-white shadow-xl"
            style={{
              left: tooltip.x + 202 > containerWidth ? tooltip.x - 190 : tooltip.x + 12,
              top: tooltip.y - 80,
            }}
          >
            <p className="font-bold" style={{ color: getColor(tooltip.seg.id, dynamicColorMap) }}>
              {getLabel(tooltip.seg.id)}
            </p>
            {tooltip.seg.isOngoing ? (
              <p className="mt-0.5 text-gray-400">From {fmtFull(tooltip.seg.from)}</p>
            ) : (
              <>
                <p className="mt-0.5 text-gray-400">
                  {fmtFull(tooltip.seg.from)} → {fmtFull(tooltip.seg.to)}
                </p>
                <p className="mt-0.5 text-gray-500">
                  {(() => {
                    const ms = tooltip.seg.to - tooltip.seg.from;
                    const h = Math.floor(ms / 3600000);
                    const m = Math.floor((ms % 3600000) / 60000);
                    return `Duration: ${h > 0 ? `${h}h ` : ""}${m}m`;
                  })()}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
