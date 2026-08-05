"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import {
  CREW_USERS,
  SERVICES,
  axisScale,
  formatGB,
  networkSplit,
  type ServiceKey,
  type VesselUsage,
} from "./fleetData";
import { useIsDark } from "./useIsDark";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ServiceDetailPanelProps {
  service: ServiceKey;
  vessels: VesselUsage[];
  scopeLabel: string;
  onBack: () => void;
}

export default function ServiceDetailPanel({ service, vessels, scopeLabel, onBack }: ServiceDetailPanelProps) {
  const isDark = useIsDark();
  const [openNetwork, setOpenNetwork] = useState<string | null>(null);

  const meta = SERVICES.find((s) => s.key === service)!;
  const accent = isDark ? meta.dark : meta.light;
  const surface = isDark ? "#1a2231" : "#fdfdff";
  const muted = "#898781";
  const grid = isDark ? "#2c2c2a" : "#e1e0d9";

  const total = useMemo(
    () => vessels.reduce((sum, v) => sum + v.usage[service], 0),
    [vessels, service],
  );

  const networks = useMemo(
    () => networkSplit(service).map((n) => ({ ...n, gb: total * n.ratio })),
    [total, service],
  );

  const crewTotal = networks.find((n) => n.key === "crew")?.gb ?? 0;
  const users = useMemo(
    () => CREW_USERS.map((u) => ({ ...u, gb: crewTotal * u.ratio })).sort((a, b) => b.gb - a.gb),
    [crewTotal],
  );

  // 선박별 기여도 — 하나의 서비스만 보므로 단일 계열(강조 형태)
  const byVessel = useMemo(
    () =>
      vessels
        .map((v) => ({ name: v.name, gb: v.usage[service] }))
        .filter((v) => v.gb > 0)
        .sort((a, b) => b.gb - a.gb),
    [vessels, service],
  );

  const scale = axisScale(Math.max(0, ...byVessel.map((v) => v.gb)));

  const vesselBarOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", background: "transparent", animations: { enabled: false } },
    colors: [accent],
    plotOptions: { bar: { horizontal: true, barHeight: "58%", borderRadius: 4, borderRadiusApplication: "end" } },
    stroke: { width: 2, colors: [surface] },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: grid, strokeDashArray: 4, yaxis: { lines: { show: false } } },
    xaxis: {
      categories: byVessel.map((v) => v.name),
      labels: { style: { colors: muted, fontSize: "11px" }, formatter: (val) => scale.format(Number(val)) },
      title: {
        text: `Usage (${scale.unit})`,
        offsetY: -4,
        style: { color: muted, fontSize: "11px", fontWeight: 600 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: isDark ? "#c3c2b7" : "#52514e", fontSize: "11px" }, maxWidth: 160 } },
    tooltip: { theme: isDark ? "dark" : "light", y: { formatter: (val) => formatGB(Number(val)) } },
  };

  return (
    <div className="space-y-4">
      {/* 뒤로가기 + 컨텍스트 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Overview
        </button>
        <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: accent }} />
          {meta.label}
        </span>
        <span className="text-[11px] text-gray-400">{scopeLabel}</span>
      </div>

      {/* 헤드라인 */}
      <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) px-5 py-4 shadow-sm dark:border-white/5">
        <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{meta.label} total</p>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{formatGB(total)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 네트워크(용도)별 분해 */}
        <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) p-5 shadow-sm dark:border-white/5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Where it was used</h3>
          <p className="mb-4 text-[11px] text-gray-400">Crew WiFi 행을 클릭하면 유저별 사용량이 열립니다.</p>

          <ul className="space-y-2">
            {networks.map((n) => {
              const pct = total > 0 ? (n.gb / total) * 100 : 0;
              const isOpen = openNetwork === n.key;
              const expandable = n.key === "crew";
              return (
                <li key={n.key}>
                  <button
                    onClick={() => expandable && setOpenNetwork(isOpen ? null : n.key)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                      expandable ? "hover:bg-gray-50 dark:hover:bg-white/5" : "cursor-default"
                    } ${isOpen ? "bg-gray-50 dark:bg-white/5" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                        {expandable && (
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                            className={`text-gray-400 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        )}
                        {n.label}
                      </span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] tabular-nums text-gray-400">{pct.toFixed(1)}%</span>
                        <span className="font-mono text-xs font-bold tabular-nums text-gray-800 dark:text-gray-200">
                          {formatGB(n.gb)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-gray-100 dark:border-white/10">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-white/5 dark:bg-white/2">
                            <th className="px-3 py-2 text-left font-bold text-gray-500">User</th>
                            <th className="px-3 py-2 text-right font-bold text-gray-500">Usage</th>
                            <th className="w-[38%] px-3 py-2 text-left font-bold text-gray-500">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {users.map((usr) => {
                            const pctU = crewTotal > 0 ? (usr.gb / crewTotal) * 100 : 0;
                            return (
                              <tr key={usr.userId} className="hover:bg-gray-50 dark:hover:bg-white/3">
                                <td className="px-3 py-2 font-mono text-[11px] text-gray-700 dark:text-gray-300">{usr.userId}</td>
                                <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-gray-800 dark:text-gray-200">
                                  {formatGB(usr.gb)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                                      <div className="h-full rounded-full" style={{ width: `${pctU}%`, background: accent }} />
                                    </div>
                                    <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-gray-400">
                                      {pctU.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* 선박별 기여도 */}
        <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) p-5 shadow-sm dark:border-white/5">
          <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">{meta.label} by vessel</h3>
          {byVessel.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">No usage for this service.</p>
          ) : (
            <ReactApexChart
              key={`detail-${service}-${isDark}`}
              options={vesselBarOptions}
              series={[{ name: meta.label, data: byVessel.map((v) => Number(v.gb.toFixed(1))) }]}
              type="bar"
              height={Math.max(240, byVessel.length * 42 + 60)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
