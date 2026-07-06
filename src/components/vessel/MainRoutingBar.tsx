"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { differenceInDays } from "date-fns";
import type { CurrentRouteEntry, VesselCurrentRoutesResponse } from "@/types/vessel";
import { getServiceColor } from "../common/AnntennaMapping";
import { getVesselCurrentRoutes } from "@/api/vessel";

const THREE_MINUTES = 3 * 60 * 1000;

const NA_COLOR = "#64748b";
const NA_LABEL = "N/A";

const SLOT_MS = 5 * 60 * 1000;
const TICK_COUNT = 12;

interface RenderSeg {
  displayName: string | null;
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

const tsMs = (ts: string) => new Date(ts.endsWith("Z") ? ts : ts + "Z").getTime();

export default function MainRoutingBar({ vesselImo, timeRange, isLive = false, fetchTimeRange }: {
  vesselImo: string;
  timeRange?: { startAt: string; endAt: string };
  isLive?: boolean;
  fetchTimeRange?: () => { startAt: string; endAt: string };
}) {
  const { data: rawData, isLoading } = useSWR<VesselCurrentRoutesResponse>(
    timeRange ? ["vesselCurrentRoutes", vesselImo, timeRange.startAt, timeRange.endAt] : null,
    () => {
      const range = fetchTimeRange ? fetchTimeRange() : { startAt: timeRange!.startAt, endAt: timeRange!.endAt };
      return getVesselCurrentRoutes(vesselImo, range.startAt, range.endAt);
    },
    { refreshInterval: isLive ? THREE_MINUTES : 0, revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: THREE_MINUTES },
  );

  const timeStampDataUsages = useMemo((): CurrentRouteEntry[] => {
    if (!rawData) return [];
    const arr: any[] = Array.isArray(rawData)
      ? rawData
      : (Object.values(rawData as object) as any[]).find(Array.isArray) ?? [];
    console.log("[MainRoutingBar] rawData:", rawData, "→ arr.length:", arr.length);
    return arr.map((item: any) => ({
      timeStamp: item.timeStamp ?? item.timestamp ?? "",
      displayName: item.displayName ?? item.currentRoute ?? item.antennaServiceDisplayName ?? null,
    }));
  }, [rawData]);

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
  const prevRef = useRef<CurrentRouteEntry[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (prevRef.current === timeStampDataUsages) return;
    prevRef.current = timeStampDataUsages;
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanKey((k) => k + 1);
    setIsScanning(true);
    timerRef.current = setTimeout(() => setIsScanning(false), 1400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeStampDataUsages]);

  const { segs, rStart, rEnd, longTerm } = useMemo(() => {
    const raw_rStart = timeRange ? new Date(timeRange.startAt + "Z").getTime() : 0;
    const raw_rEnd   = timeRange ? new Date(timeRange.endAt   + "Z").getTime() : 0;

    const rS = Math.floor(raw_rStart / SLOT_MS) * SLOT_MS;
    const rE = Math.ceil(raw_rEnd   / SLOT_MS) * SLOT_MS;
    const totalMs = rE - rS;

    const lt = timeRange
      ? differenceInDays(new Date(timeRange.endAt + "Z"), new Date(timeRange.startAt + "Z")) >= 7
      : false;

    if (totalMs <= 0) return { segs: [], rStart: rS, rEnd: rE, longTerm: lt };

    // timestamp → antennaServiceDisplayName 슬롯 맵
    const nameMap = new Map<number, string | null>();
    for (const c of timeStampDataUsages) {
      const t = Math.floor(tsMs(c.timeStamp) / SLOT_MS) * SLOT_MS;
      nameMap.set(t, c.displayName ?? null);
    }

    if (nameMap.size === 0) return { segs: [], rStart: rS, rEnd: rE, longTerm: lt };

    const lastDataSlot = Math.max(...nameMap.keys());

    const merged: RenderSeg[] = [];
    let lastKnown: string | null = null;
    for (let t = rS; t < rE; t += SLOT_MS) {
      const raw = nameMap.has(t) ? nameMap.get(t)! : undefined;
      if (raw !== undefined) lastKnown = raw;
      const name = raw !== undefined ? raw : lastKnown;
      const last = merged[merged.length - 1];

      if (last && last.displayName === name) {
        last.to = t + SLOT_MS;
        last.widthPct = ((last.to - last.from) / totalMs) * 100;
      } else {
        merged.push({
          displayName: name,
          from: t,
          to: t + SLOT_MS,
          widthPct: (SLOT_MS / totalMs) * 100,
          isOngoing: false,
        });
      }
    }

    for (const seg of merged) {
      if (lastDataSlot >= seg.from && lastDataSlot < seg.to) {
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

    return { segs: merged, rStart: rS, rEnd: rE, longTerm: lt };
  }, [timeStampDataUsages, timeRange]);

  if (isLoading) return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-(--color-surface-1) p-4 dark:border-white/5">
      <div className="mb-4 h-3.5 w-36 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
      <div className="h-8 w-full animate-pulse rounded-sm bg-gray-200 dark:bg-white/10" />
      <div className="mt-1 flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-8 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
        ))}
      </div>
    </div>
  );
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
        Main Routing History
      </h4>

      <div
        ref={containerRef}
        className="relative select-none"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* 막대 */}
        <div className="flex h-8 w-full overflow-hidden rounded-sm">
          {segs.map((seg, i) => {
            const color = seg.displayName ? getServiceColor(seg.displayName) : NA_COLOR;
            const label = seg.displayName ?? NA_LABEL;
            const pxW = containerWidth * seg.widthPct / 100;
            return (
              <div
                key={i}
                style={{ width: `${seg.widthPct}%`, backgroundColor: color }}
                className="group relative flex cursor-pointer items-center justify-center overflow-hidden"
                onMouseMove={(e) => handleMouseMove(e, seg)}
              >
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
            <p
              className="font-bold"
              style={{ color: tooltip.seg.displayName ? getServiceColor(tooltip.seg.displayName) : NA_COLOR }}
            >
              {tooltip.seg.displayName ?? NA_LABEL}
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
