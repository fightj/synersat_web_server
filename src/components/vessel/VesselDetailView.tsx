"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Loading from "../common/Loading";
import type { VesselDetail, DataUsage, RouteCoordinate } from "@/types/vessel";
import { getVesselDetail } from "@/api/vessel";
import {
  getServiceBadgeStyles,
  getServiceColor,
} from "../common/AnntennaMapping";
import { differenceInSeconds, parseISO } from "date-fns";
import LineChartOne from "../charts/line/LineChartOne";
import VesselCommandOne from "./VesselCommandOne";
import VesselFormModal from "./VesselFormModal";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { SktelinkIcon } from "@/icons";
import { AnimatedCounter } from "../ui/animated-counter";

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
  if (bytes === 0) return { raw: 0, value: "0", unit: "KB" };
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const raw = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1));
  return { raw, value: raw.toLocaleString(), unit: sizes[i] };
};

type ViewMode = "OVERVIEW" | "COMMANDS";

// 재사용 스캔 라인 조각 — 각 컨테이너 최상단에 absolute로 삽입
function ScanLine({ isScanning, scanKey }: { isScanning: boolean; scanKey: number }) {
  if (!isScanning) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
      <div
        key={scanKey}
        className="absolute inset-y-0 w-1/3"
        style={{
          background: "linear-gradient(90deg, transparent, #38bdf8cc, #818cf8cc, #38bdf8cc, transparent)",
          animation: "map-refresh-scan 1.2s cubic-bezier(0.4,0,0.6,1) forwards",
          boxShadow: "0 0 8px 2px #38bdf860",
        }}
      />
    </div>
  );
}

const VesselDetailView: React.FC<VesselDetailViewProps> = ({
  vesselImo,
  dataUsages: _dataUsages,
  coordinates,
  timeRange,
  onTimeRangeChange,
}) => {
  const [data, setData] = useState<VesselDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("OVERVIEW");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // ── 스캔 라인 상태 ─────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const prevCoordinatesRef = useRef<RouteCoordinate[] | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초 1회 + SWR 데이터 변경 시 스캔 트리거
  useEffect(() => {
    const isFirst = prevCoordinatesRef.current === null;
    const hasChanged = prevCoordinatesRef.current !== coordinates;
    if (!isFirst && !hasChanged) return;
    prevCoordinatesRef.current = coordinates;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setScanKey((k) => k + 1);
    setIsScanning(true);
    scanTimerRef.current = setTimeout(() => setIsScanning(false), 1400);
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [coordinates]);

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
              name,
              dataUsageAmount: 0,
              interfaces: new Set<string>(),
            };
          }
          acc[name].dataUsageAmount += usage.dataUsage;
          if (usage.interfaceName) acc[name].interfaces.add(usage.interfaceName);
        });
        return acc;
      },
      {} as Record<string, { name: string; dataUsageAmount: number; interfaces: Set<string> }>,
    );

    return Object.values(aggregated).map((item) => {
      const totalBytes = item.dataUsageAmount;
      const bps = (totalBytes * 8) / totalSeconds;
      const { raw, value, unit } = formatDataSize(totalBytes);
      const bpsRaw = bps >= 1000000 ? bps / 1000000 : bps / 1000;
      const bpsSuffix = bps >= 1000000 ? " Mbps" : " kbps";
      return {
        ...item,
        interfaces: Array.from(item.interfaces),
        usageRaw: raw,
        usageValue: value,
        usageUnit: unit,
        bpsRaw,
        bpsSuffix,
        color: getServiceColor(item.name),
      };
    });
  }, [coordinates, timeRange]);

  if (loading)
    return (
      <div className="py-20">
        <Loading message="Fetching data..." />
      </div>
    );
  if (error)
    return <div className="py-20 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-20 text-center">데이터가 없습니다.</div>;

  // 데이터가 있을 때만 스캔 라인 표시
  const showScan = isScanning && usageStats.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. 상단 헤더 카드 (Vessel Info 아코디언 포함) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* 선박명 + 상태 뱃지 */}
          <div className="flex flex-row items-center gap-3">
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

          {/* 오른쪽: 탭 스위치 + 상세정보 토글 */}
          <div className="flex items-center gap-2">
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

            {/* Vessel Info 토글 버튼 */}
            <button
              onClick={() => setIsInfoExpanded((v) => !v)}
              title="Vessel Info"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500 dark:border-white/10 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-300 ${isInfoExpanded ? "rotate-180" : "rotate-0"}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        <p className="mt-1 text-sm text-gray-500">{data.description}</p>

        {/* ── Vessel Info 아코디언 ── */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isInfoExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-5 border-t border-gray-100 pt-5 dark:border-white/5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                  Vessel Info
                </span>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                  Edit Info
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-12 gap-y-2 md:grid-cols-2">
                <div className="space-y-2">
                  <DetailItem label="Account" value={data.acct} />
                  <DetailItem label="IMO" value={data.imo} />
                  <DetailItem label="MMSI" value={data.mmsi} />
                  <DetailItem label="Call Sign" value={data.callsign} />
                  <DetailItem label="FW ID" value={data.fireWallId} />
                </div>
                <div className="space-y-2">
                  <DetailItem label="S/N" value={data.serialNumber} />
                  <DetailItem label="VPN IP" value={data.vpn_ip} />
                  <DetailItem label="Manager" value={data.manager} />
                  <DetailItem label="Mail" value={data.mailAddress} />
                  <DetailItem label="FW PW" value={data.fireWallPassword} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 조건부 컨텐츠 영역 */}
      {viewMode === "OVERVIEW" ? (
        <>
          {/* ── Total Data Usage: 각 카드 상단에 개별 스캔 라인 ─────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {usageStats.map((item) => (
              <div
                key={item.name}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-white p-5 transition-all hover:shadow-md dark:border-white/[0.05] dark:bg-white/[0.02]"
              >
                {/* 카드 개별 스캔 라인 (데이터 있을 때만) */}
                <ScanLine isScanning={showScan} scanKey={scanKey} />

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
                      <AnimatedCounter
                        value={item.usageRaw}
                        duration={1200}
                        formatOptions={{
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }}
                        className="text-4xl font-black text-gray-900 dark:text-white"
                      />
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
                    <AnimatedCounter
                      value={item.bpsRaw}
                      duration={1200}
                      suffix={item.bpsSuffix}
                      formatOptions={{
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }}
                      className="text-md font-bold text-gray-700 dark:text-gray-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Data Usage History + 스캔 라인 ─────────────────────── */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <ScanLine isScanning={showScan} scanKey={scanKey} />
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

      {isEditModalOpen && (
        <VesselFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode="edit"
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
