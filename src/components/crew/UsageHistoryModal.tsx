"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { Modal } from "@/components/ui/modal";
import TimeSetting from "@/components/vessel/TimeSetting";
import Loading from "@/components/common/Loading";
import { getWifiUsageHistory } from "@/api/crew-account";
import type { CrewEntry } from "@/types/crew_account";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Metric = "total_bytes" | "in_bytes" | "out_bytes";

interface WifiRecord {
  time: number;
  in_bytes: number;
  out_bytes: number;
  total_bytes: number;
}

interface UsageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  crew: CrewEntry | null;
  imo: number;
}

const toMB = (bytes: number) => parseFloat((bytes / 1_000_000).toFixed(2));

const getDefault24hRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    startAt: start.toISOString().slice(0, 19),
    endAt: end.toISOString().slice(0, 19),
  };
};

function parseInfluxResponse(data: any): WifiRecord[] {
  const series = data?.results?.[0]?.series?.[0];
  if (!series) return [];

  const cols: string[] = series.columns;
  const values: any[][] = series.values ?? [];

  const timeIdx = cols.indexOf("time");
  const inIdx = cols.indexOf("in_bytes");
  const outIdx = cols.indexOf("out_bytes");
  const rangeIdx = cols.indexOf("range");
  const totalIdx = cols.indexOf("total_bytes");

  return values
    .filter((row) => row[rangeIdx] === null)
    .map((row) => ({
      time: new Date(row[timeIdx]).getTime(),
      in_bytes: Number(row[inIdx]) || 0,
      out_bytes: Number(row[outIdx]) || 0,
      total_bytes: Number(row[totalIdx]) || 0,
    }))
    .sort((a, b) => a.time - b.time);
}

const METRIC_LABELS: Record<Metric, string> = {
  total_bytes: "Total",
  in_bytes: "Download (In)",
  out_bytes: "Upload (Out)",
};

const METRIC_COLORS: Record<Metric, string> = {
  total_bytes: "#3b82f6",
  in_bytes: "#10b981",
  out_bytes: "#f59e0b",
};

export default function UsageHistoryModal({ isOpen, onClose, crew, imo }: UsageHistoryModalProps) {
  const [pendingRange, setPendingRange] = useState(getDefault24hRange);
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [records, setRecords] = useState<WifiRecord[]>([]);
  const [metric, setMetric] = useState<Metric>("total_bytes");

  const handleTimeSelect = useCallback((startAt: string, endAt: string) => {
    setPendingRange({ startAt, endAt });
  }, []);

  const handleApply = useCallback(async () => {
    if (!crew) return;
    setLoading(true);
    setHasApplied(true);
    try {
      const data = await getWifiUsageHistory(crew.userId, imo, pendingRange.startAt, pendingRange.endAt);
      setRecords(parseInfluxResponse(data));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [crew, imo, pendingRange]);

  const handleClose = () => {
    setRecords([]);
    setHasApplied(false);
    setPendingRange(getDefault24hRange());
    setMetric("total_bytes");
    onClose();
  };

  const series = useMemo(() => [{
    name: METRIC_LABELS[metric],
    data: records.map((r) => ({ x: r.time, y: toMB(r[metric]) })),
  }], [records, metric]);

  const options: ApexOptions = useMemo(() => ({
    chart: {
      type: "area",
      height: "100%",
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: { enabled: false },
      background: "transparent",
      foreColor: "#9CA3AF",
    },
    colors: [METRIC_COLORS[metric]],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 },
    },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 3 } },
    legend: { show: false },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" },
        datetimeUTC: false,
        datetimeFormatter: { hour: "HH:mm", day: "M/d", month: "M/d" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" },
        formatter: (val) => val >= 1 ? `${val.toFixed(1)} MB` : `${(val * 1000).toFixed(0)} KB`,
      },
    },
    tooltip: {
      theme: "dark",
      x: { format: "MM/dd HH:mm" },
      y: { formatter: (val) => `${val.toFixed(2)} MB` },
    },
    grid: {
      borderColor: "rgba(156, 163, 175, 0.1)",
      strokeDashArray: 4,
    },
  }), [metric]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} showCloseButton={false} className="w-[95vw] max-w-[1200px] overflow-hidden p-0">
      <div className="flex h-[80vh] flex-col">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Usage History</h3>
            {crew && <p className="text-xs text-gray-400">{crew.userId}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TimeSetting onApply={(startAt, endAt) => handleTimeSelect(startAt, endAt)} />
            <button
              onClick={handleApply}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
            <button
              onClick={handleClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col p-6">
          {!hasApplied ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-gray-300 dark:text-gray-600">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Set a time range and click Apply to load data.</p>
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center">
              <Loading message="Fetching usage data..." />
            </div>
          ) : records.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">No data in this period.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-3">
              {/* Metric toggle */}
              <div className="flex shrink-0 items-center gap-2">
                {(["total_bytes", "in_bytes", "out_bytes"] as Metric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      metric === m
                        ? "text-white shadow-sm"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                    }`}
                    style={metric === m ? { backgroundColor: METRIC_COLORS[m] } : {}}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: metric === m ? "white" : METRIC_COLORS[m] }}
                    />
                    {METRIC_LABELS[m]}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="min-h-0 flex-1">
                <ReactApexChart
                  key={metric}
                  options={options}
                  series={series}
                  type="area"
                  height="100%"
                  width="100%"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
