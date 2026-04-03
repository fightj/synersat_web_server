"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  NOT_AVAILABLE: "N/A",
};

interface Segment {
  status: AntennaStatus;
  from: number;
  to: number;
  widthPct: number;
}

interface Tooltip {
  segment: Segment;
  x: number;
  y: number;
}

interface Props {
  coordinates: RouteCoordinate[];
  timeRange?: { startAt: string; endAt: string };
}

function fmtTime(ms: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}


export default function AntennaStatusBar({ coordinates, timeRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  // 컨테이너 너비를 ResizeObserver로 추적
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── 스캔 라인 ──────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const prevCoordsRef = useRef<RouteCoordinate[] | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isFirst = prevCoordsRef.current === null;
    if (!isFirst && prevCoordsRef.current === coordinates) return;
    prevCoordsRef.current = coordinates;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setScanKey((k) => k + 1);
    setIsScanning(true);
    scanTimerRef.current = setTimeout(() => setIsScanning(false), 1400);
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, [coordinates]);

  const { segments, rangeStart, rangeEnd } = useMemo(() => {
    const points = [...coordinates]
      .filter((c) => c.status?.antennaStatus)
      .sort((a, b) => new Date(a.timeStamp + "Z").getTime() - new Date(b.timeStamp + "Z").getTime());

    const rStart = timeRange
      ? new Date(timeRange.startAt + "Z").getTime()
      : points.length > 0 ? new Date(points[0].timeStamp + "Z").getTime() : 0;
    const rEnd = timeRange
      ? new Date(timeRange.endAt + "Z").getTime()
      : points.length > 0 ? new Date(points[points.length - 1].timeStamp + "Z").getTime() : 0;
    const totalMs = rEnd - rStart;

    if (points.length === 0 || totalMs <= 0) return { segments: [], rangeStart: rStart, rangeEnd: rEnd };

    const merged: { status: AntennaStatus; from: number; to: number }[] = [];
    for (const pt of points) {
      const t = new Date(pt.timeStamp + "Z").getTime();
      const st = pt.status!.antennaStatus as AntennaStatus;
      if (merged.length === 0 || merged[merged.length - 1].status !== st) {
        merged.push({ status: st, from: t, to: t });
      } else {
        merged[merged.length - 1].to = t;
      }
    }
    if (merged.length > 0) merged[merged.length - 1].to = Math.max(merged[merged.length - 1].to, rEnd);

    const segs = merged
      .map((seg) => {
        const clampedFrom = Math.max(seg.from, rStart);
        const clampedTo = Math.min(seg.to, rEnd);
        if (clampedTo <= clampedFrom) return null;
        return {
          ...seg,
          from: clampedFrom,
          to: clampedTo,
          widthPct: ((clampedTo - clampedFrom) / totalMs) * 100,
        };
      })
      .filter((s): s is Segment => s !== null);

    return { segments: segs, rangeStart: rStart, rangeEnd: rEnd };
  }, [coordinates, timeRange]);

  if (segments.length === 0) return null;

  // x축 눈금 — 시작, 끝 + 균등 분할 3개 (총 5개)
  const TICK_COUNT = 5;
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) =>
    rangeStart + ((rangeEnd - rangeStart) * i) / (TICK_COUNT - 1),
  );

  const handleMouseMove = (e: React.MouseEvent, seg: Segment) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContainerWidth(rect.width);
    setTooltip({ segment: seg, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
      {/* 스캔 라인 */}
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

      {/* 헤더 — Data Usage History와 동일 스타일 */}
      <h4 className="mb-4 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        Antenna State History
      </h4>

      {/* 바 영역 */}
      <div
        ref={containerRef}
        className="relative select-none"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* 색상 막대 — 상태 텍스트 내부에 흰색으로 */}
        <div className="flex h-8 w-full overflow-hidden rounded-md">
          {segments.map((seg, i) => {
            return (
              <div
                key={i}
                style={{
                  width: i < segments.length - 1 ? `${seg.widthPct}%` : undefined,
                  flex: i === segments.length - 1 ? 1 : undefined,
                  backgroundColor: STATUS_COLOR[seg.status],
                }}
                className="relative flex cursor-pointer items-center justify-center overflow-hidden opacity-90 transition-opacity hover:opacity-100"
                onMouseMove={(e) => handleMouseMove(e, seg)}
              >
                {(containerWidth * seg.widthPct / 100) >= 28 && (
                  <span className="pointer-events-none w-full select-none overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center text-[11px] font-bold tracking-wide text-white">
                    {STATUS_LABEL[seg.status]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* x축 시간 레이블 */}
        <div className="relative mt-1 flex w-full">
          {ticks.map((t, i) => {
            const isFirst = i === 0;
            const isLast = i === TICK_COUNT - 1;
            return (
              <div
                key={i}
                className="absolute text-[10px] font-medium text-gray-400"
                style={{
                  left: isFirst ? 0 : isLast ? undefined : `${(i / (TICK_COUNT - 1)) * 100}%`,
                  right: isLast ? 0 : undefined,
                  transform: isFirst || isLast ? undefined : "translateX(-50%)",
                }}
              >
                {fmtTime(t)}
              </div>
            );
          })}
        </div>

        {/* 툴팁 */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-white shadow-xl"
            style={{
              left: Math.min(tooltip.x + 12, containerWidth - 190),
              top: tooltip.y - 68,
            }}
          >
            <p className="font-bold" style={{ color: STATUS_COLOR[tooltip.segment.status] }}>
              {tooltip.segment.status.replace(/_/g, " ")}
            </p>
            <p className="mt-0.5 text-gray-400">
              {fmtTime(tooltip.segment.from)} → {fmtTime(tooltip.segment.to)}
            </p>
            <p className="mt-0.5 text-gray-500">
              Duration: {(() => {
                const ms = tooltip.segment.to - tooltip.segment.from;
                const h = Math.floor(ms / 3600000);
                const m = Math.floor((ms % 3600000) / 60000);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
              })()}
            </p>
          </div>
        )}
      </div>

      {/* x축 레이블 높이 확보 */}
      <div className="h-4" />
    </div>
  );
}
