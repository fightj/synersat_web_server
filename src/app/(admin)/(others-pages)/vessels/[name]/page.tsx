"use client";

import { useEffect, useState, use } from "react";
import VesselDetailView from "@/components/vessel/VesselDetailView";
import WorldMap from "@/components/map/WorldMap";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getVesselRoutes, type VesselRouteResponse } from "@/api/vessel";
import { format, subHours } from "date-fns";
import Loading from "@/components/common/Loading";

interface VesselDetailPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ imo?: string }>;
}

export default function VesselDetailPage({
  params,
  searchParams,
}: VesselDetailPageProps) {
  // Next.js 15의 Promise 타입 대응을 위해 use() 사용
  const { name } = use(params);
  const { imo } = use(searchParams);

  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<VesselRouteResponse>({
    coordinates: [],
    dataUsages: [],
  });

  // 날짜 상태 관리 (초기값: 최근 24시간)
  const [timeRange, setTimeRange] = useState({
    startAt: format(subHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm:ss"),
    endAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
  });

  // API 호출 함수
  const fetchData = async (start: string, end: string) => {
    if (!imo) return;
    try {
      setLoading(true);
      const data = await getVesselRoutes(imo, start, end);
      setRouteData(data);
    } catch (error) {
      console.error("Failed to fetch route data:", error);
    } finally {
      setLoading(false);
    }
  };

  // IMO나 날짜가 변경될 때 호출
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
        {/* 왼쪽: 필요 시 제목 등을 넣을 수 있는 공간 */}
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {/* {decodeURIComponent(name)} */}
        </h1>

        {/* 오른쪽: TimeSetting 컴포넌트 */}
        <div className="flex-shrink-0">
          <TimeSetting
            onApply={(start, end) =>
              setTimeRange({ startAt: start, endAt: end })
            }
          />
        </div>
      </div>

      <div className="relative mt-6 flex flex-col items-start gap-6 lg:flex-row">
        {/* 로딩 오버레이 */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-black/20">
            <Loading />
          </div>
        )}

        <div className="w-full lg:w-1/2">
          <VesselDetailView vesselImo={imo} dataUsages={routeData.dataUsages} />
        </div>

        <div className="h-fit w-full lg:w-1/2">
          <WorldMap vesselImo={imo} coordinates={routeData.coordinates} />
        </div>
      </div>
    </div>
  );
}
