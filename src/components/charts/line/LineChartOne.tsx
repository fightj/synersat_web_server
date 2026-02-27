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
  // 부모에게 선택된 시간 범위를 전달할 콜백
  onTimeRangeChange?: (start: string, end: string) => void;
}

export default function LineChartOne({
  coordinates,
  timeRange,
  onTimeRangeChange,
}: LineChartOneProps) {
  const [isDark, setIsDark] = useState(false);
  const [selectedAntenna, setSelectedAntenna] = useState<string | null>(null);

  // 다크모드 감지
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

  // 데이터 가공 로직
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

  // 안테나 필터링
  const series = useMemo(() => {
    if (!selectedAntenna) return allSeries;
    return allSeries.filter((s) => s.name === selectedAntenna);
  }, [allSeries, selectedAntenna]);

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
            selection: true, // 드래그 선택 기능만 남김
            zoom: false, // 돋보기 아이콘 제거
            zoomin: false, // + 버튼 제거
            zoomout: false, // - 버튼 제거
            pan: false, // 손바닥 아이콘 제거
            reset: false, // 집 모양 아이콘 제거
          },
          autoSelected: "selection", // 마우스 기본 동작을 선택 모드로 고정
        },
        selection: {
          enabled: true,
          type: "x",
          fill: {
            color: "#247BA0",
            opacity: 0.1,
          },
          stroke: {
            width: 1,
            dashArray: 3,
            color: "#247BA0",
            opacity: 0.4,
          },
        },
        events: {
          selection: (chartContext, { xaxis }) => {
            if (xaxis && onTimeRangeChange) {
              const startISO = new Date(xaxis.min).toISOString();
              const endISO = new Date(xaxis.max).toISOString();
              onTimeRangeChange(startISO, endISO);

              // 선택 후 파란 박스를 지우고 싶다면 아래 실행
              // chartContext.clearSelection();
            }
          },
        },
        foreColor: "#9CA3AF",
        background: "transparent",
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
        },
      },
      markers: {
        size: 0,
        colors: ["#fff"],
        strokeColors: series.map((s) => s.color || "#000"),
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
        style: { fontSize: "12px" },
        x: { show: true, format: "MM/dd HH:mm" },
        y: {
          formatter: (val) =>
            isDark
              ? `<span style="color: #FFFFFF; font-weight: bold;">${val.toFixed(2)} Mb/s</span>`
              : `<span style="color: #111827; font-weight: bold;">${val.toFixed(2)} Mb/s</span>`,
        },
        followCursor: true,
      },
      grid: {
        borderColor: "rgba(156, 163, 175, 0.1)",
        strokeDashArray: 4,
      },
    }),
    [isDark, isLongTerm, dayDiff, series, onTimeRangeChange],
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
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-2 pb-1">
        {allSeries.map((s) => {
          const isActive = selectedAntenna === s.name;
          const isGhosted = selectedAntenna !== null && !isActive;
          return (
            <button
              key={s.name}
              onClick={() => handleLegendClick(s.name)}
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all duration-150 ${isGhosted ? "opacity-30" : "opacity-100"} ${isActive ? "ring-1 ring-offset-1" : "hover:bg-gray-100 dark:hover:bg-gray-800"} `}
              title={isActive ? "클릭하여 전체 보기" : "클릭하여 단독 보기"}
            >
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span
                className={`transition-colors duration-150 ${isActive ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                {s.name}
              </span>
              {isActive && (
                <span
                  className="ml-0.5 rounded-full px-1 py-px text-[10px] font-bold text-white"
                  style={{ backgroundColor: s.color }}
                >
                  ON
                </span>
              )}
            </button>
          );
        })}
      </div>

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
