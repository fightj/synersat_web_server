"use client";

import Image from "next/image";
import React, { memo, useMemo, useState, useTransition, useCallback, useRef, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import useSWR from "swr";
import type { Vessel } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";
import { getAccounts, resetCore } from "@/api/vessel";
import Loading from "../common/Loading";
import { SktelinkIcon, GrafanaDashIcon } from "@/icons";
import RedirectButtons from "../common/RedirectButtons";
import GrafanaDashModal from "./GrafanaDashModal";
import ErrorAlertModal from "../ui/ErrorAlertModal";
import { useRouter } from "next/navigation";

type SortKey = "company" | "vesselId" | "vesselName";
type SortDir = "asc" | "desc";

const getServiceAccent = (name: string | null | undefined): { fill: string } => {
  if (!name) return { fill: "fill-slate-400" };
  const n = name.toLowerCase();
  if (n.includes("starlink"))  return { fill: "fill-purple-500" };
  if (n.includes("nexuswave")) return { fill: "fill-indigo-500" };
  if (n.includes("oneweb"))    return { fill: "fill-yellow-400" };
  if (n.includes("lte") || n.includes("4g")) return { fill: "fill-amber-500" };
  if (n.includes("iridium"))   return { fill: "fill-amber-400" };
  if (n.includes("fbb"))       return { fill: "fill-sky-500" };
  if (n.includes("vsat") || n.includes("fx")) return { fill: "fill-emerald-500" };
  return { fill: "fill-slate-400" };
};

const getAntennaAbbr = (name: string | null | undefined): string => {
  if (!name) return "N/A";
  const n = name.toLowerCase();
  if (n.includes("starlink")) return "STAR";
  if (n.includes("nexuswave")) return "NEX";
  if (n.includes("oneweb")) return "ONE";
  if (n.includes("lte") || n.includes("4g")) return "LTE";
  if (n.includes("iridium")) return "IRD";
  if (n.includes("fbb")) return "FBB";
  if (n.includes("vsat") || n.includes("fx")) return "VSAT";
  return name.slice(0, 3).toUpperCase();
};

interface VesselTableProps {
  searchTerm?: string;
  categoryFilter?: string | null;
  companyFilter?: string | null;
}

function getSortValue(v: Vessel, key: SortKey) {
  switch (key) {
    case "company": return v.acct ?? "";
    case "vesselId": return String(v.id ?? "");
    case "vesselName": return v.name ?? "";
  }
}

const SortHeader = ({
  label, k, sortKey, sortDir, onToggle,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
}) => {
  const active = sortKey === k;
  return (
    <button
      type="button"
      onClick={() => onToggle(k)}
      className="group inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white"
    >
      <span>{label}</span>
      <div className="relative flex h-4 w-4 items-center justify-center">
        <Image
          src={active ? "/images/icons/ic_sortable_g.png" : "/images/icons/ic_sortable_d.png"}
          alt="sort"
          width={16}
          height={16}
          className={`transition-opacity ${active ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`}
          style={{ transform: active && sortDir === "desc" ? "rotate(180deg)" : "none" }}
        />
      </div>
    </button>
  );
};

// ── VesselRow: <tbody> 래퍼로 virtualizer ref를 받음 ──────────────────────
interface VesselRowProps extends Omit<React.HTMLAttributes<HTMLTableSectionElement>, 'onDoubleClick'> {
  vessel: Vessel;
  companyLabel: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDoubleClick: (vessel: Vessel) => void;
  onGrafanaClick: (vessel: Vessel) => void;
}

const VesselRow = memo(
  React.forwardRef<HTMLTableSectionElement, VesselRowProps>(
    function VesselRow(
      { vessel, companyLabel, isExpanded, onToggleExpand, onDoubleClick, onGrafanaClick, ...tbodyProps },
      ref,
    ) {
      const handleToggle = useCallback(() => {
        onToggleExpand(String(vessel.id));
      }, [vessel.id, onToggleExpand]);

      const [confirmOpen, setConfirmOpen] = useState(false);
      const [isResetting, setIsResetting] = useState(false);
      const [resetError, setResetError] = useState<string | null>(null);

      const handleGpsClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmOpen(true);
      }, []);

      const handleConfirmReset = useCallback(async () => {
        setConfirmOpen(false);
        setIsResetting(true);
        try {
          await resetCore(vessel.imo);
        } catch (err) {
          setResetError(err instanceof Error ? err.message : "Reset Core failed");
        } finally {
          setIsResetting(false);
        }
      }, [vessel.imo]);

      const isInactive = vessel.inActive === true;
      const antennaStatuses = vessel.antennaStatuses ?? [];
      const gpsStatus = vessel.gpsStatus ?? null;
      const gpsBadgeClass = gpsStatus === "live"
        ? "bg-emerald-500"
        : gpsStatus === "old"
          ? "bg-red-500"
          : "bg-gray-400";

      return (
        <>
          <tbody ref={ref} {...tbodyProps}>
            <tr
              onClick={handleToggle}
              onDoubleClick={() => onDoubleClick(vessel)}
              className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2 ${!isExpanded ? "border-b border-gray-100 dark:border-white/5" : ""
                }`}
            >
              <td className="pl-5 pr-1 py-3 text-start">
                {vessel.manager === "sktelink" ? (
                  <SktelinkIcon className="h-[17px] w-auto" />
                ) : vessel.manager === "synersat" ? (
                  <>
                    <Image src="/images/logo/logo_black.png" alt="Synersat" width={28} height={28} className="h-[27px] w-auto dark:hidden" />
                    <Image src="/images/logo/logo_intro.png" alt="Synersat" width={28} height={28} className="hidden h-[27px] w-auto dark:block" />
                  </>
                ) : (
                  <span className="text-theme-sm text-gray-400 dark:text-gray-500">-</span>
                )}
              </td>
              <td className="text-theme-sm px-5 py-3 text-start font-medium text-gray-800 dark:text-white/90">
                {companyLabel || "-"}
              </td>
              <td className="text-theme-sm px-5 py-3 text-start font-semibold text-gray-700 dark:text-gray-200">
                {vessel.name || "-"}
              </td>
              <td className="px-3 py-3 text-start">
                <div className="flex flex-wrap gap-1">
                  {vessel.prepaidEnabled === true && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      Prepaid
                    </span>
                  )}
                  {vessel.betaVersionEnabled === true && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                      Beta
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3 text-start">
                {isInactive ? (
                  <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight uppercase bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                    Inactive
                  </span>
                ) : antennaStatuses.length === 0 ? null : (
                  <div className="flex flex-wrap gap-1.5">
                    {antennaStatuses.map((a) => {
                      const isCurrent = a.available && a.antennaServiceDisplayName === vessel.currentAntenna;
                      const accent = isCurrent ? getServiceAccent(a.antennaServiceDisplayName) : null;
                      return (
                        <div key={a.interfaceName} className="flex flex-col items-center gap-0.5">
                          <svg width="8" height="5" viewBox="0 0 8 5" className={isCurrent ? accent!.fill : "fill-transparent"}>
                            <polygon points="4,5 0,0 8,0" />
                          </svg>
                          <span
                            className={`inline-flex items-center justify-center rounded-full h-8 overflow-hidden whitespace-nowrap text-[9px] font-bold tracking-wide uppercase text-white transition-all duration-200
                              min-w-8 max-w-8 group-hover:max-w-40 group-hover:px-2.5
                              ${a.available
                                ? "bg-emerald-500 dark:bg-emerald-500"
                                : "bg-red-500 dark:bg-red-500"
                              }`}
                          >
                            <span className="group-hover:hidden">{getAntennaAbbr(a.antennaServiceDisplayName)}</span>
                            <span className="hidden group-hover:inline whitespace-nowrap">{a.gatewayName}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-start">
                <button
                  title={gpsStatus === "old" ? "GPS: old — Click to Reset Core" : `GPS: ${gpsStatus ?? "unknown"}`}
                  onClick={handleGpsClick}
                  disabled={gpsStatus !== "old" || isResetting}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold tracking-wide text-white shadow-md transition-all ${gpsStatus === "old" ? "hover:scale-110 hover:shadow-lg active:scale-95" : ""} ${gpsBadgeClass}`}
                >
                  {isResetting ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" viewBox="0 0 24 27" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="24" rx="9" ry="3" fill="black" opacity="0.35" stroke="none" />
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  )}
                </button>
              </td>
              <td className="px-5 py-3 text-start">
                <span className="relative inline-flex overflow-hidden rounded">
                  <code className="text-theme-sm rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    {vessel.coreVersion}
                  </code>
                  {vessel.isLatestCoreVersion === true && (
                    <span
                      className="absolute right-0 top-0 h-0 w-0"
                      style={{
                        borderStyle: "solid",
                        borderWidth: "0 8px 8px 0",
                        borderColor: "transparent #10b981 transparent transparent",
                      }}
                    />
                  )}
                </span>
              </td>
              <td className="py-2 text-center">
                <button
                  className="flex items-center justify-center transition-all hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGrafanaClick(vessel);
                  }}
                >
                  <GrafanaDashIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </button>
              </td>
            </tr>

            <tr>
              <td colSpan={8} className="p-0">
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                >
                  <div className="overflow-hidden">
                    {isExpanded && (
                      <div className="bg-gray-50 px-3 py-3 dark:bg-white/2">
                        <div className="w-fit">
                          <RedirectButtons vesselId={vessel.id} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>

            {confirmOpen && (
              <tr>
                <td colSpan={8}>
                  <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-(--color-surface-1) shadow-2xl dark:border dark:border-white/10">
                      <div className="p-5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Reset Core</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Are you sure you want to reset the core of <span className="font-semibold text-gray-800 dark:text-gray-200">{vessel.name}</span>?
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 bg-gray-50 px-5 py-3 dark:bg-white/2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmOpen(false); }}
                          className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConfirmReset(); }}
                          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <ErrorAlertModal
            isOpen={resetError !== null}
            message={resetError ?? ""}
            onClose={() => setResetError(null)}
          />
        </>
      );
    },
  ),
);

