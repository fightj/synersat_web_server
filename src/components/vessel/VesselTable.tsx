"use client";

import Image from "next/image";
import React, { memo, useMemo, useState, useTransition, useCallback, useRef, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Vessel } from "@/types/vessel";
import { useVesselStore } from "@/store/vessel.store";
import Loading from "../common/Loading";
import { getServiceBadgeStyles } from "../common/AnntennaMapping";
import { GrafanaIcon, SktelinkIcon } from "@/icons";
import RedirectButtons from "../common/RedirectButtons";
import { useRouter } from "next/navigation";

type SortKey = "company" | "vesselId" | "vesselName";
type SortDir = "asc" | "desc";
type CategoryKey = "total" | "starlink" | "nexuswave" | "vsat" | "fbb" | "oneweb" | "fourgee" | "iridium" | "offline";

interface VesselTableProps {
  searchTerm?: string;
  categoryFilter?: CategoryKey | null;
}

function getSortValue(v: Vessel, key: SortKey) {
  switch (key) {
    case "company":    return v.acct ?? "";
    case "vesselId":   return String(v.id ?? "");
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
interface VesselRowProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  vessel: Vessel;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onDoubleClick: (vessel: Vessel) => void;
  onGrafanaClick: (e: React.MouseEvent, url: string) => void;
}

const GRAFANA_URL =
  "https://fleet-dashboard.synersatfleet.net/d/datausagehistory-all/fleet-data-usage-history-cached?orgId=1&refresh=5m&var-vesselTable=NO.303%20DAE%20HWA&var-vesselid=dh303&var-VPN_IP=10.8.129.115&var-pri_wan_traffic_rx=vtnet2_rx&var-pri_wan_traffic_tx=vtnet2_tx&var-sec_wan_traffic_tx=vtnet3_tx&var-sec_wan_traffic_rx=vtnet3_rx&var-corp_traffic_rx=vtnet4_1001_rx&var-corp_traffic_tx=vtnet4_1001_tx&var-crew_traffic_rx=vtnet4_1002_rx&var-crew_traffic_tx=vtnet4_1002_tx&var-thi_wan_traffic_tx=vtnet0_tx&var-thi_wan_traffic_rx=vtnet0_rx&var-vesselid_ori=dh303&var-vesselimo=8714047&var-Box_Password=globe1@3&var-iot_traffic_tx=vtnet4_1000_tx&var-iot_traffic_rx=vtnet4_1000_rx&var-vessel_url_id=dh303&var-serialnumber=NBOXJ6000125102100088";

const VesselRow = memo(
  React.forwardRef<HTMLTableSectionElement, VesselRowProps>(
    function VesselRow(
      { vessel, isExpanded, onToggleExpand, onDoubleClick, onGrafanaClick, ...tbodyProps },
      ref,
    ) {
      const handleToggle = useCallback(() => {
        onToggleExpand(String(vessel.id));
      }, [vessel.id, onToggleExpand]);

      const available = vessel.status?.available;
      const statusName = available
        ? (vessel.status?.antennaServiceDisplayName ?? vessel.status?.antennaServiceName ?? null)
        : null;

      return (
        <tbody ref={ref} {...tbodyProps}>
          <tr
            onClick={handleToggle}
            onDoubleClick={() => onDoubleClick(vessel)}
            className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2 ${
              !isExpanded ? "border-b border-gray-100 dark:border-white/5" : ""
            }`}
          >
            <td className="text-theme-sm px-5 py-4 text-start font-medium text-gray-800 dark:text-white/90">
              <div className="flex items-center gap-2">
                {vessel.manager === "sktelink" && <SktelinkIcon className="h-4 w-auto" />}
                {vessel.acct || "-"}
              </div>
            </td>
            <td className="text-theme-sm px-5 py-4 text-start font-semibold text-gray-700 dark:text-gray-200">
              {vessel.name || "-"}
            </td>
            <td className="px-3 py-4 text-start">
              <span
                className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight uppercase ${getServiceBadgeStyles(statusName)}`}
              >
                {statusName || "N/A"}
              </span>
            </td>
            <td className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
              {vessel.id}
            </td>
            <td className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
              {vessel.imo || "-"}
            </td>
            <td className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
              {vessel.callsign || "-"}
            </td>
            <td className="text-theme-sm px-5 py-4 text-start text-gray-500 dark:text-gray-400">
              {vessel.mmsi || "-"}
            </td>
            <td className="px-5 py-4 text-start">
              <code className="text-theme-sm rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 dark:bg-white/5 dark:text-gray-300">
                {vessel.vpnIp || "-"}
              </code>
            </td>
            <td className="py-4 text-center">
              <button
                className="flex items-center justify-center transition-all hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onGrafanaClick(e, GRAFANA_URL);
                }}
              >
                <GrafanaIcon className="h-5 w-5 text-orange-500" />
              </button>
            </td>
          </tr>

          <tr>
            <td colSpan={9} className="p-0">
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  {isExpanded && (
                    <div className="bg-gray-50 px-3 py-3 dark:bg-white/2">
                      <div className="w-fit">
                        <RedirectButtons vesselId={String(vessel.id)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      );
    },
  ),
);

// ── 메인 테이블 ────────────────────────────────────────────────────────────
export default function VesselTable({ searchTerm = "", categoryFilter = null }: VesselTableProps) {
  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const setSelectedVessel = useVesselStore((s) => s.setSelectedVessel);
  const [sortKey, setSortKey] = useState<SortKey>("vesselName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
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
      });
      router.push("/vessels/detail");
    },
    [setSelectedVessel, router],
  );

  const handleGrafanaClick = useCallback((_e: React.MouseEvent, url: string) => {
    setIframeUrl(url);
  }, []);

  const displayVessels = useMemo(() => {
    const name = (v: (typeof vessels)[0]) =>
      v.status?.available
        ? (v.status?.antennaServiceDisplayName ?? v.status?.antennaServiceName)?.toLowerCase() ?? ""
        : "";

    const filtered = vessels.filter((v) => {
      if (!(v.name ?? "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (!categoryFilter || categoryFilter === "total") return true;
      switch (categoryFilter) {
        case "starlink":  return name(v).includes("starlink");
        case "nexuswave": return name(v).includes("nexuswave");
        case "vsat":      return name(v).includes("vsat") || name(v).includes("fx");
        case "fbb":       return name(v).includes("fbb");
        case "oneweb":    return name(v).includes("oneweb");
        case "fourgee":   return name(v).includes("4g") || name(v).includes("lte");
        case "iridium":   return name(v).includes("iridium");
        case "offline":
          return !v.status?.available || (!v.status?.antennaServiceDisplayName && !v.status?.antennaServiceName);
        default:          return true;
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
  }, [vessels, sortKey, sortDir, searchTerm, categoryFilter]);

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
      className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
    >
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[1100px]"
          style={{ tableLayout: "fixed", borderCollapse: "collapse" }}
        >
          {/* colgroup: table-layout:fixed에서 열 너비 고정 */}
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} />
          </colgroup>

          <thead className="border-b border-gray-100 bg-blue-50/50 dark:border-white/[0.05] dark:bg-slate-800/50">
            <tr>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                <SortHeader label="Company" k="company" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                <SortHeader label="Vessel Name" k="vesselName" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="text-theme-xs px-3 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">
                <SortHeader label="Vessel ID" k="vesselId" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              </th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">IMO</th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">CallSign</th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">MMSI</th>
              <th className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-500 dark:text-gray-400">VPN IP</th>
              <th className="text-theme-xs py-3 text-center font-semibold text-gray-500 dark:text-gray-400">{""}</th>
            </tr>
          </thead>

          {/* 상단 스페이서 */}
          {paddingTop > 0 && (
            <tbody aria-hidden="true">
              <tr>
                <td colSpan={9} style={{ height: paddingTop, padding: 0 }} />
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
                <td colSpan={9} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {iframeUrl && (
        <div className="fixed inset-0 z-500 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="flex flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{ width: "90vw", height: "90vh" }}
          >
            <div className="flex shrink-0 items-center justify-between bg-gray-900 px-4 py-2">
              <span className="truncate text-xs text-gray-400">{iframeUrl}</span>
              <button
                onClick={() => setIframeUrl(null)}
                className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500"
              >
                ✕
              </button>
            </div>
            <iframe src={iframeUrl} className="h-full w-full border-0 bg-white" title="Grafana" />
          </div>
        </div>
      )}
    </div>
  );
}
