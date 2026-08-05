"use client";

import { useMemo, useState } from "react";
import { ACCOUNTS, SERVICES, formatGB, vesselTotal, type VesselUsage } from "./fleetData";
import { useIsDark } from "./useIsDark";

interface VesselAccountTableProps {
  selectedImo: number | null;
  onSelectVessel: (v: VesselUsage | null) => void;
}

export default function VesselAccountTable({ selectedImo, onSelectVessel }: VesselAccountTableProps) {
  const isDark = useIsDark();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ACCOUNTS.map((g) => ({
      ...g,
      vessels: q
        ? g.vessels.filter(
            (v) => v.name.toLowerCase().includes(q) || String(v.imo).includes(q),
          )
        : g.vessels,
    })).filter((g) => g.vessels.length > 0);
  }, [search]);

  const toggle = (acct: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(acct)) next.delete(acct);
      else next.add(acct);
      return next;
    });

  const fleetTotal = groups.reduce(
    (sum, g) => sum + g.vessels.reduce((s, v) => s + vesselTotal(v), 0),
    0,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-(--color-surface-1) shadow-sm dark:border-white/5">
      {/* 헤더 */}
      <div className="border-b border-gray-100 px-5 py-4 dark:border-white/10">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Accounts</h3>
          <span className="font-mono text-xs text-gray-400">{formatGB(fleetTotal)}</span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vessel or IMO"
          className="mt-3 h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:text-white"
        />
      </div>

      {/* 전체 보기 */}
      <button
        onClick={() => onSelectVessel(null)}
        className={`flex items-center justify-between border-b border-gray-100 px-5 py-2.5 text-xs font-bold transition-colors dark:border-white/10 ${
          selectedImo === null
            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
        }`}
      >
        All vessels
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] tabular-nums dark:bg-white/10">
          {groups.reduce((s, g) => s + g.vessels.length, 0)}
        </span>
      </button>

      {/* 계정별 선박 */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-gray-400">No vessels found.</p>
        ) : (
          groups.map((g) => {
            const isCollapsed = collapsed.has(g.acct);
            const total = g.vessels.reduce((s, v) => s + vesselTotal(v), 0);
            return (
              <div key={g.acct} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                <button
                  onClick={() => toggle(g.acct)}
                  className="flex w-full items-center gap-2 px-5 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/3"
                >
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    className={`shrink-0 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-700 dark:text-gray-200">
                    {g.label}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-gray-400">{formatGB(total)}</span>
                </button>

                {!isCollapsed && (
                  <ul>
                    {g.vessels.map((v) => {
                      const isActive = selectedImo === v.imo;
                      const vTotal = vesselTotal(v);
                      const share = total > 0 ? (vTotal / total) * 100 : 0;
                      return (
                        <li key={v.imo}>
                          <button
                            onClick={() => onSelectVessel(isActive ? null : v)}
                            className={`flex w-full items-center gap-2 py-2 pr-5 pl-11 text-left transition-colors ${
                              isActive
                                ? "bg-blue-50 dark:bg-blue-500/10"
                                : "hover:bg-gray-50 dark:hover:bg-white/3"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-xs font-semibold ${
                                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                              }`}>
                                {v.name}
                              </p>
                              {/* 이 선박이 실제로 쓰는 회선 조합 */}
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {SERVICES.filter((s) => v.usage[s.key] > 0).map((s) => (
                                  <span
                                    key={s.key}
                                    title={s.label}
                                    className="flex items-center gap-1 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400"
                                  >
                                    <span
                                      className="h-1.5 w-1.5 rounded-xs"
                                      style={{ background: isDark ? s.dark : s.light }}
                                    />
                                    {s.label}
                                  </span>
                                ))}
                              </div>
                              {/* 계정 내 비중을 얇은 미터로 — 값은 옆에 숫자로도 제공 */}
                              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                                <div
                                  className="h-full rounded-full bg-blue-500/70 transition-all"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                              {formatGB(vTotal)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
