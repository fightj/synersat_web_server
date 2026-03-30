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

    // ✅ Z 붙여서 UTC로 명시적 파싱
    const diff = timeRange
      ? differenceInDays(
          new Date(timeRange.endAt + "Z"),
          new Date(timeRange.startAt + "Z"),
        )
      : 1;

    const longTerm = diff >= 7;
    const antennaNames = new Set<string>();
    const timeMap: Record<string, Record<string, number>> = {};

    // ✅ Z 붙여서 UTC로 정렬
    const sortedCoords = [...coordinates].sort(
      (a, b) =>
        new Date(a.timeStamp + "Z").getTime() -
        new Date(b.timeStamp + "Z").getTime(),
    );

    sortedCoords.forEach((coord) => {
      // ✅ UTC 그대로 사용, 브라우저가 알아서 로컬 타임존으로 표시
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

  const series = useMemo(() => {
    if (selectedAntenna) {
      return allSeries.filter((s) => s.name === selectedAntenna);
    }
    if (hoveredAntenna) {
      return allSeries.map((s) => ({
        ...s,
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
          selection: (chartContext, { xaxis }) => {
            if (xaxis && onTimeRangeChange) {
              // ✅ xaxis.min/max는 UTC ms → 그대로 ISO 변환해서 부모로 전달
              const startUTC = new Date(xaxis.min).toISOString().slice(0, 19);
              const endUTC = new Date(xaxis.max).toISOString().slice(0, 19);

              console.log("[Chart Selection] startAt (UTC):", startUTC);
              console.log("[Chart Selection] endAt   (UTC):", endUTC);

              onTimeRangeChange(startUTC, endUTC);
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
        opacity: allSeries.map((s) => {
          if (!hoveredAntenna) return 1;
          return s.name === hoveredAntenna ? 1 : 0.1;
        }),
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: hoveredAntenna ? 0.2 : 0.35,
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
          datetimeUTC: false, // ✅ 브라우저 로컬 타임존으로 자동 변환해서 표시
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
        x: {
          show: true,
          format: "MM/dd HH:mm", // ✅ 브라우저 로컬 타임존 기준으로 표시
        },
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
          const isGhosted =
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

      {/* 차트 영역 */}
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
