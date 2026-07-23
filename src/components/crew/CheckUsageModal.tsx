"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import { Modal } from "@/components/ui/modal";
import TimeSetting from "@/components/vessel/TimeSetting";
import type { CrewEntry } from "@/types/crew_account";
import Loading from "@/components/common/Loading";

interface DailyUsage {
  date: string;
  user: string;
  in_bytes: number;
  out_bytes: number;
  total_bytes: number;
}

interface UserDailyData {
  userId: string;
  dailyUsages: DailyUsage[];
  totalInBytes: number;
  totalOutBytes: number;
  totalBytes: number;
}

interface CheckUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCrew: CrewEntry[];
  imo: number;
  vesselName: string;
}

const toMiB = (bytes: number) => bytes / 1024 / 1024;

const formatBytes = (bytes: number) => {
  const mib = toMiB(bytes);
  if (mib >= 1024) return `${(mib / 1024).toFixed(2)} GiB`;
  return `${mib.toFixed(2)} MiB`;
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
  const [userDataMap, setUserDataMap] = useState<Record<string, UserDailyData>>({});
  const [resolvedCrews, setResolvedCrews] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [pendingRange, setPendingRange] = useState(getDefault24hRange);
  const [appliedRange, setAppliedRange] = useState<{ startAt: string; endAt: string } | null>(null);
  const [sortKey, setSortKey] = useState<"id" | "in" | "out" | "total">("id");
  const [sortAsc, setSortAsc] = useState(true);

  const handleTimeSelect = useCallback((startAt: string, endAt: string) => {
    setPendingRange({ startAt, endAt });
  }, []);

  const handleApply = useCallback(async () => {
    if (!pendingRange) return;
    setLoading(true);
    setHasApplied(true);
    setAppliedRange(pendingRange);
    try {
      const params = new URLSearchParams({
        vessel_imo: String(imo),
        startAt: pendingRange.startAt,
        endAt: pendingRange.endAt,
      });
      selectedCrew.forEach((c) => params.append('user', c.userId));

      const res = await fetch(`/api/crew/daily?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: DailyUsage[] = await res.json();

      const map: Record<string, UserDailyData> = {};
      data.forEach((row) => {
        if (!map[row.user]) {
          map[row.user] = { userId: row.user, dailyUsages: [], totalInBytes: 0, totalOutBytes: 0, totalBytes: 0 };
        }
        map[row.user].dailyUsages.push(row);
        map[row.user].totalInBytes += row.in_bytes;
        map[row.user].totalOutBytes += row.out_bytes;
        map[row.user].totalBytes += row.total_bytes;
      });

      const crewIds = selectedCrew.length > 0
        ? selectedCrew.map((c) => c.userId).filter((id) => map[id])
        : Object.keys(map);

      setUserDataMap(map);
      setResolvedCrews(crewIds);
      if (!selectedUserId && crewIds.length > 0) {
        setSelectedUserId(crewIds[0]);
      }
    } catch {
      setUserDataMap({});
      setResolvedCrews([]);
    } finally {
      setLoading(false);
    }
  }, [imo, selectedCrew, selectedUserId, pendingRange]);

  const handleDownloadZip = useCallback(async () => {
    const zip = new JSZip();
    const safe = (s: string) => s.replace(/[/\\?%*:|"<>]/g, "_");
    const sortedForCsv = [...resolvedCrews].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    sortedForCsv.forEach((userId) => {
      const data = userDataMap[userId];
      const sortedDays = [...(data?.dailyUsages ?? [])].sort((a, b) => b.date.localeCompare(a.date));

      const sheetData: (string | number)[][] = [
        ["Time Range", appliedRange?.startAt ?? "", appliedRange?.endAt ?? ""],
        ["Username", userId],
        ["Total Usage (MiB)", data ? Number(toMiB(data.totalBytes).toFixed(2)) : 0],
        ["Total Download (MiB)", data ? Number(toMiB(data.totalInBytes).toFixed(2)) : 0],
        ["Total Upload (MiB)", data ? Number(toMiB(data.totalOutBytes).toFixed(2)) : 0],
        [],
        ["Date", "↓ In (MiB)", "↑ Out (MiB)", "Total (MiB)"],
        ...sortedDays.map((d) => [
          d.date,
          Number(toMiB(d.in_bytes).toFixed(2)),
          Number(toMiB(d.out_bytes).toFixed(2)),
          Number(toMiB(d.total_bytes).toFixed(2)),
        ]),
      ];

      const csv = sheetData
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      zip.file(`${safe(vesselName)}_${safe(userId)}.csv`, "﻿" + csv);
    });

    const summaryData: (string | number)[][] = [
      ["Time Range", appliedRange?.startAt ?? "", appliedRange?.endAt ?? ""],
      ["Vessel", vesselName],
      [],
      ["Username", "↓ In (MiB)", "↑ Out (MiB)", "Total (MiB)"],
      ...sortedForCsv.map((userId) => {
        const d = userDataMap[userId];
        return [
          userId,
          d ? Number(toMiB(d.totalInBytes).toFixed(2)) : 0,
          d ? Number(toMiB(d.totalOutBytes).toFixed(2)) : 0,
          d ? Number(toMiB(d.totalBytes).toFixed(2)) : 0,
        ];
      }),
    ];
    const summaryCsv = summaryData
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    zip.file(`${safe(vesselName)}_summary.csv`, "﻿" + summaryCsv);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe(vesselName)}_usage_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resolvedCrews, userDataMap, vesselName, appliedRange]);

  const handleClose = () => {
    setUserDataMap({});
    setResolvedCrews([]);
    setSelectedUserId(null);
    setHasApplied(false);
    setPendingRange(getDefault24hRange());
    onClose();
  };

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "id"); }
  };

  const sortedCrews = [...resolvedCrews].sort((a, b) => {
    const da = userDataMap[a];
    const db = userDataMap[b];
    let diff = 0;
    if (sortKey === "id")         diff = a.localeCompare(b);
    else if (sortKey === "in")    diff = (da?.totalInBytes  ?? 0) - (db?.totalInBytes  ?? 0);
    else if (sortKey === "out")   diff = (da?.totalOutBytes ?? 0) - (db?.totalOutBytes ?? 0);
    else if (sortKey === "total") diff = (da?.totalBytes    ?? 0) - (db?.totalBytes    ?? 0);
    return sortAsc ? diff : -diff;
  });

  const selectedData = selectedUserId ? userDataMap[selectedUserId] : null;
  const sortedDailyUsages = selectedData
    ? [...selectedData.dailyUsages].sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} showCloseButton={false} className="w-[95vw] max-w-[1400px] overflow-hidden p-0">
      <div className="flex h-[85vh] flex-col">
        {/* Header */}
        <div className="relative flex flex-wrap items-center gap-3 border-b border-gray-100 px-6 py-4 pr-14 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check Usage</h3>
            <p className="text-xs text-gray-400">
              {selectedCrew.length === 0 ? "All crew" : `${selectedCrew.length} user${selectedCrew.length > 1 ? "s" : ""} selected`}
            </p>
          </div>
          <div className="mr-2 flex items-center gap-2">
            {hasApplied && resolvedCrews.length > 0 && (
              <button
                onClick={handleDownloadZip}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download CSV
              </button>
            )}
            <div className="min-w-0 flex-1">
              <TimeSetting onApply={(startAt, endAt) => handleTimeSelect(startAt, endAt)} />
            </div>
            <button
              onClick={handleApply}
              disabled={loading}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left: user list */}
          <div className="flex w-[500px] shrink-0 flex-col border-r border-gray-100 dark:border-white/10">
            <div className="border-b border-gray-100 px-5 py-3 dark:border-white/10">
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Users</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!hasApplied ? (
                <p className="px-4 py-8 text-center text-xs text-gray-400">Apply to load user list.</p>
              ) : loading ? null : resolvedCrews.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-gray-400">No usage data found.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-100 dark:border-white/5 dark:bg-white/2">
                      {(["id", "in", "out", "total"] as const).map((key) => {
                        const labels: Record<string, string> = { id: "ID", in: "↓ In", out: "↑ Out", total: "Total" };
                        const active = sortKey === key;
                        return (
                          <th
                            key={key}
                            onClick={() => handleSort(key)}
                            className={`cursor-pointer select-none px-4 py-2 text-xs font-bold transition-colors ${key === "id" ? "text-left" : "text-right"} ${active ? "text-blue-500 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                          >
                            {labels[key]}{active ? (sortAsc ? " ↑" : " ↓") : ""}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {sortedCrews.map((userId) => {
                      const data = userDataMap[userId];
                      const isSelected = selectedUserId === userId;
                      return (
                        <tr
                          key={userId}
                          onClick={() => setSelectedUserId(userId)}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-white/3"}`}
                        >
                          <td className={`px-4 py-3 font-semibold ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"}`}>
                            {userId}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400">
                            {data ? formatBytes(data.totalInBytes) : "-"}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400">
                            {data ? formatBytes(data.totalOutBytes) : "-"}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                            {data ? formatBytes(data.totalBytes) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: daily breakdown */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-gray-100 px-5 py-3 dark:border-white/10">
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                Daily Usage{selectedUserId ? (
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
                  <p className="text-sm text-gray-400">Select a user to view daily usage.</p>
                </div>
              ) : sortedDailyUsages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-400">No usage data in this period.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-100 bg-gray-100 dark:border-white/5 dark:bg-white/2">
                      <th className="px-3 py-2 text-left font-bold text-gray-500">Date</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">↓ In</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">↑ Out</th>
                      <th className="px-3 py-2 text-right font-bold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {sortedDailyUsages.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/3">
                        <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-400">{d.date}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{formatBytes(d.in_bytes)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{formatBytes(d.out_bytes)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-gray-800 dark:text-gray-200">{formatBytes(d.total_bytes)}</td>
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
