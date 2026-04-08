"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { differenceInDays } from "date-fns";
import type { RouteCoordinate } from "@/types/vessel";
import { getServiceColor } from "../../common/AnntennaMapping";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface LineChartOneProps {
  coordinates: RouteCoordinate[];
  timeRange?: {
    startAt: string;
    endAt: string;
  };
  onTimeRangeChange?: (start: string, end: string) => void;
}

export default function LineChartOne({
  coordinates,
  timeRange,
  onTimeRangeChange,
}: LineChartOneProps) {
  const [isDark, setIsDark] = useState(false);
  const [selectedAntenna, setSelectedAntenna] = useState<string | null>(null);
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  // 레전드 hover는 버튼 CSS(opacity-30)로만 처리 — chart 재렌더 방지
  const [hoveredAntenna, setHoveredAntenna] = useState<string | null>(null);

  const rangeMin = timeRange ? new Date(timeRange.startAt + "Z").getTime() : undefined;
  const rangeMax = timeRange ? new Date(timeRange.endAt + "Z").getTime() : undefined;

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const { allSeries, gapSeries, isLongTerm, dayDiff } = useMemo(() => {
    const diff = timeRange
      ? differenceInDays(
          new Date(timeRange.endAt + "Z"),
          new Date(timeRange.startAt + "Z"),
        )
      : 1;
    const longTerm = diff >= 7;

    const rMin = timeRange ? new Date(timeRange.startAt + "Z").getTime() : null;
    const rMax = timeRange ? new Date(timeRange.endAt + "Z").getTime() : null;

    if (!coordinates || coordinates.length === 0) {
      // 데이터 없으면 전체 구간이 갭
      const phantomGap =
        rMin !== null && rMax !== null
          ? [{ name: "Offline", data: [{ x: rMin, y: 0 }, { x: rMax, y: 0 }], color: "#ef4444" }]
          : [];
      return { allSeries: [], gapSeries: phantomGap, isLongTerm: longTerm, dayDiff: diff };
    }

    const GAP_THRESHOLD_MS = 10 * 60 * 1000;
    const antennaNames = new Set<string>();
    const timeMap: Record<string, Record<string, number>> = {};

    const sortedCoords = [...coordinates].sort(
      (a, b) =>
        new Date(a.timeStamp + "Z").getTime() -
        new Date(b.timeStamp + "Z").getTime(),
    );

    sortedCoords.forEach((coord) => {
      const timeMs = new Date(coord.timeStamp + "Z").getTime();
      if (!timeMap[timeMs]) timeMap[timeMs] = {};
      coord.dataUsages.forEach((usage) => {
        const name = usage.antennaName || "Unknown";
        antennaNames.add(name);
        const mbps = (usage.dataUsage * 8) / 300 / 1000000;
        timeMap[timeMs][name] = parseFloat(mbps.toFixed(3));
      });
    });

    const timeKeys = Object.keys(timeMap).sort((a, b) => Number(a) - Number(b));
    const antennaList = Array.from(antennaNames);

    // ── 메인 시리즈 (갭 구간에 null 삽입) ──────────────────────────
    const chartSeries = antennaList.map((name) => {
      const points: { x: number; y: number | null }[] = [];
      for (let i = 0; i < timeKeys.length; i++) {
        const time = Number(timeKeys[i]);
        const prevTime = i > 0 ? Number(timeKeys[i - 1]) : null;
        if (prevTime !== null && time - prevTime > GAP_THRESHOLD_MS) {
          points.push({ x: Math.round((prevTime + time) / 2), y: null });
        }
        points.push({
          x: time,
          y: timeMap[time][name] !== undefined ? timeMap[time][name] : 0,
        });
      }
      return { name, data: points, color: getServiceColor(name) };
    });

    // ── 갭 구간 수집 ─────────────────────────────────────────────
    const gapIntervals: { start: number; end: number }[] = [];
    const firstT = Number(timeKeys[0]);
    const lastT = Number(timeKeys[timeKeys.length - 1]);

    // timeRange 시작 ~ 첫 데이터
    if (rMin !== null && firstT - rMin > GAP_THRESHOLD_MS) {
      gapIntervals.push({ start: rMin, end: firstT });
    }
    // 데이터 사이 갭
    for (let i = 1; i < timeKeys.length; i++) {
      const prev = Number(timeKeys[i - 1]);
      const curr = Number(timeKeys[i]);
      if (curr - prev > GAP_THRESHOLD_MS) {
        gapIntervals.push({ start: prev, end: curr });
      }
    }
    // 마지막 데이터 ~ timeRange 끝
    if (rMax !== null && rMax - lastT > GAP_THRESHOLD_MS) {
      gapIntervals.push({ start: lastT, end: rMax });
    }

    // 갭 인터벌 → 하나의 시리즈 (null로 구간 분리)
    const gapData: { x: number; y: number | null }[] = [];
    gapIntervals.forEach(({ start, end }, i) => {
      if (i > 0) {
        // 이전 갭 구간과 분리
        gapData.push({ x: Math.round((gapIntervals[i - 1].end + start) / 2), y: null });
      }
      gapData.push({ x: start, y: 0 });
      gapData.push({ x: end, y: 0 });
    });

    const builtGapSeries =
      gapData.length > 0
        ? [{ name: "Offline", data: gapData, color: "#ef4444" }]
        : [];

    return { allSeries: chartSeries, gapSeries: builtGapSeries, isLongTerm: longTerm, dayDiff: diff };
  }, [coordinates, timeRange]);

  // phantom series: x축 범위 강제용 (데이터 없을 때)
  const phantomSeries = useMemo(
    () =>
      rangeMin !== undefined && rangeMax !== undefined
        ? [{ name: "", data: [{ x: rangeMin, y: null as any }, { x: rangeMax, y: null as any }] }]
        : [],
    [rangeMin, rangeMax],
  );

  // 실제 렌더할 main 시리즈 수 (options per-series 배열 길이 계산용)
  const mainSeriesForDisplay = useMemo(() => {
    if (showOfflineOnly) return phantomSeries; // offline only: main 숨김, phantom만 x축용
    if (allSeries.length === 0) return phantomSeries;
    return selectedAntenna ? allSeries.filter((s) => s.name === selectedAntenna) : allSeries;
  }, [allSeries, phantomSeries, selectedAntenna, showOfflineOnly]);

  // 선택 필터 + gap 시리즈 합산 — hover는 포함하지 않아 chart 재렌더 없음
  const series = useMemo(
    () => [...mainSeriesForDisplay, ...gapSeries],
    [mainSeriesForDisplay, gapSeries],
  );

  const handleLegendClick = useCallback((name: string) => {
    setShowOfflineOnly(false);
    setSelectedAntenna((prev) => (prev === name ? null : name));
  }, []);

  const handleOfflineClick = useCallback(() => {
    setSelectedAntenna(null);
    setShowOfflineOnly((prev) => !prev);
  }, []);

  const options: ApexOptions = useMemo(() => {
    const mainCount = mainSeriesForDisplay.length || 1;
    const hasGap = gapSeries.length > 0;

    // per-series 배열 구성
    const strokeWidths = [...Array(mainCount).fill(2), ...(hasGap ? [1.5] : [])];
    const fillTypes = [...Array(mainCount).fill("gradient"), ...(hasGap ? ["solid"] : [])];
    const fillOpacities = [...Array(mainCount).fill(0.35), ...(hasGap ? [0] : [])];
    type CurveType = "smooth" | "straight" | "stepline" | "linestep" | "monotoneCubic";
    const strokeCurves: CurveType[] = [
      ...Array<CurveType>(mainCount).fill("smooth"),
      ...(hasGap ? (["straight"] as CurveType[]) : []),
    ];

    return {
      chart: {
        type: "area",
        height: 280,
        fontFamily: "Inter, sans-serif",
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false,
          },
          autoSelected: "selection",
        },
        selection: {
          enabled: true,
          type: "x",
          fill: { color: "#247BA0", opacity: 0.1 },
          stroke: { width: 1, dashArray: 3, color: "#247BA0", opacity: 0.4 },
        },
        events: {
          selection: (_chartContext, { xaxis }) => {
            if (xaxis && onTimeRangeChange) {
              const startUTC = new Date(xaxis.min).toISOString().slice(0, 19);
              const endUTC = new Date(xaxis.max).toISOString().slice(0, 19);
              onTimeRangeChange(startUTC, endUTC);
            }
          },
        },
        foreColor: "#9CA3AF",
        background: "transparent",
        animations: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: strokeCurves,
        width: strokeWidths,
      },
      fill: {
        type: fillTypes,
        opacity: fillOpacities,
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
        },
      },
      markers: {
        size: 0,
        colors: ["#fff"],
        strokeColors: allSeries.map((s) => s.color || "#000"),
        strokeWidth: 2,
        hover: { size: 2, sizeOffset: 1 },
      },
      legend: { show: false },
      xaxis: {
        type: "datetime",
        min: rangeMin,
        max: rangeMax,
        labels: {
          style: { colors: "#6B7280", fontSize: "12px", fontWeight: 700 },
          datetimeUTC: false,
          format: isLongTerm ? "M/d" : "HH:mm",
        },
        tickAmount: isLongTerm ? Math.min(dayDiff, 8) : 6,
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: {
          show: true,
          stroke: { color: "#9CA3AF", width: 1, dashArray: 3 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "12px", fontWeight: 700 },
          formatter: (val) =>
            val >= 1
              ? `${val.toFixed(1)} Mb/s`
              : `${(val * 1000).toFixed(0)} Kb/s`,
        },
      },
      tooltip: {
        enabled: true,
        theme: isDark ? "dark" : "light",
        shared: true,
        intersect: false,
        x: { show: true, format: "MM/dd HH:mm" },
        // gap 시리즈는 툴팁에서 숨김
        custom: undefined,
      },
      grid: {
        borderColor: "rgba(156, 163, 175, 0.1)",
        strokeDashArray: 4,
      },
    };
  }, [isDark, isLongTerm, dayDiff, allSeries, gapSeries, mainSeriesForDisplay, onTimeRangeChange, rangeMin, rangeMax]);

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* 데이터 없을 때 오버레이 */}
      {allSeries.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="text-sm text-gray-400">No Data</span>
        </div>
      )}

      {/* 커스텀 레전드 — hover는 CSS opacity만, chart 재렌더 없음 */}
      {(allSeries.length > 0 || gapSeries.length > 0) && (
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-2 pb-1">
          {allSeries.map((s) => {
            const isSelected = selectedAntenna === s.name;
            const isHovered = hoveredAntenna === s.name;
            const isGhosted =
              showOfflineOnly ||
              (selectedAntenna !== null && !isSelected) ||
              (hoveredAntenna !== null && !isHovered);

            return (
              <button
                key={s.name}
                onClick={() => handleLegendClick(s.name)}
                onMouseEnter={() => setHoveredAntenna(s.name)}
                onMouseLeave={() => setHoveredAntenna(null)}
                className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                  isGhosted ? "scale-95 opacity-30" : "scale-100 opacity-100"
                } ${isSelected ? "ring-1 ring-offset-1" : "hover:bg-blue-100 dark:hover:bg-gray-800"}`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span
                  className={`transition-colors ${isSelected || isHovered ? "font-bold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {s.name}
                </span>
              </button>
            );
          })}

          {/* Offline 필터 버튼 — gap 시리즈가 있을 때만 표시 */}
          {gapSeries.length > 0 && (
            <button
              onClick={handleOfflineClick}
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                showOfflineOnly
                  ? "scale-100 opacity-100 ring-1 ring-red-400 ring-offset-1"
                  : (selectedAntenna !== null || (hoveredAntenna !== null))
                    ? "scale-95 opacity-30"
                    : "scale-100 opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
              <span
                className={`transition-colors ${
                  showOfflineOnly ? "font-bold text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Offline
              </span>
            </button>
          )}
        </div>
      )}

      {/* 차트 영역 — 항상 렌더링 */}
      <div className="min-h-0 flex-1 [&_.apexcharts-toolbar]:hidden">
        <ReactApexChart
          options={options}
          series={series}
          type="area"
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}
