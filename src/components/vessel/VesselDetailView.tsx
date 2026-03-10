"use client";

import React, { useEffect, useState, useMemo } from "react";
import Loading from "../common/Loading";
import type { VesselDetail, DataUsage, RouteCoordinate } from "@/types/vessel";
// import { getVesselDetail } from "@/app/api/vessel/vessel";
import { getVesselDetail } from "@/api/vessel";
import {
  getServiceBadgeStyles,
  getServiceColor,
} from "../common/AnntennaMapping";
import { differenceInSeconds, parseISO } from "date-fns";
import LineChartOne from "../charts/line/LineChartOne";
import VesselCommandOne from "./VesselCommandOne";
import VesselEditModal from "./VesselEditModal";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { SktelinkIcon } from "@/icons";

interface VesselDetailViewProps {
  vesselImo: string;
  dataUsages: DataUsage[];
  coordinates: RouteCoordinate[];
  timeRange?: {
    startAt: string;
    endAt: string;
  };
  onTimeRangeChange?: (start: string, end: string) => void;
}

const formatDataSize = (bytes: number) => {
  if (bytes === 0) return { value: "0", unit: "KB" };
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1));
  return { value: value.toLocaleString(), unit: sizes[i] };
};

type ViewMode = "OVERVIEW" | "COMMANDS";

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
  const [viewMode, setViewMode] = useState<ViewMode>("OVERVIEW");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    if (!coordinates || coordinates.length === 0) return [];
    let totalSeconds = 24 * 3600;
    if (timeRange?.startAt && timeRange?.endAt) {
      const start = parseISO(timeRange.startAt);
      const end = parseISO(timeRange.endAt);
      totalSeconds = Math.abs(differenceInSeconds(start, end));
    }
    if (totalSeconds === 0) totalSeconds = 1;

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
      const bps = (totalBytes * 8) / totalSeconds;
      const { value, unit } = formatDataSize(totalBytes);
      const speedText =
        bps >= 1000000
          ? `${(bps / 1000000).toFixed(2)} Mbps`
          : `${(bps / 1000).toFixed(2)} kbps`;

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-row items-center gap-3">
            {/* ✅ 선박명과 로고 아이콘 로직 */}
            <div className="flex items-center gap-2">
              {data.logo === "sktelink" && (
                <SktelinkIcon className="h-6 w-auto" />
              )}
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                {data.name}
              </h3>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-[12px] font-black tracking-wider uppercase ${getServiceBadgeStyles(data.status?.antennaServiceName)}`}
            >
              {data.status?.antennaServiceName || "N/A"}
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            <button
              onClick={() => setViewMode("OVERVIEW")}
              className={`rounded-md px-4 py-2 text-xs font-bold transition-all ${
                viewMode === "OVERVIEW"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode("COMMANDS")}
              className={`rounded-md px-4 py-2 text-xs font-bold transition-all ${
                viewMode === "COMMANDS"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Commands
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">{data.description}</p>
      </div>

      {/* 2. 조건부 컨텐츠 영역 */}
      {viewMode === "OVERVIEW" ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {usageStats.map((item) => (
              <div
                key={item.name}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md dark:border-white/[0.05] dark:bg-white/[0.02]"
              >
                <div
                  className="absolute -top-4 -right-4 h-24 w-24 opacity-[0.03]"
                  style={{ backgroundColor: item.color, borderRadius: "50%" }}
                />
                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
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
                    <p className="text-[12px] font-bold text-blue-500 uppercase">
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
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
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
        </>
      ) : (
        <VesselCommandOne imo={Number(vesselImo)} />
      )}

      {/* 3. 공통 선박 상세 정보 (수정 버튼 포함) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-6 flex items-center justify-between">
          <h4 className="mb-4 text-sm font-bold tracking-wider text-gray-500 uppercase">
            Vessel Info
          </h4>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Edit Info
          </button>
        </div>
        <hr className="mb-6 border-gray-100 dark:border-white/5" />
        <div className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          <div className="space-y-4">
            <DetailItem label="IMO" value={data.imo} />
            <DetailItem label="MMSI" value={data.mmsi} />
            <DetailItem label="Call Sign" value={data.callsign} />
            <DetailItem label="FW ID" value={data.fireWallId} />
          </div>
          <div className="space-y-4">
            <DetailItem label="VPN IP" value={data.vpn_ip} />
            <DetailItem label="Manager" value={data.manager} />
            <DetailItem label="Mail" value={data.mailAddress} />
            <DetailItem label="FW PW" value={data.fireWallPassword} />
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <VesselEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          vesselData={data}
        />
      )}
    </div>
  );
};

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0 dark:border-white/[0.05]">
    <span className="text-xs font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">
      {label}
    </span>
    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
      {value || "-"}
    </span>
  </div>
);

export default VesselDetailView;
