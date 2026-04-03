"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { differenceInDays } from "date-fns";
import type { RouteCoordinate } from "@/types/vessel";

type AntennaStatus = "TRACKING" | "SEARCHING" | "BLOCKING" | "COMMUNICATION_ERROR" | "NOT_AVAILABLE";

const STATUS_COLOR: Record<AntennaStatus, string> = {
  TRACKING: "#22c55e",
  SEARCHING: "#eab308",
  BLOCKING: "#3b82f6",
  COMMUNICATION_ERROR: "#ef4444",
  NOT_AVAILABLE: "#a855f7",
};

const STATUS_LABEL: Record<AntennaStatus, string> = {
  TRACKING: "TRACKING",
  SEARCHING: "SEARCHING",
  BLOCKING: "BLOCKING",
  COMMUNICATION_ERROR: "COMM. ERR",
  NOT_AVAILABLE: "NOT AVAILABLE",
};

const SLOT_MS = 5 * 60 * 1000;
const TICK_COUNT = 6;

interface RenderSeg {
  status: AntennaStatus | null;
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

export default function AntennaStatusBar({ coordinates, timeRange }: {
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

  const { segs, rStart, rEnd, longTerm } = useMemo(() => {
    const raw_rStart = timeRange ? new Date(timeRange.startAt + "Z").getTime() : 0;
    const raw_rEnd   = timeRange ? new Date(timeRange.endAt   + "Z").getTime() : 0;

    // 5분 경계에 맞게 정렬
    const rS = Math.floor(raw_rStart / SLOT_MS) * SLOT_MS;
    const rE = Math.ceil(raw_rEnd   / SLOT_MS) * SLOT_MS;
    const totalMs = rE - rS;

    const lt = timeRange
      ? differenceInDays(new Date(timeRange.endAt + "Z"), new Date(timeRange.startAt + "Z")) >= 7
      : false;

    if (totalMs <= 0) return { segs: [], rStart: rS, rEnd: rE, longTerm: lt };

    // timestamp → status 맵 (5분 경계로 floor)
    const statusMap = new Map<number, AntennaStatus>();
    for (const c of coordinates) {
      if (!c.status?.antennaStatus) continue;
      const t = Math.floor(new Date(c.timeStamp + "Z").getTime() / SLOT_MS) * SLOT_MS;
      statusMap.set(t, c.status.antennaStatus as AntennaStatus);
    }

    if (statusMap.size === 0) return { segs: [], rStart: rS, rEnd: rE, longTerm: lt };

    // 마지막 데이터 슬롯 타임스탬프
    const lastDataSlot = Math.max(...statusMap.keys());

    // 슬롯 순서대로 병합 세그먼트 생성 (빈 슬롯은 직전 상태로 forward-fill)
    const merged: RenderSeg[] = [];
    let lastKnownStatus: AntennaStatus | null = null;
    for (let t = rS; t < rE; t += SLOT_MS) {
      const raw = statusMap.get(t) ?? null;
      if (raw !== null) lastKnownStatus = raw;
      const status = raw ?? lastKnownStatus;
      const last = merged[merged.length - 1];

      if (last && last.status === status) {
        // 동일 상태 연장
        last.to = t + SLOT_MS;
        last.widthPct = ((last.to - last.from) / totalMs) * 100;
      } else {
        merged.push({
          status,
          from: t,
          to: t + SLOT_MS,
          widthPct: (SLOT_MS / totalMs) * 100,
          isOngoing: false,
        });
      }
    }

    // 마지막 데이터 슬롯을 포함하는 세그먼트 → ongoing 처리 및 rangeEnd까지 연장
    for (const seg of merged) {
      if (seg.status !== null && lastDataSlot >= seg.from && lastDataSlot < seg.to) {
        seg.isOngoing = true;
        // rangeEnd까지 연장
        const extra = rE - seg.to;
        if (extra > 0) {
          seg.to = rE;
          seg.widthPct = ((seg.to - seg.from) / totalMs) * 100;
        }
        // 이후의 null 세그먼트 제거
        const idx = merged.indexOf(seg);
        merged.splice(idx + 1);
        break;
      }
    }

    // widthPct 합 보정
    const sum = merged.reduce((s, r) => s + r.widthPct, 0);
    if (merged.length > 0 && sum > 0) {
      merged[merged.length - 1].widthPct += 100 - sum;
    }

    return { segs: merged, rStart: rS, rEnd: rE, longTerm: lt };
  }, [coordinates, timeRange]);

  if (segs.length === 0) return null;

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) =>
    rStart + ((rEnd - rStart) * i) / (TICK_COUNT - 1),
  );

  const handleMouseMove = (e: React.MouseEvent, seg: RenderSeg) => {
    if (!seg.status) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ seg, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
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
        Antenna State History
      </h4>

      <div
        ref={containerRef}
        className="relative select-none"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* 막대 */}
        <div className="flex h-8 w-full">
          {segs.map((seg, i) => {
            const pxW = containerWidth * seg.widthPct / 100;
            return (
              <div
                key={i}
                style={{
                  width: `${seg.widthPct}%`,
                  backgroundColor: seg.status ? STATUS_COLOR[seg.status] : "transparent",
                }}
                className={`relative flex items-center justify-center overflow-hidden ${
                  seg.status ? "cursor-pointer opacity-90 transition-opacity hover:opacity-100" : ""
                }`}
                onMouseMove={(e) => handleMouseMove(e, seg)}
              >
                {seg.status && pxW >= 28 && (
                  <span className="pointer-events-none w-full select-none overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center text-[11px] font-bold tracking-wide text-white">
                    {STATUS_LABEL[seg.status]}
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
        {tooltip && tooltip.seg.status && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-white shadow-xl"
            style={{
              left: tooltip.x + 202 > containerWidth ? tooltip.x - 190 : tooltip.x + 12,
              top: tooltip.y - 80,
            }}
          >
            <p className="font-bold" style={{ color: STATUS_COLOR[tooltip.seg.status] }}>
              {tooltip.seg.status.replace(/_/g, " ")}
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
