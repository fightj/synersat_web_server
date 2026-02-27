"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { parseISO, addHours, differenceInDays } from "date-fns";
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
  // ✅ 마우스 호버 상태 추가
  const [hoveredAntenna, setHoveredAntenna] = useState<string | null>(null);

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

  const { allSeries, isLongTerm, dayDiff } = useMemo(() => {
    if (!coordinates || coordinates.length === 0) {
      return { allSeries: [], isLongTerm: false, dayDiff: 0 };
    }

    const diff = timeRange
      ? differenceInDays(parseISO(timeRange.endAt), parseISO(timeRange.startAt))
      : 1;

    const longTerm = diff >= 7;
    const antennaNames = new Set<string>();
    const timeMap: Record<string, Record<string, number>> = {};

    const sortedCoords = [...coordinates].sort(
      (a, b) =>
        parseISO(a.timeStamp).getTime() - parseISO(b.timeStamp).getTime(),
    );

    sortedCoords.forEach((coord) => {
      const kstDate = addHours(parseISO(coord.timeStamp), 9);
      const timeMs = kstDate.getTime();
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

    const chartSeries = antennaList.map((name) => ({
      name,
      data: timeKeys.map((time) => ({
        x: Number(time),
        y: timeMap[time][name] || 0,
      })),
      color: getServiceColor(name),
    }));

    return { allSeries: chartSeries, isLongTerm: longTerm, dayDiff: diff };
  }, [coordinates, timeRange]);

  // ✅ 클릭(Selected) 또는 호버(Hovered) 상태에 따른 필터링/강조 로직
  const series = useMemo(() => {
    // 1. 특정 안테나가 클릭되어 선택된 경우 해당 데이터만 표시
    if (selectedAntenna) {
      return allSeries.filter((s) => s.name === selectedAntenna);
    }

    // 2. 마우스 호버 중인 경우, 호버된 녀석은 그대로 두고 나머지는 투명하게 처리하고 싶지만,
    // ApexCharts의 series 데이터 자체의 opacity를 조절하는 것이 성능상 유리합니다.
    if (hoveredAntenna) {
      return allSeries.map((s) => ({
        ...s,
        // 호버되지 않은 시리즈는 투명도를 낮춤 (ApexCharts stroke opacity 속성 활용)
        stroke: {
          opacity: s.name === hoveredAntenna ? 1 : 0.1,
        },
      }));
    }

    return allSeries;
  }, [allSeries, selectedAntenna, hoveredAntenna]);

  const handleLegendClick = useCallback((name: string) => {
    setSelectedAntenna((prev) => (prev === name ? null : name));
  }, []);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 280,
        fontFamily: "Outfit, sans-serif",
        toolbar: {
          show: true,
          tools: {
            download: false,
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
          selection: (chartContext, { xaxis }) => {
            if (xaxis && onTimeRangeChange) {
              const startISO = new Date(xaxis.min).toISOString();
              const endISO = new Date(xaxis.max).toISOString();
              onTimeRangeChange(startISO, endISO);
            }
          },
        },
        foreColor: "#9CA3AF",
        background: "transparent",
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: 2,
        // ✅ 호버 상태에 따라 동적으로 투명도 조절
        opacity: allSeries.map((s) => {
          if (!hoveredAntenna) return 1;
          return s.name === hoveredAntenna ? 1 : 0.1;
        }),
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: hoveredAntenna ? 0.2 : 0.35, // 호버 시 전체적인 채도 낮춤
          opacityTo: 0.05,
        },
      },
      markers: {
        size: 0,
        colors: ["#fff"],
        strokeColors: allSeries.map((s) => s.color || "#000"),
        strokeWidth: 2,
        hover: { size: 5, sizeOffset: 3 },
      },
      legend: { show: false },
      xaxis: {
        type: "datetime",
        labels: {
          style: { colors: "#6B7280", fontSize: "12px", fontWeight: 700 },
          datetimeUTC: false,
          format: isLongTerm ? "M/d" : "HH:mm",
        },
        tickAmount: isLongTerm ? Math.min(dayDiff, 8) : undefined,
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
      },
      grid: {
        borderColor: "rgba(156, 163, 175, 0.1)",
        strokeDashArray: 4,
      },
    }),
    [isDark, isLongTerm, dayDiff, allSeries, hoveredAntenna, onTimeRangeChange],
  );

  if (allSeries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        No Data
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* 커스텀 레전드 */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-2 pb-1">
        {allSeries.map((s) => {
          const isSelected = selectedAntenna === s.name;
          const isHovered = hoveredAntenna === s.name;
          // 다른 녀석이 호버되거나 선택되어 있다면 내 상태는 '투명(Ghosted)'
          const isGhosted =
            (selectedAntenna !== null && !isSelected) ||
            (hoveredAntenna !== null && !isHovered);

          return (
            <button
              key={s.name}
              onClick={() => handleLegendClick(s.name)}
              onMouseEnter={() => setHoveredAntenna(s.name)} // ✅ 호버 시작
              onMouseLeave={() => setHoveredAntenna(null)} // ✅ 호버 종료
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                isGhosted ? "scale-95 opacity-30" : "scale-100 opacity-100"
              } ${isSelected ? "ring-1 ring-offset-1" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
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
      </div>

      {/* 차트 영역: 툴바 아이콘 숨김 처리 */}
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
