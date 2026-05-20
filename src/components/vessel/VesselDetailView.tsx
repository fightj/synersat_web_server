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
import VesselDeleteAlert from "./VesselDeleteAlert";
import { SktelinkIcon, GrafanaDashIcon } from "@/icons";
import { deleteVessel, antennaUpdate, vesselSmartboxUpdate, resetCore } from "@/api/vessel";
import { updatePrepayEnabled } from "@/api/crew-account";
import { useRouter } from "next/navigation";
import { AnimatedCounter } from "../ui/animated-counter";
import Button from "../ui/button/Button";
import GrafanaDashModal from "./GrafanaDashModal";
import { Modal } from "@/components/ui/modal";

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
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGrafana, setShowGrafana] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [prepaidEnabled, setPrepaidEnabled] = useState<boolean>(false);
  const [prepaidLoading, setPrepaidLoading] = useState(false);
  const router = useRouter();

  const handleDeleteVessel = async () => {
    if (!data) return;
    try {
      setIsDeleting(true);
      if (await deleteVessel([data.imo])) {
        setIsDeleteAlertOpen(false);
        router.push("/vessels");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

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
        setPrepaidEnabled(result.prepaidEnabled ?? false);
      } catch (err: any) {
        setError(err.message || "데이터 호출 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    if (vesselImo) fetchVesselDetail();
  }, [vesselImo]);

  const handlePrepaidToggle = async () => {
    if (!data || prepaidLoading) return;
    const next = !prepaidEnabled;
    setPrepaidEnabled(next);
    setPrepaidLoading(true);
    try {
      await updatePrepayEnabled(data.imo, next);
    } catch {
      setPrepaidEnabled(!next);
    } finally {
      setPrepaidLoading(false);
    }
  };

  // antennaDisplayName → 표기 라벨 매핑
  const DISPLAY_NAME_MAP: Record<string, string> = {
    "VSAT-Failover": "FBB",
    "LTE": "4G",
    "OneWEB": "OneWEB",
    "FBB-Failover": "FBB",
  };

  const getBreakdownLabel = (displayName: string | null, groupName: string) => {
    if (!displayName) return groupName;
    const mapped = DISPLAY_NAME_MAP[displayName];
    if (!mapped) return displayName;
    // 매핑된 이름과 원래 displayName이 같으면 그냥 표기 (예: OneWEB)
    if (mapped === displayName) return displayName;
    return `${mapped}(${displayName})`;
  };

  const usageStats = useMemo(() => {
    if (!_dataUsages || _dataUsages.length === 0) return [];
    let totalSeconds = 24 * 3600;
    if (timeRange?.startAt && timeRange?.endAt) {
      const start = parseISO(timeRange.startAt);
      const end = parseISO(timeRange.endAt);
      totalSeconds = Math.abs(differenceInSeconds(start, end));
    }
    if (totalSeconds === 0) totalSeconds = 1;

    type AggEntry = {
      name: string;
      dataUsageAmount: number;
      interfaces: Set<string>;
      items: Array<{ displayName: string | null; dataUsageAmount: number }>;
    };

    // name 기준으로 그룹화 — antennaDisplayName이 달라도 name이 같으면 합산
    const aggregated = _dataUsages.reduce(
      (acc, usage) => {
        const name = usage.name || "Unknown";
        if (!acc[name]) {
          acc[name] = { name, dataUsageAmount: 0, interfaces: new Set<string>(), items: [] };
        }
        acc[name].dataUsageAmount += usage.dataUsageAmount;
        if (usage.interfaceName) acc[name].interfaces.add(usage.interfaceName);
        acc[name].items.push({ displayName: usage.antennaDisplayName, dataUsageAmount: usage.dataUsageAmount });
        return acc;
      },
      {} as Record<string, AggEntry>,
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
  }, [_dataUsages, timeRange]);

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
            {(() => {
              const available = data.status?.available;
              const discard = data.status?.discard;
              const displayName = data.status?.antennaServiceDisplayName ?? null;
              const isInactive = !available && discard === true;
              const isOffline = !available && !isInactive;
              const badgeLabel = isInactive ? "Inactive" : isOffline ? "Offline" : (displayName ?? "N/A");
              const badgeClass = isInactive
                ? "bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
                : isOffline
                ? "bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                : getServiceBadgeStyles(displayName);
              return (
                <span className={`rounded-full px-3 py-1 text-[12px] font-black tracking-wider uppercase ${badgeClass}`}>
                  {badgeLabel}
                </span>
              );
            })()}

            {/* Prepaid 토글 */}
            <button
              type="button"
              role="switch"
              aria-checked={prepaidEnabled}
              onClick={handlePrepaidToggle}
              disabled={prepaidLoading}
              className={`relative flex h-[26px] w-[82px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                prepaidEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              } ${prepaidLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span
                className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  prepaidEnabled ? "translate-x-[58px]" : "translate-x-0.5"
                }`}
              />
              <span className={`w-full text-center text-[10px] font-bold tracking-wide text-white uppercase transition-all duration-300 ${
                prepaidEnabled ? "pr-5" : "pl-5"
              }`}>
                Prepaid
              </span>
            </button>

            {/* Grafana Dashboard 버튼 */}
            <button
              onClick={() => setShowGrafana(true)}
              title="Grafana Dashboard"
              className="flex items-center justify-center transition-all hover:scale-110"
            >
              <GrafanaDashIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </button>
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
                <div className="flex items-center gap-2">
                  
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                  >
                    Edit Info
                  </button>
                  <button
                    onClick={() => setIsDeleteAlertOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 transition-all hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
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
              <div className="flex items-center gap-2 mt-4">
                <Button
                    size="xs"
                    onClick={async () => {
                      if (!data) return;
                      await vesselSmartboxUpdate(data.imo);
                      setViewMode("COMMANDS");
                      router.refresh();
                    }}
                  >
                    Run Update.sh
                  </Button>
                  <Button
                    size="xs"
                    onClick={async () => {
                      if (!data) return;
                      await antennaUpdate(data.imo);
                      setViewMode("COMMANDS");
                      router.refresh();
                    }}
                  >
                    Mapping Update
                  </Button>
                  <Button
                    size="xs"
                    onClick={async () => {
                      if (!data) return;
                      await resetCore(data.imo);
                      setViewMode("COMMANDS");
                      router.refresh();
                    }}
                  >
                    Reset Core
                  </Button>
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

                <div className="mt-2 border-t border-gray-50 pt-3 dark:border-white/5">
                  <div className="flex items-start justify-between gap-3">
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

                    {/* 동일 name 내 개별 항목 breakdown — 2개 이상일 때만 표시 */}
                    {item.items.length > 1 && (
                      <div className="flex flex-col items-end gap-0.5">
                        {item.items.map((sub, idx) => {
                          const { value: subVal, unit: subUnit } = formatDataSize(sub.dataUsageAmount);
                          const label = getBreakdownLabel(sub.displayName, item.name);
                          return (
                            <span key={idx} className="font-mono text-[10px] text-gray-400">
                              <span className="font-semibold text-gray-500">{label}</span>
                              {": "}
                              {subVal} {subUnit}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Data Usage History + 스캔 라인 ─────────────────────── */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <ScanLine isScanning={showScan} scanKey={scanKey} />
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                Data Usage History
              </h4>
              <button
                onClick={() => setChartExpanded(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
                title="Expand chart"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
            <div className="h-[250px] w-full">
              <LineChartOne
                coordinates={coordinates}
                timeRange={timeRange}
                onTimeRangeChange={onTimeRangeChange}
              />
            </div>
          </div>

          {/* ── Chart Expand Modal ───────────────────────────────────── */}
          <Modal isOpen={chartExpanded} onClose={() => setChartExpanded(false)} showCloseButton={false} className="w-[96vw] max-w-[1400px] overflow-hidden p-0">
            <div className="flex flex-col" style={{ height: "85vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
                <h3 className="text-base font-bold tracking-wider text-gray-600 uppercase dark:text-gray-300">Data Usage History</h3>
                <button
                  onClick={() => setChartExpanded(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 p-6">
                <LineChartOne
                  coordinates={coordinates}
                  timeRange={timeRange}
                  onTimeRangeChange={onTimeRangeChange}
                />
              </div>
            </div>
          </Modal>
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
      <VesselDeleteAlert
        isOpen={isDeleteAlertOpen}
        isDeleting={isDeleting}
        targetVesselName={data.name || ""}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDeleteVessel}
      />

      {showGrafana && (
        <GrafanaDashModal
          vessel={{
            id: data.id,
            name: data.name,
            callsign: data.callsign,
            imo: data.imo,
            mmsi: data.mmsi,
            vpnIp: data.vpn_ip,
            enabled: true,
            description: data.description,
            acct: data.acct,
            fireWallPassword: data.fireWallPassword,
            serialNumber: data.serialNumber,
          }}
          onClose={() => setShowGrafana(false)}
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
