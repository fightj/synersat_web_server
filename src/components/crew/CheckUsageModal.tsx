"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import { Modal } from "@/components/ui/modal";
import TimeSetting from "@/components/vessel/TimeSetting";
import { getCrewOctetUsages } from "@/api/crew-account";
import type { CrewEntry } from "@/types/crew_account";
import Loading from "@/components/common/Loading";

interface SessionUsage {
  startAt: string;
  endAt: string;
  sessionTime: number;
  inputOctets: number;
  outputOctets: number;
  totalOctets: number;
}

interface CrewUsageData {
  crewId: string;
  usages: SessionUsage[];
  totalOctets: number;
  totalInputOctets: number;
  totalOutputOctets: number;
}

interface CheckUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCrew: CrewEntry[];
  imo: number;
  vesselName: string;
}

// bytes(octets) → MB
const toMB = (octets: number) => (octets / 1024 / 1024).toFixed(3);

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (m === 0 && s === 0) return `${h}h`;
  if (s === 0) return `${h}h ${m}m`;
  return `${h}h ${m}m ${s}s`;
};

const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const date = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  if (isNaN(date.getTime())) return iso.replace("T", " ");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getDefault24hRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    startAt: start.toISOString().slice(0, 19),
    endAt: end.toISOString().slice(0, 19),
  };
};

export default function CheckUsageModal({ isOpen, onClose, selectedCrew, imo, vesselName }: CheckUsageModalProps) {
  const [usageMap, setUsageMap] = useState<Record<string, CrewUsageData>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [pendingRange, setPendingRange] = useState(getDefault24hRange);
  const [appliedRange, setAppliedRange] = useState<{ startAt: string; endAt: string } | null>(null);

  const handleTimeSelect = useCallback((startAt: string, endAt: string) => {
    setPendingRange({ startAt, endAt });
  }, []);

  const handleApply = useCallback(async () => {
    if (!pendingRange) return;
    setLoading(true);
    setHasApplied(true);
    setAppliedRange(pendingRange);
    try {
      const crewIds = selectedCrew.map((c) => c.userId);
      const res = await getCrewOctetUsages(imo, crewIds, pendingRange.startAt, pendingRange.endAt);
      const dataUsages: CrewUsageData[] = res?.dataUsages ?? [];
      const map: Record<string, CrewUsageData> = {};
      dataUsages.forEach((d) => { map[d.crewId] = d; });
      setUsageMap(map);
      if (!selectedUserId && dataUsages.length > 0) {
        setSelectedUserId(dataUsages[0].crewId);
      }
    } catch {
      setUsageMap({});
    } finally {
      setLoading(false);
    }
  }, [imo, selectedCrew, selectedUserId, pendingRange]);

  const handleDownloadZip = useCallback(async () => {
    const zip = new JSZip();
    const safe = (s: string) => s.replace(/[/\\?%*:|"<>]/g, "_");
    const BOM = "﻿";
    selectedCrew.forEach((crew) => {
      const data = usageMap[crew.userId];
      const rows: string[] = [];
      // Summary section
      rows.push(`Time Range,="${appliedRange?.startAt ?? ""}",="${appliedRange?.endAt ?? ""}"`);
      rows.push(`Username,${crew.userId}`);
      rows.push(`Total Download (MB),${data ? toMB(data.totalInputOctets) : "0"}`);
      rows.push(`Total Upload (MB),${data ? toMB(data.totalOutputOctets) : "0"}`);
      rows.push(`Total Usage (MB),${data ? toMB(data.totalOctets) : "0"}`);
      rows.push("");
      // Session section
      rows.push("Start,End,Duration,Download (MB),Upload (MB),Total (MB)");
      (data?.usages ?? []).forEach((s) => {
        rows.push([
          `="${formatTime(s.startAt)}"`,
          `="${formatTime(s.endAt)}"`,
          formatDuration(s.sessionTime),
          toMB(s.inputOctets),
          toMB(s.outputOctets),
          toMB(s.totalOctets),
        ].join(","));
      });
      zip.file(`${safe(vesselName)}_${safe(crew.userId)}.csv`, BOM + rows.join("\n"));
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedCrew, usageMap, vesselName, appliedRange]);

  const handleClose = () => {
    setUsageMap({});
    setSelectedUserId(null);
    setHasApplied(false);
    setPendingRange(getDefault24hRange());
    onClose();
  };

  const selectedData = selectedUserId ? usageMap[selectedUserId] : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} showCloseButton={false} className="w-[95vw] max-w-[1400px] overflow-hidden p-0">
      <div className="flex h-[85vh] flex-col">
        {/* Header */}
        <div className="relative flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 pr-14 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check Usage</h3>
            <p className="text-xs text-gray-400">{selectedCrew.length} user{selectedCrew.length > 1 ? "s" : ""} selected</p>
          </div>
          <div className="mr-2 flex flex-wrap items-center gap-2">
            {hasApplied && Object.keys(usageMap).length > 0 && (
              <button
                onClick={handleDownloadZip}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download CSV
              </button>
            )}
            <TimeSetting onApply={(startAt, endAt) => handleTimeSelect(startAt, endAt)} />
            <button
              onClick={handleApply}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
          </div>
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Body: always two-panel layout */}
        <div className="flex min-h-0 flex-1">
          {/* Left: user list (always visible) */}
          <div className="flex w-[500px] shrink-0 flex-col border-r border-gray-100 dark:border-white/10">
            <div className="border-b border-gray-100 px-5 py-3 dark:border-white/10">
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Users</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedCrew.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">No users selected.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-100 dark:border-white/5 dark:bg-white/2">
                      <th className="px-4 py-2 text-left font-bold text-gray-500">ID</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">↓ In</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">↑ Out</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {selectedCrew.map((crew) => {
                      const data = usageMap[crew.userId];
                      const isSelected = selectedUserId === crew.userId;
                      return (
                        <tr
                          key={crew.userId}
                          onClick={() => setSelectedUserId(crew.userId)}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-white/3"}`}
                        >
                          <td className={`px-4 py-3 font-semibold ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"}`}>
                            {crew.userId}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400">
                            {data ? toMB(data.totalInputOctets) : "-"}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400">
                            {data ? toMB(data.totalOutputOctets) : "-"}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                            {data ? `${toMB(data.totalOctets)} MB` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: session details */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-gray-100 px-5 py-3 dark:border-white/10">
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                Sessions{selectedUserId ? (
                  <> — <span className="text-black dark:text-white">{selectedUserId}</span></>
                ) : ""}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
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
              ) : !selectedData ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-400">Select a user to view sessions.</p>
                </div>
              ) : selectedData.usages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-400">No session data in this period.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-100 bg-gray-100 dark:border-white/5 dark:bg-white/2">
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Start</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-500">End</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">Duration</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">↓ In (MB)</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">↑ Out (MB)</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">Total (MB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {[...selectedData.usages].sort((a, b) => (b.startAt ?? "").localeCompare(a.startAt ?? "")).map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/3">
                        <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-400">{formatTime(s.startAt)}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-400">{formatTime(s.endAt)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{formatDuration(s.sessionTime)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{toMB(s.inputOctets)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{toMB(s.outputOctets)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-gray-800 dark:text-gray-200">{toMB(s.totalOctets)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