// ── 메인 테이블 ────────────────────────────────────────────────────────────
export default function VesselTable({ searchTerm = "", categoryFilter = null, companyFilter = null }: VesselTableProps) {
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);

  const { data: accounts } = useSWR("accounts", getAccounts, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000, // 1시간 캐시
  });
  const acctMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts?.forEach(({ value, label }) => map.set(value, label));
    return map;
  }, [accounts]);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);
  const [sortKey, setSortKey] = useState<SortKey>("vesselName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grafanaVessel, setGrafanaVessel] = useState<Vessel | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
  }, []);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [sortKey],
  );

  const handleToggleExpand = useCallback((id: string) => {
    startTransition(() => {
      setExpandedId((prev) => (prev === id ? null : id));
    });
  }, []);

  const handleDoubleClick = useCallback(
    (vessel: Vessel) => {
      setSelectedVessel({
        id: vessel.id,
        imo: vessel.imo,
        name: vessel.name || "",
        vpnIp: vessel.vpnIp || "",
        prepaidEnabled: vessel.prepaidEnabled,
      });
      router.push(`/vessels/detail?imo=${vessel.imo}`);
    },
    [setSelectedVessel, router],
  );

  const handleGrafanaClick = useCallback((vessel: Vessel) => {
    setGrafanaVessel(vessel);
  }, []);

  const displayVessels = useMemo(() => {
    const currentAntenna = (v: (typeof vessels)[0]) =>
      !v.inActive ? (v.currentAntenna ?? "").toLowerCase() : "";

    const filtered = vessels.filter((v) => {
      if (!(v.name ?? "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (companyFilter && v.acct !== companyFilter) return false;
      if (!categoryFilter || categoryFilter === "total") return true;
      const ant = currentAntenna(v);
      const anyAvailable = (v.antennaStatuses ?? []).some((a) => a.available);
      switch (categoryFilter) {
        case "starlink": return ant.includes("starlink");
        case "nexuswave": return ant.includes("nexuswave");
        case "vsat": return ant.includes("vsat") || ant.includes("fx");
        case "fbb": return ant.includes("fbb");
        case "oneweb": return ant.includes("oneweb");
        case "fourgee": return ant.includes("4g") || ant.includes("lte");
        case "iridium": return ant.includes("iridium");
        case "na":
          return !v.inActive && anyAvailable && !v.currentAntenna;
        case "inactive":
          return v.inActive === true;
        case "offline":
          return !v.inActive && !anyAvailable;
        default: return true;
      }
    });

    if (searchTerm.trim() !== "") return filtered;

    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      return sortDir === "asc"
        ? av.localeCompare(bv, "en", { numeric: true })
        : bv.localeCompare(av, "en", { numeric: true });
    });
    return copy;
  }, [vessels, sortKey, sortDir, searchTerm, categoryFilter, companyFilter]);

  // ── 가상화 (window 스크롤 사용 → 내부 스크롤바 없음) ────────────────────
  const rowVirtualizer = useWindowVirtualizer({
    count: displayVessels.length,
    estimateSize: () => 57,
    overscan: 5,
    scrollMargin,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? Math.max(0, virtualItems[0].start - scrollMargin) : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  if (loading)
    return (
      <div className="p-8 text-center">
        <Loading message="Fetching data..." />
      </div>
    );

  return (
    <div
      ref={listRef}
      className="overflow-hidden rounded-md border border-gray-200 bg-(--color-surface-1) dark:border-white/5"
    >
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[1100px]"
          style={{ tableLayout: "fixed", borderCollapse: "collapse" }}
        >
          {/* colgroup: table-layout:fixed에서 열 너비 고정 */}
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "4%" }} />
          </colgroup>

          <thead className="border-b border-gray-100 bg-blue-50/50 dark:border-white/[0.05] dark:bg-slate-800/50">
            <tr>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                Manager
              </th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                <SortHeader label="Company" k="company" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                <SortHeader label="Vessel Name" k="vesselName" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="text-theme-xs px-3 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                Configuration
              </th>
              <th className="text-theme-xs px-3 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="text-theme-xs px-3 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                GPS
              </th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">Version</th>
              <th className="text-theme-xs py-3 text-center font-semibold text-gray-500 dark:text-gray-400">{""}</th>
            </tr>
          </thead>

          {/* 상단 스페이서 */}
          {paddingTop > 0 && (
            <tbody aria-hidden="true">
              <tr>
                <td colSpan={8} style={{ height: paddingTop, padding: 0 }} />
              </tr>
            </tbody>
          )}

          {/* 가상화된 행들: 각 VesselRow는 <tbody>를 렌더 (2개 tr 포함) */}
          {virtualItems.map((vItem) => {
            const vessel = displayVessels[vItem.index];
            return (
              <VesselRow
                key={vessel.id}
                ref={rowVirtualizer.measureElement}
                data-index={vItem.index}
                vessel={vessel}
                companyLabel={acctMap.get(vessel.acct ?? "") || vessel.acct || ""}
                isExpanded={expandedId === String(vessel.id)}
                onToggleExpand={handleToggleExpand}
                onDoubleClick={handleDoubleClick}
                onGrafanaClick={handleGrafanaClick}
              />
            );
          })}

          {/* 하단 스페이서 */}
          {paddingBottom > 0 && (
            <tbody aria-hidden="true">
              <tr>
                <td colSpan={8} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            </tbody>
          )}
        </table>
      </div>

      <GrafanaDashModal vessel={grafanaVessel} onClose={() => setGrafanaVessel(null)} />
    </div>
  );
}
