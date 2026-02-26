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

  /**
   * 💡 1. 이름별 데이터 합산 및 평균 속도 계산 로직
   */
  const usageStats = useMemo(() => {
    if (!dataUsages || dataUsages.length === 0) return [];

    // 시간 차이(초) 계산
    let totalSeconds = 24 * 3600;
    if (timeRange?.startAt && timeRange?.endAt) {
      const start = parseISO(timeRange.startAt);
      const end = parseISO(timeRange.endAt);
      totalSeconds = Math.abs(differenceInSeconds(start, end));
    }
    if (totalSeconds === 0) totalSeconds = 1;

    // 이름(name) 기준으로 데이터 합산
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

    // 합산된 데이터를 기반으로 속도 및 UI용 데이터 가공
    return Object.values(aggregated).map((item) => {
      const totalBytes = item.dataUsageAmount;
      const totalBits = totalBytes * 8;
      const bps = totalBits / totalSeconds;

      const gbUsage = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      let speedText = "";
      if (bps >= 1000000) {
        speedText = `${(bps / 1000000).toFixed(2)} Mbps`;
      } else {
        speedText = `${(bps / 1000).toFixed(2)} kbps`;
      }

      return {
        ...item,
        gbUsage,
        speedText,
        // AnntennaMapping에서 정의된 색상 코드 가져오기
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

      {/* 🚀 데이터 사용량 합산 섹션 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {usageStats.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }} // getServiceColor에서 가져온 색상 적용
                />
                <span className="text-[11px] font-bold tracking-tight text-gray-400 uppercase">
                  {item.name}
                </span>
              </div>
              <span className="font-mono text-[9px] text-gray-400 opacity-60">
                {item.interfaces.join(", ")}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-tighter text-gray-400 uppercase">
                  Total Avg. Speed
                </p>
                <p className="text-xl font-black text-gray-800 dark:text-gray-100">
                  {item.speedText}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium tracking-tighter text-gray-400 uppercase">
                  Total Usage
                </p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {item.gbUsage} <span className="text-[10px]">GB</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 📄 통합된 정보 카드 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          Info
        </h4>
        <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          <div className="space-y-4">
            <DetailItem label="IMO" value={data.imo} />
            <DetailItem label="MMSI" value={data.mmsi} />
            <DetailItem label="Call Sign" value={data.callsign} />
            <DetailItem label="Vessel ID" value={data.id} />
          </div>
          <div className="space-y-4">
            <DetailItem label="VPN IP" value={data.vpn_ip} />
            <DetailItem label="Manager" value={data.manager} />
            <DetailItem label="Mail" value={data.mailAddress} />
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
