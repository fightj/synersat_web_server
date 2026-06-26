"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import useSWR from "swr";
import type { TimeStampDataUsage, DataUsage } from "@/types/vessel";
import { getVesselAntennas } from "@/api/vessel";
import { getServiceColor } from "../common/AnntennaMapping";
import { differenceInSeconds, parseISO } from "date-fns";
import LineChartOne from "../charts/line/LineChartOne";
import VesselCommandOne from "./VesselCommandOne";
import { AnimatedCounter } from "../ui/animated-counter";
import { Modal } from "@/components/ui/modal";

interface VesselDetailViewProps {
  vesselImo: string;
  timeStampDataUsages: TimeStampDataUsage[];
  isLoadingData?: boolean;
  timeRange?: {
    startAt: string;
    endAt: string;
  };
  onTimeRangeChange?: (start: string, end: string) => void;
  viewMode?: ViewMode;
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
  if (mapped === displayName) return displayName;
  return `${mapped}(${displayName})`;
};

const VesselDetailView: React.FC<VesselDetailViewProps> = ({
  vesselImo,
  timeStampDataUsages,
  isLoadingData = false,
  timeRange,
  onTimeRangeChange,
  viewMode: viewModeProp,
}) => {
  const viewMode = viewModeProp ?? "OVERVIEW";
  const [chartExpanded, setChartExpanded] = useState(false);

  // ── 안테나별 집계 데이터 (카드 패널용) ────────────────────────
  const { data: antennasData, isLoading: isLoadingAntennas } = useSWR(
    timeRange ? ["vesselAntennas", vesselImo, timeRange.startAt, timeRange.endAt] : null,
    () => getVesselAntennas(vesselImo, timeRange!.startAt, timeRange!.endAt),
    { fallbackData: { dataUsages: [] }, revalidateOnFocus: false },
  );

  const [scan, setScan] = useState({ isScanning: false, key: 0 });
  const prevDataRef = useRef<DataUsage[] | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const data = antennasData?.dataUsages ?? [];
    const isFirst = prevDataRef.current === null;
    const hasChanged = prevDataRef.current !== data;
    if (!isFirst && !hasChanged) return;
    prevDataRef.current = data;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScan((prev) => ({ isScanning: true, key: prev.key + 1 }));
      scanTimerRef.current = setTimeout(() => setScan((prev) => ({ ...prev, isScanning: false })), 1400);
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [antennasData]);

  const usageStats = useMemo(() => {
    const dataUsages = antennasData?.dataUsages ?? [];
    if (!dataUsages.length) return [];

    let totalSeconds = 24 * 3600;
    if (timeRange?.startAt && timeRange?.endAt) {
      const start = parseISO(timeRange.startAt);
      const end = parseISO(timeRange.endAt);
      totalSeconds = Math.abs(differenceInSeconds(start, end));
    }
    if (totalSeconds === 0) totalSeconds = 1;

    const grouped: Record<string, { name: string; totalBytes: number; items: DataUsage[] }> = {};
    for (const usage of dataUsages) {
      const name = usage.name || "Unknown";
      if (!grouped[name]) grouped[name] = { name, totalBytes: 0, items: [] };
      grouped[name].totalBytes += usage.dataUsageAmount;
      grouped[name].items.push(usage);
    }

    return Object.values(grouped).map(({ name, totalBytes, items }) => {
      const bps = (totalBytes * 8) / totalSeconds;
      const { raw, value, unit } = formatDataSize(totalBytes);
      return {
        name,
        interfaces: items.map((i) => i.interfaceName),
        items: items.map((i) => ({ displayName: i.antennaDisplayName, dataUsageAmount: i.dataUsageAmount })),
        usageRaw: raw,
        usageValue: value,
        usageUnit: unit,
        bpsRaw: bps >= 1_000_000 ? bps / 1_000_000 : bps / 1_000,
        bpsSuffix: bps >= 1_000_000 ? " Mbps" : " kbps",
        color: getServiceColor(name),
      };
    });
  }, [antennasData, timeRange]);

  const showScan = scan.isScanning && usageStats.length > 0;

  return (
    <div className="space-y-6">
      {viewMode === "OVERVIEW" ? (
        <>
          {/* 데이터 사용량 카드 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isLoadingAntennas
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-(--color-surface-1) p-5 dark:border-white/5"
                  >
                    <div className="relative">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 animate-pulse rounded-sm bg-gray-200 dark:bg-white/10" />
                          <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                        </div>
                        <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                      </div>
                      <div className="mb-4">
                        <p className="text-[12px] font-bold text-blue-500 uppercase">Total Data Usage</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <div className="h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                          <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-gray-50 pt-3 dark:border-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-gray-400 uppercase">Avg. Speed</span>
                          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="h-3 w-28 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                          <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              : usageStats.map((item) => (
                  <div
                    key={item.name}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-(--color-surface-1) p-5 transition-all hover:shadow-md dark:border-white/5"
                  >
                    <ScanLine isScanning={showScan} scanKey={scan.key} />
                    <div className="absolute -top-4 -right-4 h-24 w-24 opacity-[0.03]" />
                    <div className="relative">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-extrabold tracking-widest text-gray-500 uppercase">{item.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-gray-400">{item.interfaces.join(" · ")}</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-[12px] font-bold text-blue-500 uppercase">Total Data Usage</p>
                        <div className="flex items-baseline gap-1">
                          <AnimatedCounter
                            value={item.usageRaw}
                            duration={1200}
                            formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                            className="text-4xl font-black text-gray-900 dark:text-white"
                          />
                          <span className="text-md font-bold text-gray-400 uppercase">{item.usageUnit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-gray-50 pt-3 dark:border-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-medium text-gray-400 uppercase">Avg. Speed</span>
                          <AnimatedCounter
                            value={item.bpsRaw}
                            duration={1200}
                            suffix={item.bpsSuffix}
                            formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                            className="text-md font-bold text-gray-700 dark:text-gray-300"
                          />
                        </div>
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

          {/* 데이터 사용량 히스토리 차트 */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-(--color-surface-1) p-4 dark:border-white/5">
            <ScanLine isScanning={showScan} scanKey={scan.key} />
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
              {isLoadingData
                ? <div className="h-full w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
                : <LineChartOne timeStampDataUsages={timeStampDataUsages} timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />
              }
            </div>
          </div>

          <Modal isOpen={chartExpanded} onClose={() => setChartExpanded(false)} showCloseButton={false} className="w-[96vw] max-w-[1400px] overflow-hidden p-0">
            <div className="flex flex-col" style={{ height: "85vh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
                <h3 className="text-base font-bold tracking-wider text-gray-600 uppercase dark:text-gray-300">
                  Data Usage History
                </h3>
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
                <LineChartOne timeStampDataUsages={timeStampDataUsages} timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />
              </div>
            </div>
          </Modal>
        </>
      ) : (
        <VesselCommandOne imo={Number(vesselImo)} />
      )}
    </div>
  );
};

export default VesselDetailView;
