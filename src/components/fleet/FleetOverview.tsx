"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import {
  SERVICES,
  axisScale,
  formatGB,
  serviceColors,
  vesselTotal,
  type ServiceKey,
  type VesselUsage,
} from "./fleetData";
import { useIsDark } from "./useIsDark";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface FleetOverviewProps {
  vessels: VesselUsage[];
  scopeLabel: string;
  onSelectService: (key: ServiceKey) => void;
}

export default function FleetOverview({ vessels, scopeLabel, onSelectService }: FleetOverviewProps) {
  const isDark = useIsDark();
  const [showTable, setShowTable] = useState(false);

  const surface = isDark ? "#1a2231" : "#fdfdff";
  const ink = isDark ? "#c3c2b7" : "#52514e";
  const muted = "#898781";
  const grid = isDark ? "#2c2c2a" : "#e1e0d9";
  const colors = serviceColors(isDark);

  const totals = useMemo(() => {
    const perService = SERVICES.map((s) => ({
      ...s,
      total: vessels.reduce((sum, v) => sum + v.usage[s.key], 0),
    }));
    const grand = perService.reduce((sum, s) => sum + s.total, 0);
    const top = [...perService].sort((a, b) => b.total - a.total)[0];
    return { perService, grand, top };
  }, [vessels]);

  // 선박이 많으면 가로 스택 바가 읽기 쉽다 (이름이 길고 개수가 가변적)
  const barSeries = SERVICES.map((s) => ({
    name: s.label,
    data: vessels.map((v) => Number(v.usage[s.key].toFixed(1))),
  }));

  // 축 단위는 선박 합계 최대값 기준
  const scale = axisScale(Math.max(0, ...vessels.map(vesselTotal)));

  const barOptions: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: false },
      events: {
        dataPointSelection: (_e, _ctx, config) => {
          const s = SERVICES[config.seriesIndex];
          if (s) onSelectService(s.key);
        },
      },
    },
    colors,
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "62%",
        borderRadius: 4,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
      },
    },
    // 인접 세그먼트 사이 2px 표면 갭 — 색이 서로 번져 보이지 않게
    stroke: { width: 2, colors: [surface] },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: grid, strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    xaxis: {
      categories: vessels.map((v) => v.name),
      labels: { style: { colors: muted, fontSize: "11px" }, formatter: (val) => scale.format(Number(val)) },
      title: {
        text: `Usage (${scale.unit})`,
        offsetY: -4,
        style: { color: muted, fontSize: "11px", fontWeight: 600 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: ink, fontSize: "11px" }, maxWidth: 160 } },
    tooltip: {
      shared: true,
      intersect: false,
      theme: isDark ? "dark" : "light",
      y: { formatter: (val) => formatGB(Number(val)) },
    },
    states: { active: { filter: { type: "none" } } },
  };

  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: false },
      events: {
        dataPointSelection: (_e, _ctx, config) => {
          const s = SERVICES[config.dataPointIndex];
          if (s) onSelectService(s.key);
        },
      },
    },
    colors,
    labels: SERVICES.map((s) => s.label),
    stroke: { width: 2, colors: [surface] },
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "Total",
              color: muted,
              fontSize: "11px",
              fontWeight: 700,
              formatter: () => formatGB(totals.grand),
            },
            value: {
              color: isDark ? "#ffffff" : "#0b0b0b",
              fontSize: "20px",
              fontWeight: 700,
              formatter: (val) => formatGB(Number(val)),
            },
            name: { color: muted, fontSize: "11px" },
          },
        },
      },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: { formatter: (val) => formatGB(Number(val)) },
    },
    states: { active: { filter: { type: "none" } } },
  };

  const chartHeight = Math.max(260, vessels.length * 46 + 60);

  return (
    <div className="space-y-4">
      {/* 범례 — 시리즈가 6개라 색만으로 식별하지 않도록 항상 노출 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-(--color-surface-1) px-4 py-3 dark:border-white/5">
        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Services</span>
        {SERVICES.map((s) => (
          <button
            key={s.key}
            onClick={() => onSelectService(s.key)}
            className="flex items-center gap-1.5 text-xs text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: isDark ? s.dark : s.light }} />
            <span className="font-semibold">{s.label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
        >
          {showTable ? "Hide table" : "Table view"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* 선박별 서비스 사용량 */}
        <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) p-5 shadow-sm xl:col-span-2 dark:border-white/5">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Usage by vessel</h3>
            <span className="text-[11px] text-gray-400">{scopeLabel}</span>
          </div>
          <p className="mb-3 text-[11px] text-gray-400">막대를 클릭하면 해당 서비스의 상세 사용처로 이동합니다.</p>
          {vessels.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">No vessels in this scope.</p>
          ) : (
            <ReactApexChart
              key={`bar-${isDark}-${vessels.length}`}
              options={barOptions}
              series={barSeries}
              type="bar"
              height={chartHeight}
            />
          )}
        </div>

        {/* 서비스 비중 */}
        <div className="rounded-2xl border border-gray-200 bg-(--color-surface-1) p-5 shadow-sm dark:border-white/5">
          <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Service share</h3>
          <p className="mb-3 text-[11px] text-gray-400">조각을 클릭해 상세 보기</p>
          <ReactApexChart
            key={`donut-${isDark}`}
            options={donutOptions}
            series={totals.perService.map((s) => Number(s.total.toFixed(1)))}
            type="donut"
            height={300}
          />
          <ul className="mt-3 space-y-1.5">
            {[...totals.perService]
              .sort((a, b) => b.total - a.total)
              .map((s) => {
                const pct = totals.grand > 0 ? (s.total / totals.grand) * 100 : 0;
                return (
                  <li key={s.key} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: isDark ? s.dark : s.light }} />
                    <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-400">{s.label}</span>
                    <span className="shrink-0 font-mono tabular-nums text-gray-500 dark:text-gray-400">{pct.toFixed(1)}%</span>
                    <span className="w-20 shrink-0 text-right font-mono font-bold tabular-nums text-gray-800 dark:text-gray-200">
                      {formatGB(s.total)}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      {/* 테이블 뷰 — 색 대비가 낮은 시리즈까지 값에 도달할 수 있게 하는 대체 경로 */}
      {showTable && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-(--color-surface-1) shadow-sm dark:border-white/5">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-white/5 dark:bg-white/2">
                <th className="px-4 py-2.5 text-left font-bold text-gray-500">Vessel</th>
                {SERVICES.map((s) => (
                  <th key={s.key} className="px-3 py-2.5 text-right font-bold text-gray-500">{s.label}</th>
                ))}
                <th className="px-4 py-2.5 text-right font-bold text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {vessels.map((v) => (
                <tr key={v.imo} className="hover:bg-gray-50 dark:hover:bg-white/3">
                  <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">{v.name}</td>
                  {SERVICES.map((s) => (
                    <td key={s.key} className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-500 dark:text-gray-400">
                      {v.usage[s.key] > 0 ? v.usage[s.key].toFixed(1) : "-"}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-gray-800 dark:text-gray-200">
                    {formatGB(vesselTotal(v))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
