"use client";

import { useEffect, useState, use } from "react";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getVesselRoutes } from "@/api/vessel";
import { format, subHours, parseISO, addHours } from "date-fns";
import Loading from "@/components/common/Loading";
import Link from "next/link";
import type { VesselRouteResponse } from "@/types/vessel";

interface VesselDetailPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ imo?: string }>;
}

export default function VesselDetailPage({
  params,
  searchParams,
}: VesselDetailPageProps) {
  const { name } = use(params);
  const { imo } = use(searchParams);

  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<VesselRouteResponse>({
    coordinates: [],
    dataUsages: [],
  });

  const [timeRange, setTimeRange] = useState({
    startAt: format(subHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm:ss"),
    endAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
  });

  const fetchData = async (startKST: string, endKST: string) => {
    if (!imo) return;
    try {
      setLoading(true);
      const startUTC = format(
        subHours(parseISO(startKST), 9),
        "yyyy-MM-dd'T'HH:mm:ss",
      );
      const endUTC = format(
        subHours(parseISO(endKST), 9),
        "yyyy-MM-dd'T'HH:mm:ss",
      );

      const data = await getVesselRoutes(imo, startUTC, endUTC);
      setRouteData(data);
    } catch (error) {
      console.error("Failed to fetch route data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeRange.startAt, timeRange.endAt);
  }, [imo, timeRange]);

  if (!imo) {
    return (
      <div className="p-10 text-center text-red-500">
        Invalid Access: Vessel IMO is missing.
      </div>
    );
  }
  const handleChartRangeChange = (startISO: string, endISO: string) => {
    const startUTC = format(parseISO(startISO), "yyyy-MM-dd'T'HH:mm:ss");
    const endUTC = format(parseISO(endISO), "yyyy-MM-dd'T'HH:mm:ss");

    setTimeRange({ startAt: startUTC, endAt: endUTC });
  };
  return (
    <div className="space-y-6 p-2">
      {/* 헤더: 뒤로가기 및 타임 피커 */}
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

        <div className="flex-shrink-0">
          <TimeSetting
            onApply={(start, end) =>
              setTimeRange({ startAt: start, endAt: end })
            }
          />
        </div>
      </div>

      <div className="relative flex flex-col gap-6">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
            <Loading />
          </div>
        )}

        {/* 1. 상단 섹션: 상세 정보(DetailView)와 지도(WorldMap)를 1:1 비율로 배치 */}
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <VesselDetailView
              vesselImo={imo}
              dataUsages={routeData.dataUsages}
              coordinates={routeData.coordinates}
              timeRange={timeRange}
              onTimeRangeChange={handleChartRangeChange} // ✅ 콜백 전달
            />
          </div>

          <div className="h-[450px] w-full lg:h-auto lg:w-1/2">
            <WorldMap vesselImo={imo} coordinates={routeData.coordinates} />
          </div>
        </div>
      </div>
    </div>
  );
}
