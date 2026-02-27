"use client";

import React, { useEffect, useState, useMemo } from "react";
import Loading from "../common/Loading";
import type { VesselDetail, DataUsage } from "@/types/vessel";
import { getVesselDetail } from "@/api/vessel";
import {
  getServiceBadgeStyles,
  getServiceColor,
} from "../common/AnntennaMapping";
import { differenceInSeconds, parseISO } from "date-fns";

interface VesselDetailViewProps {
  vesselImo: string;
  dataUsages: DataUsage[];
  timeRange?: {
    startAt: string;
    endAt: string;
  };
}

/**
 * 💡 데이터 크기에 따라 적절한 단위를 반환하는 유틸리티
 */
const formatDataSize = (bytes: number) => {
  if (bytes === 0) return { value: "0", unit: "KB" };
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // GB 이상은 소수점 2자리, 그 미만은 소수점 1자리
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1));
  return { value: value.toLocaleString(), unit: sizes[i] };
};

const VesselDetailView: React.FC<VesselDetailViewProps> = ({
  vesselImo,
  dataUsages,
  timeRange,
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

  const usageStats = useMemo(() => {
    if (!dataUsages || dataUsages.length === 0) return [];

    let totalSeconds = 24 * 3600;
    if (timeRange?.startAt && timeRange?.endAt) {
      const start = parseISO(timeRange.startAt);
      const end = parseISO(timeRange.endAt);
      totalSeconds = Math.abs(differenceInSeconds(start, end));
    }
    if (totalSeconds === 0) totalSeconds = 1;

    const aggregated = dataUsages.reduce(
      (acc, current) => {
        const name = current.name || "Unknown";
        if (!acc[name]) {
          acc[name] = {
            name: name,
            dataUsageAmount: 0,
            interfaces: [] as string[],
          };
        }
        acc[name].dataUsageAmount += current.dataUsageAmount;
        if (current.interfaceName)
          acc[name].interfaces.push(current.interfaceName);
        return acc;
      },
      {} as Record<
        string,
        { name: string; dataUsageAmount: number; interfaces: string[] }
      >,
    );

    return Object.values(aggregated).map((item) => {
      const totalBytes = item.dataUsageAmount;
      const totalBits = totalBytes * 8;
      const bps = totalBits / totalSeconds;

      // 1. 데이터 사용량 단위 변환 (TB 대응)
      const { value, unit } = formatDataSize(totalBytes);

      // 2. 평균 속도 단위 변환
      let speedText = "";
      if (bps >= 1000000) {
        speedText = `${(bps / 1000000).toFixed(2)} Mbps`;
      } else {
        speedText = `${(bps / 1000).toFixed(2)} kbps`;
      }

      return {
        ...item,
        usageValue: value,
        usageUnit: unit,
        speedText,
        color: getServiceColor(item.name),
      };
    });
  }, [dataUsages, timeRange]);

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
      {/* 🚢 상단 헤더 카드 */}
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

      {/* 🚀 데이터 사용량 합산 섹션 (Usage 강조 버전) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {usageStats.map((item) => (
          <div
            key={item.name}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-white/[0.05] dark:bg-white/[0.02]"
          >
            {/* 배경 강조 포인트 */}
            <div
              className="absolute -top-4 -right-4 h-24 w-24 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]"
              style={{ backgroundColor: item.color, borderRadius: "50%" }}
            />

            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="ring-opacity-10 h-2.5 w-2.5 rounded-full ring-4"
                    style={{
                      backgroundColor: item.color,
                      borderColor: item.color,
                    }}
                  />
                  <span className="text-xs font-extrabold tracking-widest text-gray-500 uppercase">
                    {item.name}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-gray-400">
                  {item.interfaces.join(" · ")}
                </span>
              </div>

              {/* Usage 강조 영역 */}
              <div className="mb-4">
                <p className="text-[10px] font-bold tracking-tighter text-blue-500 uppercase dark:text-blue-400">
                  Total Data Usage
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    {item.usageValue}
                  </span>
                  <span className="text-sm font-bold text-gray-400 uppercase">
                    {item.usageUnit}
                  </span>
                </div>
              </div>
            </div>

            {/* 하단 Speed 정보 */}
            <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-gray-400 uppercase">
                  Avg. Speed
                </span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {item.speedText}
                </span>
              </div>
              <div className="rounded-md bg-gray-50 px-2 py-1 dark:bg-white/5">
                <span className="text-[10px] font-bold tracking-tight text-gray-400 uppercase">
                  Real-time Stats
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 📄 통합된 정보 카드 */}
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
