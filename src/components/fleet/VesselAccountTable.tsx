"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getAccounts } from "@/api/vessel";
import { useVesselStore } from "@/store/vessel.store";
import { NativeSelectWithIcon } from "@/components/form/SelectWithIcon";
import type { Vessel } from "@/types/vessel";

const ALL_COMPANIES = "";

export interface SelectedAccount {
  acct: string;
  label: string;
}

interface VesselAccountTableProps {
  /** 부모가 선택 상태를 관리할 때 전달. 없으면 컴포넌트가 자체 상태로 동작한다 */
  selectedImo?: number | null;
  onSelectVessel?: (v: Vessel | null) => void;
  /** 펼쳐서 선택한 회사 — 부모가 제목 등에 사용한다 */
  onSelectAccount?: (a: SelectedAccount | null) => void;
}

export default function VesselAccountTable({
  selectedImo,
  onSelectVessel,
  onSelectAccount,
}: VesselAccountTableProps = {}) {
  const [company, setCompany] = useState(ALL_COMPANIES);
  const [search, setSearch] = useState("");
  // 검색 중에는 회사 필터를 무시하고 전체에서 찾는다
  const searching = search.trim().length > 0;
  // 기본은 모두 접힌 상태. 펼친 회사가 곧 '선택된 회사'라 하나만 열린다
  const [activeAcct, setActiveAcct] = useState<string | null>(null);
  // 단독으로 붙여도 클릭이 동작하도록 하는 내부 폴백 상태
  const [innerSelected, setInnerSelected] = useState<number | null>(null);

  // 계정 목록은 거의 바뀌지 않아 세션 동안 한 번만 받아 캐시를 재사용한다
  const { data: accounts = [] } = useSWR("accounts", getAccounts, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });

  const vessels = useVesselStore((s) => s.vessels);
  const loading = useVesselStore((s) => s.loading);
  const fetchVessels = useVesselStore((s) => s.fetchVessels);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  const activeImo = selectedImo !== undefined ? selectedImo : innerSelected;
  const handleSelect = (v: Vessel | null) => {
    setInnerSelected(v?.imo ?? null);
    onSelectVessel?.(v);
  };

  /**
   * 회사 헤더 클릭 = 펼치기 + 선택 (같은 회사를 다시 누르면 접히고 선택 해제).
   * 검색 중에는 모든 결과가 펼쳐진 상태이므로 접지 않고 '선택'만 한다.
   */
  const handleAccountClick = (acct: string) => {
    if (searching) {
      setActiveAcct(acct);
      return;
    }
    setActiveAcct((prev) => (prev === acct ? null : acct));
  };


  /** acct 코드 → 화면에 보여줄 회사명 */
  const accountLabel = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.value, a.label]));
    return (acct: string) => map.get(acct) ?? acct;
  }, [accounts]);

  // 검색어가 있으면 회사 필터를 건너뛰고 전체에서 찾는다 —
  // 특정 회사를 고른 상태에서도 다른 회사 선박을 찾을 수 있어야 하기 때문
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = vessels.filter((v) => {
      if (!q) return company === ALL_COMPANIES || v.acct === company;
      return v.name.toLowerCase().includes(q) || String(v.imo).includes(q);
    });

    const byAcct = new Map<string, Vessel[]>();
    matched.forEach((v) => {
      const list = byAcct.get(v.acct);
      if (list) list.push(v);
      else byAcct.set(v.acct, [v]);
    });

    return [...byAcct.entries()]
      .map(([acct, list]) => ({
        acct,
        label: accountLabel(acct),
        vessels: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vessels, company, search, accountLabel]);

  // 첫 진입 시 맨 위 회사를 자동 선택 — 빈 화면으로 시작하지 않도록 (렌더 중 조정)
  const [autoSelected, setAutoSelected] = useState(false);
  if (!autoSelected && groups.length > 0) {
    setAutoSelected(true);
    setActiveAcct(groups[0].acct);
  }

  // 선택된 회사를 부모에 알린다 — 선택 경로가 하나로 모여 어긋날 여지가 없다
  useEffect(() => {
    if (activeAcct === null) {
      onSelectAccount?.(null);
      return;
    }
    const g = groups.find((x) => x.acct === activeAcct);
    onSelectAccount?.({ acct: activeAcct, label: g?.label ?? activeAcct });
  }, [activeAcct, groups, onSelectAccount]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-(--color-surface-1) shadow-sm dark:border-white/5">
      {/* 필터 — 회사 선택 후 선박명 검색 */}
      <div className="space-y-3 border-b border-gray-100 px-5 py-4 dark:border-white/10">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fleet-company"
            className="text-[10px] font-bold tracking-wider text-gray-400 uppercase"
          >
            Company
          </label>
          <NativeSelectWithIcon
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-transparent pr-8 pl-3 text-xs font-medium outline-none transition-colors hover:border-gray-400 focus:border-blue-500 dark:border-gray-700 dark:text-white"
          >
            <option value={ALL_COMPANIES}>All Companies</option>
            {accounts.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelectWithIcon>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fleet-vessel-search"
            className="text-[10px] font-bold tracking-wider text-gray-400 uppercase"
          >
            Vessel
          </label>
          <div className="relative">
            <input
              id="fleet-vessel-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vessel or IMO"
              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent pr-8 pl-3 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:text-white"
            />
            {searching && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 회사별 선박 */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {loading && vessels.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-gray-400">Loading vessels…</p>
        ) : groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-gray-400">No vessels found.</p>
        ) : (
          groups.map((g) => {
            const isSelected = activeAcct === g.acct;
            const isExpanded = searching || isSelected;
            return (
              <div key={g.acct} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                <button
                  onClick={() => handleAccountClick(g.acct)}
                  aria-expanded={isExpanded}
                  aria-pressed={isSelected}
                  title={searching ? `Select ${g.label}` : undefined}
                  className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-transparent bg-gray-50/80 hover:bg-gray-100 dark:bg-white/3 dark:hover:bg-white/6"
                  }`}
                >
                  <svg
                    width="9" height="9" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    className={`shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"} ${
                      isSelected ? "text-blue-500 dark:text-blue-400" : "text-gray-400"
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  {/* 회사는 '구역 라벨' — 작고 조용하게, 선박명과 겹치지 않는 스타일 */}
                  <span
                    className={`min-w-0 flex-1 truncate text-[10px] font-bold tracking-wider uppercase ${
                      isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {g.label}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                      isSelected
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-gray-200/70 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                    }`}
                  >
                    {g.vessels.length}
                  </span>
                </button>

                {isExpanded && (
                  <ul>
                    {g.vessels.map((v) => {
                      const isActive = activeImo === v.imo;
                      return (
                        <li key={v.imo}>
                          <button
                            onClick={() => handleSelect(isActive ? null : v)}
                            className={`flex w-full items-center gap-2 border-l-2 py-2.5 pr-4 pl-6 text-left transition-colors ${
                              isActive
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                : "border-transparent hover:bg-gray-50 dark:hover:bg-white/3"
                            }`}
                          >
                            {/* 선박은 '실제 항목' — 크고 진하게 */}
                            <span
                              className={`min-w-0 flex-1 truncate text-[13px] ${
                                isActive
                                  ? "font-semibold text-blue-600 dark:text-blue-400"
                                  : "font-medium text-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {v.name}
                            </span>
                            {v.inActive && (
                              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400 dark:bg-white/10 dark:text-gray-500">
                                Inactive
                              </span>
                            )}
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
