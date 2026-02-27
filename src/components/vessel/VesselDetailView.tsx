"use client";

import React, { useEffect, useState, useMemo } from "react";
import Loading from "../common/Loading";
import type { VesselDetail, DataUsage, RouteCoordinate } from "@/types/vessel";
import { getVesselDetail } from "@/api/vessel";
import {
  getServiceBadgeStyles,
  getServiceColor,
} from "../common/AnntennaMapping";
import { differenceInSeconds, parseISO } from "date-fns";
// 추후 DataUsageLineChart 등으로 명칭 변경 가능
import LineChartOne from "../charts/line/LineChartOne";

interface VesselDetailViewProps {
  vesselImo: string;
  dataUsages: DataUsage[]; // 기존 요약 데이터 (필요 시 사용)
  coordinates: RouteCoordinate[]; // ✅ 추가된 시계열 데이터
  timeRange?: {
    startAt: string;
    endAt: string;
  };
  onTimeRangeChange?: (start: string, end: string) => void;
}

/**
 * 💡 데이터 크기에 따라 적절한 단위를 반환하는 유틸리티
 */
const formatDataSize = (bytes: number) => {
  if (bytes === 0) return { value: "0", unit: "KB" };
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1));
  return { value: value.toLocaleString(), unit: sizes[i] };
};

const VesselDetailView: React.FC<VesselDetailViewProps> = ({
  vesselImo,
  dataUsages,
  coordinates,
  timeRange,
  onTimeRangeChange,
}) => {
  const [data, setData] = useState<VesselDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVesselDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getVesselDetail(vesselImo);
        setData(result);
      } catch (err: any) {
        setError(err.message || "데이터 호출 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (vesselImo) fetchVesselDetail();
  }, [vesselImo]);

  /**
   * 💡 coordinates 내부의 dataUsages를 순회하여 안테나별 총 사용량을 합산합니다.
   * API 구조 변경에 따라 coordinates 기반으로 통계를 내는 것이 더 정확합니다.
   */
  const usageStats = useMemo(() => {
    if (!coordinates || coordinates.length === 0) return [];

    let totalSeconds = 24 * 3600;
    if (timeRange?.startAt && timeRange?.endAt) {
      const start = parseISO(timeRange.startAt);
      const end = parseISO(timeRange.endAt);
      totalSeconds = Math.abs(differenceInSeconds(start, end));
    }
    if (totalSeconds === 0) totalSeconds = 1;

    // coordinates 내부의 모든 dataUsages를 평탄화하여 합산
    const aggregated = coordinates.reduce(
      (acc, coord) => {
        coord.dataUsages.forEach((usage) => {
          const name = usage.antennaName || "Unknown";
          if (!acc[name]) {
            acc[name] = {
              name: name,
              dataUsageAmount: 0,
              interfaces: new Set<string>(),
            };
          }
          acc[name].dataUsageAmount += usage.dataUsage;
          if (usage.interfaceName)
            acc[name].interfaces.add(usage.interfaceName);
        });
        return acc;
      },
      {} as Record<
        string,
        { name: string; dataUsageAmount: number; interfaces: Set<string> }
      >,
    );

    return Object.values(aggregated).map((item) => {
      const totalBytes = item.dataUsageAmount;
      const totalBits = totalBytes * 8;
      const bps = totalBits / totalSeconds;

      const { value, unit } = formatDataSize(totalBytes);

      let speedText = "";
      if (bps >= 1000000) {
        speedText = `${(bps / 1000000).toFixed(2)} Mbps`;
      } else {
        speedText = `${(bps / 1000).toFixed(2)} kbps`;
      }

      return {
        ...item,
        interfaces: Array.from(item.interfaces),
        usageValue: value,
        usageUnit: unit,
        speedText,
        color: getServiceColor(item.name),
      };
    });
  }, [coordinates, timeRange]);

  if (loading)
    return (
      <div className="py-20">
        <Loading />
      </div>
    );
  if (error)
    return <div className="py-20 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-20 text-center">데이터가 없습니다.</div>;

  return (
    <div className="space-y-6">
      {/* 1. 상단 헤더 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-row items-center gap-3">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {data.name}
          </h3>
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-black tracking-wider uppercase ${getServiceBadgeStyles(
              data.status?.antennaServiceName,
            )}`}
          >
            {data.status?.antennaServiceName || "N/A"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{data.description}</p>
      </div>

      {/* 2. 데이터 사용량 요약 섹션 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {usageStats.map((item) => (
          <div
            key={item.name}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/[0.05] dark:bg-white/[0.02]"
          >
            <div
              className="absolute -top-4 -right-4 h-24 w-24 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]"
              style={{ backgroundColor: item.color, borderRadius: "50%" }}
            />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="ring-opacity-10 h-2.5 w-2.5 rounded-full ring-2"
                    style={{
                      backgroundColor: item.color,
                      borderColor: item.color,
                    }}
                  />
                  <span className="text-sm font-extrabold tracking-widest text-gray-500 uppercase">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-gray-400">
                  {item.interfaces.join(" · ")}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-[12px] font-bold tracking-tighter text-blue-500 uppercase dark:text-blue-400">
                  Total Data Usage
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">
                    {item.usageValue}
                  </span>
                  <span className="text-md font-bold text-gray-400 uppercase">
                    {item.usageUnit}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-gray-400 uppercase">
                  Avg. Speed
                </span>
                <span className="text-md font-bold text-gray-700 dark:text-gray-300">
                  {item.speedText}
                </span>
              </div>
              <div className="rounded-md bg-gray-50 px-2 py-1 dark:bg-white/5">
                <span className="text-[10px] font-bold tracking-tight text-gray-400 uppercase">
                  Period Stats
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. 라인 차트 섹션 (Usage 밑 / Vessel Info 위) */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02]">
        <h4 className="mb-4 text-sm font-bold tracking-wider text-gray-500 uppercase">
          Data Usage History
        </h4>
        <div className="h-[250px] w-full">
          <LineChartOne
            coordinates={coordinates}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
          />
        </div>
      </div>

      {/* 4. 선박 정보 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          Vessel Information
        </h4>
        <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          <div className="space-y-4">
            <DetailItem label="IMO Number" value={data.imo} />
            <DetailItem label="MMSI" value={data.mmsi} />
            <DetailItem label="Call Sign" value={data.callsign} />
            <DetailItem label="System ID" value={data.id} />
          </div>
          <div className="space-y-4">
            <DetailItem label="VPN IP Address" value={data.vpn_ip} />
            <DetailItem label="Manager" value={data.manager} />
            <DetailItem label="Contact Mail" value={data.mailAddress} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- 보조 컴포넌트 --- */
const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0 dark:border-white/[0.05]">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-800 dark:text-white/90">
      {value || "-"}
    </span>
  </div>
);

export default VesselDetailView;
