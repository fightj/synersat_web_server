"use client";

import { useEffect, useState, use } from "react";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getVesselRoutes, type VesselRouteResponse } from "@/api/vessel";
import { format, subHours, parseISO } from "date-fns";
import Loading from "@/components/common/Loading";
import Link from "next/link";

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

  /**
   * 💡 날짜 상태 관리
   * UI 표시용으로는 KST(현재 시간)를 유지하고,
   * API 요청 시에만 UTC로 변환하여 보냅니다.
   */
  const [timeRange, setTimeRange] = useState({
    startAt: format(subHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm:ss"),
    endAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
  });

  // API 호출 함수
  const fetchData = async (startKST: string, endKST: string) => {
    if (!imo) return;
    try {
      setLoading(true);

      /**
       * 🚀 UTC 변환 로직 (-9시간)
       * 서버가 UTC 기준 데이터를 가지고 있으므로, KST 문자열을 파싱해 9시간을 뺍니다.
       */
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

  return (
    <div className="p-2">
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

      <div className="relative mt-6 flex flex-col items-start gap-6 lg:flex-row">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
            <Loading />
          </div>
        )}

        <div className="w-full lg:w-1/2">
          {/* 💡 VesselDetailView에도 현재 timeRange를 넘겨주어 평균 속도 계산 시 사용하게 합니다. */}
          <VesselDetailView
            vesselImo={imo}
            dataUsages={routeData.dataUsages}
            timeRange={timeRange}
          />
        </div>

        <div className="h-fit w-full lg:w-1/2">
          <WorldMap vesselImo={imo} coordinates={routeData.coordinates} />
        </div>
      </div>
    </div>
  );
}
