"use client";

import { useEffect, useState, use, useCallback } from "react";
import useSWR from "swr";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getVesselRoutes } from "@/api/vessel";
import { subHours } from "date-fns";
import Loading from "@/components/common/Loading";
import Link from "next/link";
import type { VesselRouteResponse } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";

const FIVE_MINUTES = 5 * 60 * 1000;

// ✅ Date → UTC 문자열 변환
const toUTCString = (date: Date): string => date.toISOString().slice(0, 19);

export default function VesselDetailPage() {
  const selectedVessel = useVesselStore((s) => s.selectedVessel);
  const imo = selectedVessel?.imo ? String(selectedVessel.imo) : null;

  const [isLive, setIsLive] = useState(true);
  const [liveRangeFn, setLiveRangeFn] = useState<
    (() => { start: Date; end: Date }) | null
  >(() => () => ({ start: subHours(new Date(), 24), end: new Date() }));

  // ✅ timeRange는 항상 UTC 문자열
  const [timeRange, setTimeRange] = useState({
    startAt: toUTCString(subHours(new Date(), 24)),
    endAt: toUTCString(new Date()),
  });

  // ✅ TimeSetting onApply
  const handleTimeApply = (
    start: string,
    end: string,
    live: boolean,
    rangeFn?: () => { start: Date; end: Date },
  ) => {
    console.log("[TimeSetting] isLive:", live);
    console.log("[TimeSetting] startAt (UTC):", start);
    console.log("[TimeSetting] endAt   (UTC):", end);

    setIsLive(live);
    setLiveRangeFn(live && rangeFn ? () => rangeFn : null);
    setTimeRange({ startAt: start, endAt: end });
  };

  // ✅ SWR fetcher - live면 매번 현재 시각 기준으로 재계산
  const fetcher = useCallback(async (): Promise<VesselRouteResponse> => {
    if (!imo) return { coordinates: [], dataUsages: [] };

    let startUTC = timeRange.startAt;
    let endUTC = timeRange.endAt;

    if (isLive && liveRangeFn) {
      const { start, end } = liveRangeFn();
      startUTC = toUTCString(start);
      endUTC = toUTCString(end);
    }

    // ✅ 실제 요청 시각 + 요청 파라미터 확인
    console.log("========================================");
    console.log("[SWR 요청 시각]", new Date().toISOString());
    console.log("[isLive]", isLive);
    console.log("[API 요청] imo:", imo);
    console.log("[API 요청] startAt (UTC):", startUTC);
    console.log("[API 요청] endAt   (UTC):", endUTC);
    console.log("========================================");

    return await getVesselRoutes(imo, startUTC, endUTC);
  }, [imo, timeRange, isLive, liveRangeFn]);

  const {
    data: routeData,
    isLoading,
    mutate,
  } = useSWR<VesselRouteResponse>(
    imo ? ["vesselRoutes", imo, timeRange.startAt, timeRange.endAt] : null,
    fetcher,
    {
      fallbackData: { coordinates: [], dataUsages: [] },
      refreshInterval: isLive ? FIVE_MINUTES : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: FIVE_MINUTES,
    },
  );

  // ✅ timeRange 변경 시 즉시 재요청
  useEffect(() => {
    mutate();
  }, [timeRange]);

  if (!selectedVessel || !imo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-500">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800 dark:text-white">
            Failed to load details
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Please select a vessel
          </p>
        </div>
      </div>
    );
  }

  // ✅ 차트에서 range 변경 시 (UTC 그대로 사용)
  const handleChartRangeChange = (startISO: string, endISO: string) => {
    console.log("[Chart Range] startAt (UTC):", startISO);
    console.log("[Chart Range] endAt   (UTC):", endISO);
    setIsLive(false);
    setLiveRangeFn(null);
    setTimeRange({ startAt: startISO, endAt: endISO });
  };

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Link
          href="/vessels"
          className="group flex items-center gap-2 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-transform group-hover:-translate-x-1 dark:bg-white/5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          <h1 className="text-xl font-bold tracking-tight">Vessels</h1>
        </Link>

        <div className="flex flex-shrink-0 items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 dark:bg-green-900/20">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs font-bold text-green-600 dark:text-green-400">
                Auto-updating
              </span>
            </div>
          )}
          <TimeSetting onApply={handleTimeApply} />
        </div>
      </div>

      <div className="relative flex flex-col gap-6">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
            <Loading message="Loading..." />
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <VesselDetailView
              vesselImo={imo}
              dataUsages={routeData?.dataUsages ?? []}
              coordinates={routeData?.coordinates ?? []}
              timeRange={timeRange}
              onTimeRangeChange={handleChartRangeChange}
            />
          </div>

          <div className="h-[450px] w-full lg:h-auto lg:w-1/2">
            <WorldMap
              vesselImo={imo}
              coordinates={routeData?.coordinates ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
