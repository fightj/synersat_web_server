"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { differenceInDays } from "date-fns";
import type { TimeStampDataUsageV2 } from "@/types/vessel";
import { getServiceColor } from "../../common/AnntennaMapping";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const tsMs = (ts: string) => new Date(ts.endsWith("Z") ? ts : ts + "Z").getTime();

interface LineChartOneProps {
  timeStampDataUsages: TimeStampDataUsageV2[];
  timeRange?: {
    startAt: string;
    endAt: string;
  };
  onTimeRangeChange?: (start: string, end: string) => void;
}

export default function LineChartOne({
  timeStampDataUsages,
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

  const { allSeries, unavailSeries, gapSeries, isLongTerm, dayDiff } = useMemo(() => {
    const diff = timeRange
      ? differenceInDays(
        new Date(timeRange.endAt + "Z"),
        new Date(timeRange.startAt + "Z"),
      )
      : 1;
    const longTerm = diff >= 7;

    const rMin = timeRange ? new Date(timeRange.startAt + "Z").getTime() : null;
    const rMax = timeRange ? new Date(timeRange.endAt + "Z").getTime() : null;

    if (!timeStampDataUsages || timeStampDataUsages.length === 0) {
      // 데이터 없으면 전체 구간이 갭
      const phantomGap =
        rMin !== null && rMax !== null
          ? [{ name: "Offline", data: [{ x: rMin, y: 0 }, { x: rMax, y: 0 }], color: "#ef4444" }]
          : [];
      return { allSeries: [], unavailSeries: [], gapSeries: phantomGap, isLongTerm: longTerm, dayDiff: diff };
    }

    const antennaNames = new Set<string>();
    const timeMap: Record<string, Record<string, number>> = {};

    const unavailMap: Record<number, boolean> = {};

    timeStampDataUsages.forEach((coord) => {
      const timeMs = tsMs(coord.timeStamp);
      if (!timeMap[timeMs]) timeMap[timeMs] = {};
      if (!coord.available) unavailMap[timeMs] = true;
      coord.antennaDataUsages.forEach((usage) => {
        const name = usage.antennaName || "Unknown";
        antennaNames.add(name);
        const mbps = (usage.dataUsage * 8) / 300 / 1000000;
        timeMap[timeMs][name] = parseFloat(mbps.toFixed(3));
      });
    });

    const timeKeys = Object.keys(timeMap);
    const antennaList = Array.from(antennaNames);

    // 데이터 평균 간격의 2배를 gap threshold로 사용 (최소 10분)
    // → 30분 간격 데이터: threshold 60분 / 5분 간격 데이터: threshold 10분
    const GAP_THRESHOLD_MS = timeKeys.length > 1
      ? Math.max(
          10 * 60 * 1000,
          ((Number(timeKeys[timeKeys.length - 1]) - Number(timeKeys[0])) / (timeKeys.length - 1)) * 2,
        )
      : 10 * 60 * 1000;

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

    // ── available=false 구간 하이라이트 시리즈 (메인 라인보다 넓게 뒤에 렌더) ──
    // 단일 tick만 unavail이면 ApexCharts가 점(원)으로 렌더링하므로
    // 양쪽 인접 tick까지 포함해 최소 3-point 세그먼트를 보장
    const extendedUnavailSet = new Set<number>();
    timeKeys.forEach((tk, i) => {
      if (!unavailMap[Number(tk)]) return;
      if (i > 0 && Number(tk) - Number(timeKeys[i - 1]) <= GAP_THRESHOLD_MS)
        extendedUnavailSet.add(Number(timeKeys[i - 1]));
      extendedUnavailSet.add(Number(tk));
      if (i < timeKeys.length - 1 && Number(timeKeys[i + 1]) - Number(tk) <= GAP_THRESHOLD_MS)
        extendedUnavailSet.add(Number(timeKeys[i + 1]));
    });

    type SeriesPoint = { x: number; y: number | null };
    const builtUnavailSeries = antennaList
      .map((name) => {
        const points: SeriesPoint[] = [];
        for (let i = 0; i < timeKeys.length; i++) {
          const time = Number(timeKeys[i]);
          const prevTime = i > 0 ? Number(timeKeys[i - 1]) : null;
          if (prevTime !== null && time - prevTime > GAP_THRESHOLD_MS) {
            points.push({ x: Math.round((prevTime + time) / 2), y: null });
          }
          points.push({
            x: time,
            y: extendedUnavailSet.has(time) && timeMap[time][name] !== undefined
              ? timeMap[time][name]
              : null,
          });
        }
        if (!points.some((p) => p.y !== null)) return null;

        // 고립 단일 포인트(앞뒤 null)는 원으로 그려지므로 1분 뒤 더미 포인트로 선분 강제
        const finalPoints: SeriesPoint[] = [];
        for (let j = 0; j < points.length; j++) {
          finalPoints.push(points[j]);
          if (
            points[j].y !== null &&
            (j === 0 || points[j - 1].y === null) &&
            (j === points.length - 1 || points[j + 1].y === null)
          ) {
            finalPoints.push({ x: points[j].x + 60_000, y: points[j].y });
          }
        }

        return { name: `__unavail__${name}`, data: finalPoints, color: "#ef4444" };
      })
      .filter((s): s is { name: string; data: SeriesPoint[]; color: string } => s !== null);

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

    // 대용량 데이터(3일↑) ApexCharts SVG 렌더링 부하 감소 — null 포인트(갭 마커)는 반드시 유지
    const MAX_PTS = 500;
    const decimatedChartSeries = chartSeries.map((s) => {
      if (s.data.length <= MAX_PTS) return s;
      const stride = Math.ceil(s.data.length / MAX_PTS);
      return {
        ...s,
        data: s.data.filter((pt, i, arr) =>
          pt.y === null ||                          // 갭 마커 유지
          i === 0 || i === arr.length - 1 ||        // 양 끝점 유지
          arr[i - 1]?.y === null ||                 // 갭 직후 첫 포인트 유지
          arr[i + 1]?.y === null ||                 // 갭 직전 마지막 포인트 유지
          i % stride === 0,                         // stride 샘플링
        ),
      };
    });

    return { allSeries: decimatedChartSeries, unavailSeries: builtUnavailSeries, gapSeries: builtGapSeries, isLongTerm: longTerm, dayDiff: diff };
  }, [timeStampDataUsages, timeRange]);

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
    if (showOfflineOnly) return phantomSeries;
    if (allSeries.length === 0) return phantomSeries;
    return selectedAntenna ? allSeries.filter((s) => s.name === selectedAntenna) : allSeries;
  }, [allSeries, phantomSeries, selectedAntenna, showOfflineOnly]);

  // unavail 시리즈 필터 (selectedAntenna 연동)
  const unavailSeriesForDisplay = useMemo(() => {
    if (showOfflineOnly || allSeries.length === 0) return [];
    if (selectedAntenna) {
      return unavailSeries.filter((s) => s.name === `__unavail__${selectedAntenna}`);
    }
    return unavailSeries;
  }, [unavailSeries, allSeries, selectedAntenna, showOfflineOnly]);

  // unavail(뒤) → main → gap 순으로 렌더 — unavail이 먼저 그려져야 main이 위에 덮임
  const series = useMemo(
    () => [...unavailSeriesForDisplay, ...mainSeriesForDisplay, ...gapSeries],
    [unavailSeriesForDisplay, mainSeriesForDisplay, gapSeries],
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
    const unavailCount = unavailSeriesForDisplay.length;
    const mainCount = mainSeriesForDisplay.length || 1;
    const hasGap = gapSeries.length > 0;

    // per-series 배열: unavail → main → gap 순서로 구성
    type CurveType = "smooth" | "straight" | "stepline" | "linestep" | "monotoneCubic";
    const strokeWidths = [
      ...Array(unavailCount).fill(5),      // unavail: 두꺼운 빨간 선 (main 뒤에서 테두리 역할)
      ...Array(mainCount).fill(2),          // main
      ...(hasGap ? [1.5] : []),
    ];
    const fillTypes = [
      ...Array(unavailCount).fill("solid"), // unavail: 채움 없음
      ...Array(mainCount).fill("gradient"),
      ...(hasGap ? ["solid"] : []),
    ];
    const fillOpacities = [
      ...Array(unavailCount).fill(0),       // unavail: 채움 투명
      ...Array(mainCount).fill(0.35),
      ...(hasGap ? [0] : []),
    ];
    const strokeCurves: CurveType[] = [
      ...Array<CurveType>(unavailCount).fill("smooth"),
      ...Array<CurveType>(mainCount).fill("smooth"),
      ...(hasGap ? (["straight"] as CurveType[]) : []),
    ];

    return {
      chart: {
        type: "area",
        height: 280,
        fontFamily: "Inter, sans-serif",
        toolbar: {
          show: false,
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
        opacity: isDark ? fillOpacities.map((o) => o * 0.7) : fillOpacities,
        gradient: {
          shadeIntensity: isDark ? 0.5 : 1,
          opacityFrom: isDark ? 0.25 : 0.4,
          opacityTo: isDark ? 0.05 : 0.55,
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
          datetimeFormatter: {
            year: "yyyy",
            month: "M/d",
            day: "M/d",
            hour: "HH:mm",
            minute: "HH:mm",
          },
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
        // unavail·gap 시리즈는 툴팁에서 숨김 — main 시리즈 인덱스만 표시
        enabledOnSeries: Array.from({ length: mainCount + (hasGap ? 1 : 0) }, (_, i) => unavailCount + i),
      },
      grid: {
        borderColor: "rgba(156, 163, 175, 0.1)",
        strokeDashArray: 4,
      },
    };
  }, [isDark, isLongTerm, dayDiff, allSeries, gapSeries, mainSeriesForDisplay, unavailSeriesForDisplay, onTimeRangeChange, rangeMin, rangeMax]);

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
                className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all duration-200 ${isGhosted ? "scale-95 opacity-30" : "scale-100 opacity-100"
                  } ${isSelected ? "ring-1 ring-offset-1" : "hover:bg-blue-100 dark:hover:bg-gray-800"}`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
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
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all duration-200 ${showOfflineOnly
                ? "scale-100 opacity-100 ring-1 ring-red-400 ring-offset-1"
                : (selectedAntenna !== null || (hoveredAntenna !== null))
                  ? "scale-95 opacity-30"
                  : "scale-100 opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
            >
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-red-500" />
              <span
                className={`transition-colors ${showOfflineOnly ? "font-bold text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
                  }`}
              >
                Offline
              </span>
            </button>
          )}
        </div>
      )}

      {/* 차트 영역 — 항상 렌더링 */}
      <div className="min-h-0 flex-1">
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
